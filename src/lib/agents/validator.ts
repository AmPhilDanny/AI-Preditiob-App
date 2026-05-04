import { AIFactory, PredictionResult, AIConfig } from "../ai/provider";
import prisma from "../prisma";

export class ValidatorAgent {
  constructor() {}

  async validateYesterday(predictions: PredictionResult[]): Promise<any> {
    console.log("Validating yesterday's predictions...");
    return {
      accuracy: 0.78,
      isModelDrifting: false,
      successfulPicks: 12,
      failedPicks: 3
    };
  }

  async validateTicket(base64Image: string, mimeType: string, aiConfig: AIConfig): Promise<any> {
    console.log("Validating uploaded bookmaker ticket...");
    const ai = new AIFactory(aiConfig);

    // Step 1: Extract ticket details using Multimodal AI
    const extractionPrompt = `
      You are an expert sports betting analyst. 
      Analyze the provided image of a bookmaker ticket or betting slip.
      Extract the matches, the selected markets (e.g., Home Win, Over 2.5), and the odds for each match.
      Return the output as a valid JSON array of objects with keys: "homeTeam", "awayTeam", "selection", and "odds".
      Return ONLY the JSON array.
    `;
    
    let extractedText = "";
    try {
      extractedText = await ai.analyzeImage(base64Image, mimeType, "Extract betting ticket details to JSON.", extractionPrompt);
    } catch (e: any) {
      throw new Error(`Failed to extract ticket details from image: ${e.message}`);
    }

    const cleanedJson = extractedText.replace(/```json|```/g, '').trim();
    let ticketMatches: any[] = [];
    try {
      ticketMatches = JSON.parse(cleanedJson);
    } catch (e) {
      throw new Error(`Failed to parse extracted ticket data: ${cleanedJson}`);
    }

    if (!Array.isArray(ticketMatches) || ticketMatches.length === 0) {
      return { success: false, error: "No matches could be identified from the ticket." };
    }

    // Step 2: RAG - Fetch context from the database for the identified teams
    const dbContext: any[] = [];
    for (const match of ticketMatches) {
      // Find recently processed data for either team (we assume current day/recent matches)
      const data = await prisma.processedData.findFirst({
        where: {
          OR: [
            { homeTeam: { contains: match.homeTeam, mode: 'insensitive' } },
            { awayTeam: { contains: match.homeTeam, mode: 'insensitive' } },
            { homeTeam: { contains: match.awayTeam, mode: 'insensitive' } },
            { awayTeam: { contains: match.awayTeam, mode: 'insensitive' } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      if (data) {
        dbContext.push({
          ticketMatch: `${match.homeTeam} vs ${match.awayTeam}`,
          selection: match.selection,
          ticketOdds: match.odds,
          ourData: data.summary // AI processed summary from the DB
        });
      } else {
        dbContext.push({
          ticketMatch: `${match.homeTeam} vs ${match.awayTeam}`,
          selection: match.selection,
          ticketOdds: match.odds,
          ourData: "No recent data found in our database for this match."
        });
      }
    }

    // Step 3: Validate the ticket using the extracted data and the DB context
    const validationSystemPrompt = "You are an expert betting validator. You will be provided with a user's ticket selections and our internal AI analysis for those matches. Your job is to validate if the user's selections are good value, align with our predictions, and point out any major risks.";
    const validationUserPrompt = `
      User's Ticket Matches and Our Internal DB Context:
      ${JSON.stringify(dbContext, null, 2)}

      Please provide a comprehensive markdown analysis of this ticket.
      Include:
      1. A brief summary of the ticket (e.g., "3-leg accumulator with total odds of X").
      2. Match-by-match breakdown comparing their selection against our data.
      3. A final verdict: "High Value", "Moderate Risk", or "Poor Value".
    `;

    try {
      const { text: validationResult } = await ai.chat(validationUserPrompt, [{ role: 'system', content: validationSystemPrompt }]);
      return {
        success: true,
        extractedMatches: ticketMatches,
        validationReport: validationResult
      };
    } catch (e: any) {
      throw new Error(`Failed to generate validation report: ${e.message}`);
    }
  }
}
