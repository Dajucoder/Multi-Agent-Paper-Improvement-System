import { Router } from 'express';
import { envConfig } from '../../config/env';
import { getReviewMaxConcurrency, setReviewMaxConcurrency } from './system.state';

const router = Router();

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

router.get('/diagnostics', async (_req, res) => {
  const agentEntries = await Promise.all(Object.entries(envConfig.Agents).map(async ([name, config]) => {
    let connectivityStatus: 'ok' | 'failed' | 'unknown' = 'unknown';
    let connectivityMessage = '未测试';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(config.API_URL, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      connectivityStatus = response.ok || response.status < 500 ? 'ok' : 'failed';
      connectivityMessage = `HTTP ${response.status}`;
    } catch (error: any) {
      connectivityStatus = 'failed';
      connectivityMessage = error?.message || '连接失败';
    }

    return {
      name,
      apiUrl: maskUrl(config.API_URL),
      model: config.MODEL,
      hasApiKey: Boolean(config.API_KEY),
      apiKeyPreview: config.API_KEY ? `${config.API_KEY.slice(0, 4)}...${config.API_KEY.slice(-4)}` : null,
      connectivityStatus,
      connectivityMessage,
    };
  }));

  const allAgentsConfigured = agentEntries.every((entry) => entry.hasApiKey && entry.apiUrl && entry.model);

  res.json({
    status: allAgentsConfigured ? 'ready' : 'partial',
    environment: envConfig.NODE_ENV,
    port: envConfig.PORT,
    databaseConfigured: Boolean(envConfig.DATABASE_URL),
    reviewMaxConcurrency: getReviewMaxConcurrency(),
    agents: agentEntries,
    checks: {
      allAgentsConfigured,
      configuredCount: agentEntries.filter((entry) => entry.hasApiKey).length,
      totalCount: agentEntries.length,
    },
  });
});

router.post('/settings/review-concurrency', async (req, res) => {
  const value = Number(req.body?.value);
  if (!Number.isFinite(value) || value < 1 || value > 4) {
    return res.status(400).json({ error: 'Concurrency value must be between 1 and 4.' });
  }

  const applied = setReviewMaxConcurrency(value);
  res.json({ reviewMaxConcurrency: applied });
});

export const systemRoutes = router;
