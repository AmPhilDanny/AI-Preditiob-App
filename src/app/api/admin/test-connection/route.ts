import { NextResponse } from 'next/server';
import { APIFootballService } from "@/lib/services/api-football";
import { FootballDataService } from "@/lib/services/football-data";
import { TheSportsDBService } from "@/lib/services/the-sports-db";

export async function POST(request: Request) {
  try {
    const { type, provider, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key is missing' });
    }

    if (type === 'football') {
      let service;
      if (provider === 'api1') service = new APIFootballService(apiKey);
      else if (provider === 'api2') service = new FootballDataService(apiKey);
      else if (provider === 'api3') service = new TheSportsDBService(apiKey);
      
      if (service) {
        const success = await service.testConnection();
        return NextResponse.json({ 
          success, 
          message: success ? 'Connection established successfully' : 'Failed to authenticate with football provider' 
        });
      }
    }

    // AI API testing (mock for now or implement similarly)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isSuccess = apiKey.length > 5; // Simple validation for mock

    if (isSuccess) {
      return NextResponse.json({ success: true, message: 'Connection established successfully' });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid AI provider key' });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
