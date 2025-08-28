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

-- Attach trigger to populate chat_id and keep chats updated on new messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_handle_new_message'
  ) THEN
    CREATE TRIGGER trg_messages_handle_new_message
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_message();
  END IF;
END $$;

-- Ensure chat_views supports marking as read via trigger
ALTER TABLE public.chat_views ENABLE ROW LEVEL SECURITY;

-- RLS: users can insert/select their own chat_views rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE polname = 'Users can insert their own chat views'
      AND tablename = 'chat_views'
  ) THEN
    CREATE POLICY "Users can insert their own chat views"
    ON public.chat_views
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE polname = 'Users can view their own chat views'
      AND tablename = 'chat_views'
  ) THEN
    CREATE POLICY "Users can view their own chat views"
    ON public.chat_views
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Trigger: when a user views a chat, auto mark others' messages as read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chat_views_auto_mark_as_read'
  ) THEN
    CREATE TRIGGER trg_chat_views_auto_mark_as_read
    AFTER INSERT ON public.chat_views
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_mark_as_read();
  END IF;
END $$;
