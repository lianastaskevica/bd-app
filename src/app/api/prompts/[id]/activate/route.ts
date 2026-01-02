import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    // Check if the prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Deactivate all other prompts (only one can be active at a time)
    await prisma.prompt.updateMany({
      where: { id: { not: id } },
      data: { isActive: false },
    });

    // Activate this prompt
    const updatedPrompt = await prisma.prompt.update({
      where: { id },
      data: { isActive: true },
      include: {
        category: true,
      },
    });

    return NextResponse.json(updatedPrompt);
  } catch (error: any) {
    console.error('Activate prompt error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

