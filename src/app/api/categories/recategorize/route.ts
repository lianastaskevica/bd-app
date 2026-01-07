import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { classifyCall } from '@/lib/category-classifier';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    // Get all calls with transcripts
    const calls = await prisma.call.findMany({
      where: {
        transcript: { not: '' },
      },
      select: {
        id: true,
        callTitle: true,
        transcript: true,
        transcriptSummary: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = {
      total: calls.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Re-categorize each call
    for (const call of calls) {
      try {
        // Use existing summary if available, otherwise generate new one
        let transcriptSummary = call.transcriptSummary;
        let prediction;

        if (transcriptSummary) {
          // Re-run classification with existing summary
          const { classifyCall: classify } = await import('@/lib/category-classifier');
          const result = await classifyCall(call.callTitle, call.transcript);
          transcriptSummary = result.transcriptSummary;
          prediction = result.prediction;
        } else {
          // Generate new summary and classification
          const result = await classifyCall(call.callTitle, call.transcript);
          transcriptSummary = result.transcriptSummary;
          prediction = result.prediction;
        }

        // Find the predicted category
        const predictedCategory = await prisma.category.findFirst({
          where: { name: prediction.predictedCategory, isFixed: true },
        });

        if (!predictedCategory) {
          throw new Error(`Invalid predicted category: ${prediction.predictedCategory}`);
        }

        // Determine final category based on confidence
        let categoryId: string | null = null;
        let categoryFinalId: string | null = null;

        if (prediction.confidence >= 0.75) {
          categoryId = predictedCategory.id;
          categoryFinalId = predictedCategory.id;
        } else if (prediction.confidence >= 0.50) {
          categoryId = predictedCategory.id;
          categoryFinalId = predictedCategory.id;
        }

        // Update the call
        await prisma.call.update({
          where: { id: call.id },
          data: {
            transcriptSummary,
            predictedCategoryId: predictedCategory.id,
            confidenceScore: prediction.confidence,
            categoryReasoning: prediction.reasoning.join('\n'),
            topCandidates: prediction.topCandidates,
            needsReview: prediction.needsReview,
            categoryId,
            categoryFinalId,
            // Don't override if it was manually overridden (wasOverridden stays true)
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Call ${call.id}: ${error.message}`);
        console.error(`Error recategorizing call ${call.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Recategorize error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to recategorize calls' },
      { status: 500 }
    );
  }
}

