import { getGeminiModel } from '../config/gemini.js';
import rateLimitQueue from './rateLimitQueue.js';

/**
 * Central AI service for all Gemini interactions
 * Includes retry logic with exponential backoff for rate limits
 * Uses queue system to manage rate limits
 */
export class AIService {
  static async generateText(prompt, options = {}) {
    // Use queue to manage rate limits
    return await rateLimitQueue.add(async () => {
      const maxRetries = options.maxRetries || 2;
      const initialDelay = options.initialDelay || 30000; // 30 seconds
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const model = getGeminiModel(options.modelName || 'gemini-2.5-flash');
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (error) {
        lastError = error;
        
        // Check if it's a rate limit error (429)
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
          // Check if it's daily quota (GenerateRequestsPerDay) vs per-minute quota
          const errorStr = JSON.stringify(error);
          const isDailyQuota = error.message?.includes('GenerateRequestsPerDay') || 
                               error.message?.includes('PerDay') ||
                               errorStr?.includes('GenerateRequestsPerDay') ||
                               error.errorDetails?.some(d => {
                                 const detailsStr = JSON.stringify(d);
                                 return (d['@type']?.includes('QuotaFailure') && 
                                        (detailsStr?.includes('PerDay') || 
                                         d.violations?.some(v => v.quotaId?.includes('PerDay'))));
                               });
          
          if (isDailyQuota) {
            // Daily quota exceeded - don't retry, throw immediately with clear message
            console.log('Daily quota exceeded - skipping retry');
            throw new Error('Daily API quota exceeded (20 requests/day on free tier). Please try again tomorrow or upgrade your API plan.');
          }
          
          const retryDelay = error.errorDetails?.find(d => d['@type']?.includes('RetryInfo'))?.retryDelay;
          const delay = retryDelay ? Math.max(parseInt(retryDelay) * 1000, 1000) : initialDelay * Math.pow(2, attempt);
          
          if (attempt < maxRetries - 1) {
            console.log(`Rate limit hit. Retrying in ${Math.ceil(delay / 1000)} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
            await this.sleep(delay);
            continue;
          }
        }
          
          // For non-rate-limit errors or final attempt, throw immediately
          if (attempt === maxRetries - 1 || error.status !== 429) {
            console.error('Gemini API Error:', error);
            throw new Error(`AI service error: ${error.message}`);
          }
        }
      }

      // If we get here, all retries failed
      throw new Error(`AI service error after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    });
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async generateJSON(prompt, schema = null) {
    try {
      const jsonPrompt = schema
        ? `${prompt}\n\nReturn the response as a valid JSON object matching this schema: ${JSON.stringify(schema)}. Do not include any markdown formatting, only valid JSON.`
        : `${prompt}\n\nReturn the response as a valid JSON object. Do not include any markdown formatting, only valid JSON.`;

      const response = await this.generateText(jsonPrompt);
      
      // Clean response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }

      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
  }
}

export default AIService;
