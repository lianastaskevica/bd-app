import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { analyzeCall } from '@/lib/openai';
import { classifyCall } from '@/lib/category-classifier';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { callTitle, clientName, callDate, organizer, participants, transcript } = body;
    const title = callTitle || clientName; // Support both field names during transition

    if (!title || !callDate || !organizer || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the active prompt (only one can be active at a time)
    const prompt = await prisma.prompt.findFirst({
      where: { isActive: true },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'No active prompt found. Please create and activate a prompt first.' },
        { status: 400 }
      );
    }

    // Run AI analysis (for rating and feedback)
    const analysis = await analyzeCall(transcript, prompt.analysisPrompt, prompt.ratingPrompt);

    // Run AI category classification
    const { transcriptSummary, prediction } = await classifyCall(title, transcript);

    // Find the predicted category (must exist in our fixed 9 categories)
    const predictedCategory = await prisma.category.findFirst({
      where: { name: prediction.predictedCategory, isFixed: true },
    });

    if (!predictedCategory) {
      throw new Error(`Invalid predicted category: ${prediction.predictedCategory}`);
    }

    // Determine final category: auto-assign if confidence >= 0.75
    let categoryId: string | null = null;
    let categoryFinalId: string | null = null;

    if (prediction.confidence >= 0.75) {
      // Auto-assign with high confidence
      categoryId = predictedCategory.id;
      categoryFinalId = predictedCategory.id;
    } else if (prediction.confidence >= 0.50) {
      // Auto-assign but needs review
      categoryId = predictedCategory.id;
      categoryFinalId = predictedCategory.id;
    }
    // else: confidence < 0.50, don't assign category, show suggestions only

    // Create the call
    const call = await prisma.call.create({
      data: {
        callTitle: title,
        callDate: new Date(callDate),
        organizer,
        participants: participants || [],
        transcript,
        transcriptSummary,
        categoryId,
        aiAnalysis: analysis.summary,
        aiRating: analysis.rating,
        aiSentiment: analysis.sentiment,
        aiStrengths: analysis.strengths,
        aiAreasForImprovement: analysis.areasForImprovement,
        // AI Category Prediction fields
        predictedCategoryId: predictedCategory.id,
        confidenceScore: prediction.confidence,
        categoryReasoning: prediction.reasoning.join('\n'),
        topCandidates: prediction.topCandidates,
        needsReview: prediction.needsReview,
        categoryFinalId,
        wasOverridden: false,
      },
      include: {
        category: true,
        predictedCategory: true,
        categoryFinal: true,
      },
    });

    return NextResponse.json(call);
  } catch (error: any) {
    console.error('Create call error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await requireAuth();

    const calls = await prisma.call.findMany({
      include: {
        category: true,
      },
      orderBy: {
        callDate: 'desc',
      },
    });

    return NextResponse.json(calls);
  } catch (error: any) {
    console.error('Get calls error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

