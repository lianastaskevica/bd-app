import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { analyzeCall } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { clientName, callDate, organizer, participants, transcript } = body;

    if (!clientName || !callDate || !organizer || !transcript) {
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

    // Analyze the call with AI
    const analysis = await analyzeCall(transcript, prompt.analysisPrompt, prompt.ratingPrompt);

    // Find or create category based on AI analysis
    let category = await prisma.category.findFirst({
      where: { name: analysis.category },
    });

    if (!category) {
      // Create category if it doesn't exist
      category = await prisma.category.create({
        data: { name: analysis.category },
      });
    }

    // Create the call
    const call = await prisma.call.create({
      data: {
        clientName,
        callDate: new Date(callDate),
        organizer,
        participants: participants || [],
        transcript,
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

