export interface NormalizedFixture {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  externalId: string;
}

export interface FootballApiService {
  getTodayFixtures(): Promise<NormalizedFixture[]>;
  testConnection(): Promise<boolean>;
}
