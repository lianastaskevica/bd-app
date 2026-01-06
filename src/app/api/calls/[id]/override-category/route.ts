import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { categoryId } = body;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Verify category exists and is one of the fixed 8
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isFixed) {
      return NextResponse.json(
        { error: 'Invalid category. Only fixed categories can be assigned.' },
        { status: 400 }
      );
    }

    // Get the call
    const call = await prisma.call.findUnique({
      where: { id },
    });

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Update the call with override
    const updatedCall = await prisma.call.update({
      where: { id },
      data: {
        categoryId,
        categoryFinalId: categoryId,
        wasOverridden: true,
        overriddenAt: new Date(),
        overriddenBy: session.userId,
        needsReview: false, // Clear needs review flag since human reviewed it
      },
      include: {
        category: true,
        predictedCategory: true,
        categoryFinal: true,
      },
    });

    return NextResponse.json({
      success: true,
      call: updatedCall,
    });
  } catch (error: any) {
    console.error('Override category error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to override category' },
      { status: 500 }
    );
  }
}

