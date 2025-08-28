-- Enable robust realtime payloads for key tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add last_seen to profiles for accurate presence
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ;
  END IF;
END $$;

-- Index for message querying performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at 
  ON public.messages (chat_id, created_at);

-- RLS: users can insert/select their own chat_views rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can insert their own chat views'
      AND tablename = 'chat_views'
  ) THEN
    CREATE POLICY "Users can insert their own chat views"
    ON public.chat_views
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view their own chat views'
      AND tablename = 'chat_views'
  ) THEN
    CREATE POLICY "Users can view their own chat views"
    ON public.chat_views
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Users can upload their attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);