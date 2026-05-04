import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const skip = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    
    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { homeTeam: { contains: search, mode: 'insensitive' } },
          { awayTeam: { contains: search, mode: 'insensitive' } },
          { league: { contains: search, mode: 'insensitive' } },
          { sourceApi: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [data, totalCount] = await Promise.all([
      prisma.scrapedData.findMany({
        where: whereClause,
        orderBy: { matchDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.scrapedData.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({ 
      success: true, 
      data, 
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching scraped data:', error);
    return NextResponse.json({ error: 'Failed to fetch scraped data' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    await prisma.scrapedData.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('Error deleting scraped data:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, homeTeam, awayTeam, league, odds } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updated = await prisma.scrapedData.update({
      where: { id },
      data: {
        homeTeam,
        awayTeam,
        league,
        odds
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating scraped data:', error);
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 });
  }
}
