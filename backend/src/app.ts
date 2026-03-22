import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { envConfig } from './config/env';

// Load initial basic config, robust parsing happens in env.ts
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'multi-agent-paper-improvement-system' });
});

import apiRouter from './api/routes';

// Import and use routes here later
app.use('/api', apiRouter);

const PORT = envConfig.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
