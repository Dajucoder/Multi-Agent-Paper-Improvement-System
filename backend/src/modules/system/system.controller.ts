import { Router } from 'express';
import { envConfig, updateAgentConfig } from '../../config/env';
import { getReviewMaxConcurrency, setReviewMaxConcurrency } from './system.state';

const router = Router();

async function runConnectivityCheck(name: string, config: { API_URL: string; API_KEY?: string; MODEL: string }) {
  const startedAt = Date.now();
  let connectivityStatus: 'ok' | 'failed' | 'unknown' = 'unknown';
  let connectivityMessage = '未测试';
  let statusCode: number | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(config.API_URL, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    statusCode = response.status;
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
    connectivityDetail: {
      statusCode,
      durationMs: Date.now() - startedAt,
      testedAt: new Date().toISOString(),
      errorSummary: connectivityStatus === 'failed' ? connectivityMessage : null,
    },
  };
}

function maskUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

router.get('/diagnostics', async (_req, res) => {
  const agentEntries = await Promise.all(Object.entries(envConfig.Agents).map(([name, config]) => runConnectivityCheck(name, config)));

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

router.post('/diagnostics/connectivity', async (_req, res) => {
  const agentEntries = await Promise.all(Object.entries(envConfig.Agents).map(([name, config]) => runConnectivityCheck(name, config)));
  res.json({
    testedAt: new Date().toISOString(),
    agents: agentEntries,
  });
});

router.post('/diagnostics/agents/:agentName', async (req, res) => {
  const agentName = String(req.params.agentName || '').toUpperCase() as keyof typeof envConfig.Agents;
  const current = envConfig.Agents[agentName];

  if (!current) {
    return res.status(404).json({ error: 'Agent config not found.' });
  }

  const apiUrl = String(req.body?.apiUrl || '').trim();
  const model = String(req.body?.model || '').trim();
  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey : undefined;

  if (!apiUrl || !model) {
    return res.status(400).json({ error: 'API URL and model are required.' });
  }

  try {
    updateAgentConfig(agentName, {
      API_URL: apiUrl,
      MODEL: model,
      ...(apiKey !== undefined ? { API_KEY: apiKey } : {}),
    });
    const updated = await runConnectivityCheck(agentName, envConfig.Agents[agentName]);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update agent config.' });
  }
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
