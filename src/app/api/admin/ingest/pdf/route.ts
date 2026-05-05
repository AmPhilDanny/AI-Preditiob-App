import { NextResponse } from 'next/server';
import { pdfParserService } from '@/lib/services/pdf-parser';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sourceName = formData.get('sourceName') as string || 'Unknown PDF';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`[IMPORT-PDF] Received file: ${file.name}, size: ${file.size} bytes`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 1. Parse PDF using AI
    const extractedMatches = await pdfParserService.parseOddsPDF(buffer);
    console.log(`[IMPORT-PDF] Successfully extracted ${extractedMatches.length} matches`);

    // 2. Save matches to ScrapedData
    const savedIds = [];
    for (const m of extractedMatches) {
      const record = await prisma.scrapedData.create({
        data: {
          sourceApi: `PDF: ${sourceName}`,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          league: m.league,
          matchDate: m.matchTime ? new Date(m.matchTime) : null,
          odds: m.markets as any,
          rawStats: { 
            importDate: new Date().toISOString(),
            sourceFile: file.name
          }
        }
      });
      savedIds.push(record.id);
    }

    // 3. Log the report
    const report = await prisma.marketReport.create({
      data: {
        filename: file.name,
        sourceName: sourceName,
        parsedCount: extractedMatches.length,
        rawSummary: `Imported ${extractedMatches.length} matches from ${file.name}. Included markets: 1X2, HT, DC, O/U, BTTS.`
      }
    });

    return NextResponse.json({ 
      success: true, 
      count: extractedMatches.length,
      reportId: report.id 
    });

  } catch (error: any) {
    console.error('[IMPORT-PDF] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
