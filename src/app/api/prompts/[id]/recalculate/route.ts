import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeCall } from '@/lib/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Get the prompt
    const prompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Get all calls (we'll recalculate all of them with the new prompt)
    const calls = await prisma.call.findMany({
      select: {
        id: true,
        transcript: true,
        categoryId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = {
      total: calls.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Recalculate each call with the updated prompt
    for (const call of calls) {
      try {
        const analysis = await analyzeCall(
          call.transcript,
          prompt.analysisPrompt,
          prompt.ratingPrompt
        );

        // Find or create category based on AI analysis
        let category = await prisma.category.findFirst({
          where: { name: analysis.category },
        });

        if (!category) {
          category = await prisma.category.create({
            data: { name: analysis.category },
          });
        }

        // Update the call with new analysis
        await prisma.call.update({
          where: { id: call.id },
          data: {
            categoryId: category.id,
            aiAnalysis: analysis.summary,
            aiRating: analysis.rating,
            aiSentiment: analysis.sentiment,
            aiStrengths: analysis.strengths,
            aiAreasForImprovement: analysis.areasForImprovement,
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Call ${call.id}: ${error.message}`);
        console.error(`Error recalculating call ${call.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Recalculate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to recalculate calls' },
      { status: 500 }
    );
  }
}

