import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { analyzeCall } from '@/lib/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const call = await prisma.call.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Get the active prompt (only one can be active at a time)
    const prompt = await prisma.prompt.findFirst({
      where: { isActive: true },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'No active prompt found. Please activate a prompt first.' },
        { status: 400 }
      );
    }

    // Re-analyze the call
    const analysis = await analyzeCall(call.transcript, prompt.analysisPrompt, prompt.ratingPrompt);

    // Find or create category
    let category = await prisma.category.findFirst({
      where: { name: analysis.category },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: analysis.category },
      });
    }

    // Update the call with new analysis
    const updatedCall = await prisma.call.update({
      where: { id },
      data: {
        categoryId: category.id,
        aiAnalysis: analysis.summary,
        aiRating: analysis.rating,
        aiSentiment: analysis.sentiment,
        aiStrengths: analysis.strengths,
        aiAreasForImprovement: analysis.areasForImprovement,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedCall);
  } catch (error: any) {
    console.error('Re-analyze call error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

