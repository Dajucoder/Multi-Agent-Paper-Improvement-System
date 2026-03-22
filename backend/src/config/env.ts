import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment from the workspace root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envFilePath = path.resolve(__dirname, '../../../.env');

type AgentConfig = {
  API_URL: string;
  API_KEY: string;
  MODEL: string;
};

function persistEnvValue(key: string, value: string) {
  const serialized = `${key}=${value}`;
  let content = '';
  if (fs.existsSync(envFilePath)) {
    content = fs.readFileSync(envFilePath, 'utf8');
  }

  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const nextContent = pattern.test(content)
    ? content.replace(pattern, serialized)
    : `${content.trimEnd()}${content.trim() ? '\n' : ''}${serialized}\n`;

  fs.writeFileSync(envFilePath, nextContent, 'utf8');
  process.env[key] = value;
}

export const envConfig = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  REVIEW_MAX_CONCURRENCY: Number(process.env.REVIEW_MAX_CONCURRENCY || 1),
  
  // Agent Configs
  Agents: {
    CHIEF: {
      API_URL: process.env.CHIEF_API_URL || 'https://api.openai.com/v1',
      API_KEY: process.env.CHIEF_API_KEY || '',
      MODEL: process.env.CHIEF_MODEL || 'gpt-4o',
    },
    STRUCTURE: {
      API_URL: process.env.STRUCTURE_API_URL || 'https://api.openai.com/v1',
      API_KEY: process.env.STRUCTURE_API_KEY || '',
      MODEL: process.env.STRUCTURE_MODEL || 'gpt-4-turbo',
    },
    LOGIC: {
      API_URL: process.env.LOGIC_API_URL || 'https://api.openai.com/v1',
      API_KEY: process.env.LOGIC_API_KEY || '',
      MODEL: process.env.LOGIC_MODEL || 'gpt-4-turbo',
    },
    LITERATURE: {
      API_URL: process.env.LITERATURE_API_URL || 'https://api.openai.com/v1',
      API_KEY: process.env.LITERATURE_API_KEY || '',
      MODEL: process.env.LITERATURE_MODEL || 'gpt-4-turbo',
    },
    WRITING: {
      API_URL: process.env.WRITING_API_URL || 'https://api.openai.com/v1',
      API_KEY: process.env.WRITING_API_KEY || '',
      MODEL: process.env.WRITING_MODEL || 'gpt-4-turbo',
    }
  }
};

export function getAgentConfigs() {
  return envConfig.Agents;
}

export function updateAgentConfig(agentName: keyof typeof envConfig.Agents, payload: Partial<AgentConfig>) {
  const agent = envConfig.Agents[agentName];
  if (!agent) {
    throw new Error(`Agent ${agentName} not found.`);
  }

  const prefix = String(agentName);

  if (typeof payload.API_URL === 'string') {
    agent.API_URL = payload.API_URL.trim();
    persistEnvValue(`${prefix}_API_URL`, agent.API_URL);
  }
  if (typeof payload.API_KEY === 'string') {
    agent.API_KEY = payload.API_KEY.trim();
    persistEnvValue(`${prefix}_API_KEY`, agent.API_KEY);
  }
  if (typeof payload.MODEL === 'string') {
    agent.MODEL = payload.MODEL.trim();
    persistEnvValue(`${prefix}_MODEL`, agent.MODEL);
  }

  return agent;
}
