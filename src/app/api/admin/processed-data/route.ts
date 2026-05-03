import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.processedData.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.processedData.count()
    ]);

    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error: any) {
    console.error('Fetch Processed Data Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
