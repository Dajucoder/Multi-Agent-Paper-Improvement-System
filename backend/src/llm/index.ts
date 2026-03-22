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

function containsChinese(value: string) {
  return /[\u4e00-\u9fff]/.test(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LLMProvider {
  /**
   * Universal fetch for OpenAI-compatible REST APIs
   */
  static async chatCompletion(agentName: keyof typeof envConfig.Agents, messages: LLMMessage[], isJsonResponse = true): Promise<any> {
    const config = envConfig.Agents[agentName];
    if (!config) throw new Error(`Configuration for agent ${agentName} missing.`);
    const normalizedConfig: AgentLLMConfig = {
      apiUrl: config.API_URL,
      apiKey: config.API_KEY,
      model: config.MODEL,
    };

    const url = `${normalizedConfig.apiUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${normalizedConfig.apiKey}`
    };

    const body: any = {
      model: normalizedConfig.model,
      messages,
      temperature: 0.2, // Low temp for analytical tasks
    };

    if (isJsonResponse) {
      body.response_format = { type: 'json_object' };
    }

    const maxAttempts = 4;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const rawText = await response.text();
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }

        const upstreamStatus = data?.status;
        const upstreamMessage = data?.msg || data?.message || rawText;
        const shouldRetry = response.status === 429 || response.status >= 500 || upstreamStatus === '449' || /rate limit|too many requests/i.test(upstreamMessage || '');

        if (!response.ok || upstreamStatus) {
          const error = new Error(`LLM API Error (${response.status}${upstreamStatus ? `/${upstreamStatus}` : ''}): ${upstreamMessage}`);
          if (shouldRetry && attempt < maxAttempts) {
            console.warn(`[LLMProvider] Retry ${attempt}/${maxAttempts} for ${agentName}: ${upstreamMessage}`);
            await sleep(1200 * attempt);
            lastError = error;
            continue;
          }
          throw error;
        }

        const message = data?.choices?.[0]?.message;
        const content = this.extractTextContent(data);

        if (isJsonResponse) {
          if (!content) {
            const error = new Error(`LLM response did not include parsable content: ${JSON.stringify(message || data?.choices?.[0] || data)}`);
            if (attempt < maxAttempts) {
              console.warn(`[LLMProvider] Empty/invalid content on attempt ${attempt} for ${agentName}, retrying.`);
              await sleep(800 * attempt);
              lastError = error;
              continue;
            }
            throw error;
          }
          const parsed = this.parseJsonContent(content);
          if (this.needsChineseRewrite(parsed)) {
            if (attempt < maxAttempts) {
              const rewritten = await this.requestChineseRewrite(agentName, normalizedConfig, parsed);
              if (!this.needsChineseRewrite(rewritten)) {
                return rewritten;
              }
            }
          }
          return parsed;
        }

        return content;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const message = error instanceof Error ? error.message : String(error);
          const retryable = /449|429|rate limit|too many requests|timeout|fetch failed|network/i.test(message);
          if (retryable) {
            console.warn(`[LLMProvider] Retrying ${agentName} after error: ${message}`);
            await sleep(1200 * attempt);
            continue;
          }
        }
        console.error(`[LLMProvider] Failed request for agent: ${agentName}`, error);
        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private static extractTextContent(data: any): string | null {
    const messageContent = data?.choices?.[0]?.message?.content;

    if (typeof messageContent === 'string') {
      return messageContent;
    }

    if (Array.isArray(messageContent)) {
      const text = messageContent
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.type === 'text') return item.text;
          if (typeof item?.text === 'string') return item.text;
          return '';
        })
        .join('')
        .trim();
      return text || null;
    }

    if (typeof data?.choices?.[0]?.text === 'string') {
      return data.choices[0].text;
    }

    if (typeof data?.output_text === 'string') {
      return data.output_text;
    }

    return null;
  }

  private static parseJsonContent(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
      if (fencedMatch?.[1]) {
        return JSON.parse(fencedMatch[1].trim());
      }

      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(content.slice(firstBrace, lastBrace + 1));
      }

      throw new Error(`Unable to parse JSON from model response: ${content}`);
    }
  }

  private static needsChineseRewrite(payload: any): boolean {
    if (!payload || typeof payload !== 'object') return false;
    const fields = this.collectTextFields(payload).filter((item) => this.shouldLocalizeField(item));
    if (!fields.length) return false;
    const chineseFields = fields.filter((item) => containsChinese(item));
    return chineseFields.length < fields.length * 0.8;
  }

  private static async requestChineseRewrite(agentName: keyof typeof envConfig.Agents, config: AgentLLMConfig, payload: any) {
    const rewriteMessages: LLMMessage[] = [
      {
        role: 'system',
        content: '请将给定 JSON 中所有面向用户展示的文本字段完整改写为中文，保持 JSON 结构、键名、数值和数组结构不变，只翻译文本内容。默认连专业术语也尽量翻译成中文；只有模型名称、算法缩写、论文标题、BLEU 等极少数必须保留的专有标记可以保留英文。输出必须是 JSON 对象。',
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ];

    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: rewriteMessages,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : null;
    const content = this.extractTextContent(data);
    if (!content) {
      throw new Error(`[LLMProvider] ${agentName} Chinese rewrite failed: empty content`);
    }
    return this.parseJsonContent(content);
  }

  private static collectTextFields(payload: any): string[] {
    const values: string[] = [];

    function walk(node: any) {
      if (typeof node === 'string') {
        values.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node && typeof node === 'object') {
        Object.values(node).forEach(walk);
      }
    }

    walk(payload);
    return values.filter((item) => item.trim().length > 0);
  }

  private static shouldLocalizeField(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^(major_issue|minor_issue|no_issue)$/i.test(trimmed)) return false;
    if (/^(high|medium|low)$/i.test(trimmed)) return false;
    if (/^Chapter\s+\d+:/i.test(trimmed)) return false;
    if (trimmed === 'Abstract / Preliminaries') return false;
    if (/^[A-Z0-9_.-]{2,}$/.test(trimmed)) return false;
    return true;
  }
}
