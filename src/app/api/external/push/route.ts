import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { configService } from '@/lib/services/config';

export async function POST(request: Request) {
  try {
    const { slipId } = await request.json();

    if (!slipId) {
      return NextResponse.json({ success: false, error: 'Slip ID is required' }, { status: 400 });
    }

    const slip = await prisma.predictionSlip.findUnique({
      where: { id: slipId }
    });

    if (!slip) {
      return NextResponse.json({ success: false, error: 'Slip not found' }, { status: 404 });
    }

    const config = await configService.getConfig();
    const { url, apiKey } = config.neuralBets;

    if (!url || !apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Neural-Bets connection not configured in Admin Dashboard.' 
      }, { status: 400 });
    }

    // Format the data for the external site
    const pushData = {
      externalId: slip.id,
      totalOdds: slip.totalOdds,
      confidence: slip.confidence,
      targetOdds: slip.targetOdds,
      matches: slip.matches,
      pushedAt: new Date().toISOString()
    };

    const response = await fetch(`${url}/api/receive-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Source': 'AI-Prediction-App'
      },
      body: JSON.stringify(pushData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`External site returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Slip successfully pushed to Neural-Bets',
      externalResult: result
    });

  } catch (error: any) {
    console.error('Push error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred while pushing the slip'
    }, { status: 500 });
  }
}
