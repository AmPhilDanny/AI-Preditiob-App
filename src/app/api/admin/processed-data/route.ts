import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const skip = (page - 1) * limit;

    // The processedData documents have large structuredData arrays (up to 500 items each).
    // We must project them OUT before sorting to stay within MongoDB's 32MB sort limit.
    // Strategy: project away structuredData first, sort & paginate, then lookup a tiny preview.
    const [results, countResult] = await Promise.all([
      prisma.$runCommandRaw({
        aggregate: 'ProcessedData',
        pipeline: [
          // Step 1: Project out the large structuredData field, compute itemCount
          {
            $addFields: {
              itemCount: {
                $cond: {
                  if: { $isArray: '$structuredData' },
                  then: { $size: '$structuredData' },
                  else: 0
                }
              },
              // Grab just 5 preview items
              structuredDataPreview: {
                $cond: {
                  if: { $isArray: '$structuredData' },
                  then: {
                    $map: {
                      input: { $slice: ['$structuredData', 5] },
                      as: 'item',
                      in: {
                        homeTeam: '$$item.homeTeam',
                        awayTeam: '$$item.awayTeam',
                        league: '$$item.league',
                        sourceApi: '$$item.sourceApi',
                        odds: '$$item.odds',
                      }
                    }
                  },
                  else: []
                }
              }
            }
          },
          // Step 2: Remove the massive structuredData field BEFORE sorting
          {
            $project: {
              structuredData: 0
            }
          },
          // Step 3: Now sort on small documents (no memory issue)
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        cursor: {}
      }),
      prisma.$runCommandRaw({
        count: 'ProcessedData',
        query: {}
      })
    ]);

    const rawDocs = (results as any)?.cursor?.firstBatch || [];
    const total = (countResult as any)?.n || 0;

    // Transform MongoDB documents to a clean shape
    const data = rawDocs.map((doc: any) => ({
      id: doc._id?.$oid || String(doc._id),
      homeTeam: doc.homeTeam,
      awayTeam: doc.awayTeam,
      league: doc.league,
      summary: doc.summary,
      createdAt: doc.createdAt?.$date || doc.createdAt,
      matchDate: doc.matchDate?.$date || doc.matchDate,
      itemCount: doc.itemCount || 0,
      // Use preview as structuredData so existing UI code works seamlessly
      structuredData: doc.structuredDataPreview || [],
    }));

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
