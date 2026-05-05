import axios from 'axios';

export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export class SerperService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<SerperResult[]> {
    if (!this.apiKey) {
      console.warn('[SERPER] No API Key provided. Search skipped.');
      return [];
    }

    try {
      console.log(`[SERPER] Searching for: "${query}"...`);
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: 8
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const results = response.data.organic || [];
      return results.map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet
      }));
    } catch (err: any) {
      console.error('[SERPER] Search failed:', err.message);
      return [];
    }
  }

  async scrape(url: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Serper API Key is missing. Cannot use fallback scraper.');
    }

    try {
      console.log(`[SERPER] Scrambling headers and using Serper Proxy to scrape: ${url}...`);
      const response = await axios.post('https://google.serper.dev/scrape', {
        url: url
      }, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Serper scrape returns text in 'text' field if successful
      return response.data.text || '';
    } catch (err: any) {
      console.error('[SERPER] Scrape failed:', err.message);
      throw new Error(`Serper Scrape failed: ${err.message}`);
    }
  }
}
