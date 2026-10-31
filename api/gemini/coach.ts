import { generateCoachAdvice } from '../../src/server/geminiService.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const clientHeader = req.headers?.['x-requested-with'];
  if (clientHeader !== 'MyFitJourneyClient') {
    res.status(403).json({
      error: 'Forbidden: Missing or invalid client authorization header.',
    });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({
      error: 'Bad Request: Payload must be a valid JSON object.',
    });
    return;
  }

  const { language, userQuery, userProfile, todaySummary } = body;
  try {
    const result = await generateCoachAdvice({
      language: language === 'bn' ? 'bn' : 'en',
      userQuery:
        typeof userQuery === 'string'
          ? userQuery.trim().slice(0, 1000)
          : undefined,
      userProfile,
      todaySummary,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
