import { FootballApiService, NormalizedFixture } from "./football-api.interface";

/**
 * RapidAPI Football Service
 * Uses the API-Football endpoint via RapidAPI hub.
 * Endpoint: https://api-football-v1.p.rapidapi.com/v3
 */
export class RapidAPIFootballService implements FootballApiService {
  private apiKey: string;
  private baseUrl = 'https://api-football-v1.p.rapidapi.com/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchFromAPI(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI Football error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getTodayFixtures(daysAhead: number = 0): Promise<NormalizedFixture[]> {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    const dateStr = date.toISOString().split('T')[0];

    console.log(`[RapidAPI Football] Fetching fixtures for ${dateStr}...`);
    const data = await this.fetchFromAPI('fixtures', { date: dateStr });

    return (data.response || []).map((f: any) => ({
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      league: f.league.name,
      date: f.fixture.date,
      externalId: f.fixture.id.toString(),
      rawData: f,
      stats: {
        homeOdds: f.odds?.[0]?.bookmakers?.[0]?.bets?.[0]?.values?.find((v: any) => v.value === 'Home')?.odd,
        drawOdds: f.odds?.[0]?.bookmakers?.[0]?.bets?.[0]?.values?.find((v: any) => v.value === 'Draw')?.odd,
        awayOdds: f.odds?.[0]?.bookmakers?.[0]?.bets?.[0]?.values?.find((v: any) => v.value === 'Away')?.odd,
      }
    }));
  }

  async testConnection(): Promise<boolean> {
    try {
      const data = await this.fetchFromAPI('status');
      return !!data.response;
    } catch {
      return false;
    }
  }
}
