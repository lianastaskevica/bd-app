-- Add AI category prediction fields to Call table
ALTER TABLE "Call" ADD COLUMN "transcriptSummary" TEXT;
ALTER TABLE "Call" ADD COLUMN "predictedCategoryId" TEXT;
ALTER TABLE "Call" ADD COLUMN "confidenceScore" DOUBLE PRECISION;
ALTER TABLE "Call" ADD COLUMN "categoryReasoning" TEXT;
ALTER TABLE "Call" ADD COLUMN "topCandidates" JSONB;
ALTER TABLE "Call" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Call" ADD COLUMN "categoryFinalId" TEXT;
ALTER TABLE "Call" ADD COLUMN "wasOverridden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Call" ADD COLUMN "overriddenAt" TIMESTAMP(3);
ALTER TABLE "Call" ADD COLUMN "overriddenBy" TEXT;

-- Add indexes for AI category prediction
CREATE INDEX "Call_predictedCategoryId_idx" ON "Call"("predictedCategoryId");
CREATE INDEX "Call_needsReview_idx" ON "Call"("needsReview");
CREATE INDEX "Call_wasOverridden_idx" ON "Call"("wasOverridden");

-- Add foreign key constraints for new category relations
ALTER TABLE "Call" ADD CONSTRAINT "Call_predictedCategoryId_fkey" FOREIGN KEY ("predictedCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Call" ADD CONSTRAINT "Call_categoryFinalId_fkey" FOREIGN KEY ("categoryFinalId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add category enhancements
ALTER TABLE "Category" ADD COLUMN "description" TEXT;
ALTER TABLE "Category" ADD COLUMN "isFixed" BOOLEAN NOT NULL DEFAULT false;

