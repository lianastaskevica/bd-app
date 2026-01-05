-- AlterTable: Add new prompt fields with defaults
ALTER TABLE "Prompt" ADD COLUMN "analysisPrompt" TEXT NOT NULL DEFAULT 'Analyze this client call transcript and provide a comprehensive summary covering key discussion points, decisions made, and action items.';

ALTER TABLE "Prompt" ADD COLUMN "ratingPrompt" TEXT NOT NULL DEFAULT 'Rate this call on a scale of 1-10 based on: Communication clarity, Client engagement, Problem resolution, Professionalism, and Outcome achievement. Provide 2-4 specific strengths and 1-3 areas for improvement.';

-- CreateIndex
CREATE INDEX "Prompt_isActive_idx" ON "Prompt"("isActive");

-- Update existing prompts to split content into analysis and rating
-- Copy existing content to analysisPrompt for backwards compatibility
UPDATE "Prompt" SET "analysisPrompt" = "content" WHERE "analysisPrompt" = 'Analyze this client call transcript and provide a comprehensive summary covering key discussion points, decisions made, and action items.';

