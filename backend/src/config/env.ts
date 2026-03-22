import dotenv from 'dotenv';
import path from 'path';

// Load environment from the workspace root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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
