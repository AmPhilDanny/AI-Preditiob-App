import { FootballApiService, NormalizedFixture } from "./football-api.interface";

export class FootballDataService implements FootballApiService {
  private apiKey: string;
  private baseUrl: string = 'https://api.football-data.org/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchFromAPI(endpoint: string) {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Football-Data.org error: ${response.statusText}`);
    }

    return response.json();
  }

  async getTodayFixtures(): Promise<NormalizedFixture[]> {
    const data = await this.fetchFromAPI('matches');
    
    return (data.matches || []).map((m: any) => ({
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      league: m.competition.name,
      date: m.utcDate,
      externalId: m.id.toString()
    }));
  }

  async testConnection(): Promise<boolean> {
    try {
      const data = await this.fetchFromAPI('competitions');
      return !!data.competitions;
    } catch (e) {
      return false;
    }
  }
}
