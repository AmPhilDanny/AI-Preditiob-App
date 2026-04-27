export interface APIFootballConfig {
  apiKey: string;
  baseUrl: string;
}

export class APIFootballService {
  private config: APIFootballConfig;

  constructor(apiKey: string) {
    this.config = {
      apiKey: apiKey,
      baseUrl: 'https://v3.football.api-sports.io'
    };
  }

  private async fetchFromAPI(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': this.config.apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.statusText}`);
    }

    return response.json();
  }

  async getTodayFixtures(leagueId?: number) {
    const today = new Date().toISOString().split('T')[0];
    return this.fetchFromAPI('fixtures', { 
      date: today,
      ...(leagueId && { league: leagueId.toString() })
    });
  }

  async getTeamStats(teamId: number, leagueId: number, season: number) {
    return this.fetchFromAPI('teams/statistics', {
      team: teamId.toString(),
      league: leagueId.toString(),
      season: season.toString()
    });
  }

  async getH2H(h2h: string) {
    return this.fetchFromAPI('fixtures/headtohead', { h2h });
  }

  async getPredictions(fixtureId: number) {
    return this.fetchFromAPI('predictions', { fixture: fixtureId.toString() });
  }
}
