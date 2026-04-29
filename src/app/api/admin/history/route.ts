import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const updated = await prisma.predictionSlip.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Error updating history:', error);
    return NextResponse.json({ error: 'Failed to update slip status' }, { status: 500 });
  }
}
