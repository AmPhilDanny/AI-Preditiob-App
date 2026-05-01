import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { status: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.predictionSlip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.predictionSlip.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, matchIndex } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }

    if (matchIndex !== undefined) {
      const slip = await prisma.predictionSlip.findUnique({ where: { id } });
      if (!slip) throw new Error('Slip not found');

      const matches = [...(slip.matches as any[])];
      if (matches[matchIndex]) {
        matches[matchIndex].status = status;
      }

      const updated = await prisma.predictionSlip.update({
        where: { id },
        data: { matches }
      });
      return NextResponse.json({ success: true, updated });
    } else {
      const updated = await prisma.predictionSlip.update({
        where: { id },
        data: { status }
      });
      return NextResponse.json({ success: true, updated });
    }
  } catch (error: any) {
    console.error('Error updating history:', error);
    return NextResponse.json({ error: error.message || 'Failed to update slip status' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Slip ID required' }, { status: 400 });
    }

    // Mark as archived instead of hard delete to preserve data for learning
    await prisma.predictionSlip.update({
      where: { id },
      data: { archived: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete history error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
