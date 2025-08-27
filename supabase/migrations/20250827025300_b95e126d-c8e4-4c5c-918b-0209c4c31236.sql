-- First, delete duplicate conversations (keep the one with messages)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY 
             LEAST(participant_1, participant_2), 
             GREATEST(participant_1, participant_2) 
           ORDER BY 
             CASE WHEN last_message IS NOT NULL THEN 0 ELSE 1 END,
             created_at DESC
         ) as rn
  FROM conversations
)
DELETE FROM conversations 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent duplicate conversations
ALTER TABLE conversations 
ADD CONSTRAINT unique_conversation_participants 
UNIQUE (
  LEAST(participant_1, participant_2), 
  GREATEST(participant_1, participant_2)
);

-- Drop the unused chats table that's causing confusion
DROP TABLE IF EXISTS chats;