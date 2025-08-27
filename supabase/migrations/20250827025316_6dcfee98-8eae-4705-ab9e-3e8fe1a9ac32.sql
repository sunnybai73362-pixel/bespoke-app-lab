-- First, delete duplicate conversations (keep the one with messages)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY 
             CASE 
               WHEN participant_1 < participant_2 THEN participant_1 || ',' || participant_2
               ELSE participant_2 || ',' || participant_1
             END
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
-- We need to ensure participant_1 is always the smaller UUID
UPDATE conversations 
SET participant_1 = participant_2, participant_2 = participant_1
WHERE participant_1 > participant_2;

-- Now add the unique constraint
ALTER TABLE conversations 
ADD CONSTRAINT unique_conversation_participants 
UNIQUE (participant_1, participant_2);

-- Drop the unused chats table that's causing confusion
DROP TABLE IF EXISTS chats;