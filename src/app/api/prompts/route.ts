import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { name, content, analysisPrompt, ratingPrompt, isActive, categoryId } = body;

    if (!name || (!analysisPrompt && !content) || (!ratingPrompt && !content)) {
      return NextResponse.json(
        { error: 'Name, analysis prompt, and rating prompt are required' },
        { status: 400 }
      );
    }

    // If creating as active, deactivate all other prompts (only one can be active at a time)
    if (isActive) {
      await prisma.prompt.updateMany({
        data: { isActive: false },
      });
    }

    const prompt = await prisma.prompt.create({
      data: {
        name,
        content: content || analysisPrompt, // Keep for backwards compatibility
        analysisPrompt: analysisPrompt || content,
        ratingPrompt: ratingPrompt || content,
        isActive: isActive !== undefined ? isActive : false,
        categoryId: categoryId || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(prompt);
  } catch (error: any) {
    console.error('Create prompt error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await requireAuth();

    const prompts = await prisma.prompt.findMany({
      include: {
        category: true,
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(prompts);
  } catch (error: any) {
    console.error('Get prompts error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

