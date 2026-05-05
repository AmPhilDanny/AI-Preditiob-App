import { NextResponse } from 'next/server';
import { pdfParserService } from '@/lib/services/pdf-parser';
import prisma from '@/lib/prisma';

// Increased timeout for slow PDF parsing + AI analysis
export const maxDuration = 60;

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

    if (extractedMatches.length === 0) {
      return NextResponse.json({ success: false, error: 'No match data could be extracted from this PDF.' }, { status: 422 });
    }

    // 2. Save matches to ScrapedData using createMany for efficiency
    console.log(`[IMPORT-PDF] Saving ${extractedMatches.length} records to database...`);
    const importDate = new Date();
    
    await prisma.scrapedData.createMany({
      data: extractedMatches.map(m => ({
        sourceApi: `PDF: ${sourceName}`,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        matchDate: m.matchTime ? new Date(m.matchTime) : null,
        odds: m.markets as any,
        rawStats: { 
          importDate: importDate.toISOString(),
          sourceFile: file.name
        }
      }))
    });

    // 3. Log the report
    const report = await prisma.marketReport.create({
      data: {
        filename: file.name,
        sourceName: sourceName,
        parsedCount: extractedMatches.length,
        rawSummary: `Imported ${extractedMatches.length} matches from ${file.name}. Included markets: 1X2, HT, DC, O/U, BTTS.`
      }
    });

    console.log(`[IMPORT-PDF] Import completed successfully. Report ID: ${report.id}`);

    return NextResponse.json({ 
      success: true, 
      count: extractedMatches.length,
      reportId: report.id 
    });

  } catch (error: any) {
    console.error('[IMPORT-PDF] Critical Error:', error);
    
    // Try to return a friendly error message
    const errorMessage = error.message || 'An unexpected error occurred during PDF processing';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
