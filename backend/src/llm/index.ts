import { envConfig } from '../config/env';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentLLMConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export class LLMProvider {
  /**
   * Universal fetch for OpenAI-compatible REST APIs
   */
  static async chatCompletion(agentName: keyof typeof envConfig.Agents, messages: LLMMessage[], isJsonResponse = true): Promise<any> {
    const config = envConfig.Agents[agentName];
    if (!config) throw new Error(`Configuration for agent ${agentName} missing.`);

    const url = `${config.API_URL}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.API_KEY}`
    };

    const body: any = {
      model: config.MODEL,
      messages,
      temperature: 0.2, // Low temp for analytical tasks
    };

    if (isJsonResponse) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (isJsonResponse) {
        return JSON.parse(content);
      }
      return content;

    } catch (error) {
      console.error(`[LLMProvider] Failed request for agent: ${agentName}`, error);
      throw error;
    }
  }
}
