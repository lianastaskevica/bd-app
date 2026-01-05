import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // If setting as active, deactivate all other prompts (only one can be active at a time)
    if (body.isActive === true) {
      await prisma.prompt.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        name: body.name,
        content: body.content || body.analysisPrompt, // Keep for backwards compatibility
        analysisPrompt: body.analysisPrompt || body.content,
        ratingPrompt: body.ratingPrompt || body.content,
        isActive: body.isActive,
        categoryId: body.categoryId || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(prompt);
  } catch (error: any) {
    console.error('Update prompt error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    await prisma.prompt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete prompt error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

