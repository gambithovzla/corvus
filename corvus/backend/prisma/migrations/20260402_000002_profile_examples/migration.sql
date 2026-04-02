-- Add structured few-shot examples to profile prompt configuration
ALTER TABLE "Profile"
ADD COLUMN "examples" JSONB NOT NULL DEFAULT '[]';
