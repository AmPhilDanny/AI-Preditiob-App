import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const history = await prisma.predictionSlip.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to latest 50 slips
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("History fetch error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
