import { formatGeminiError, replyToCarryTheoryChat, type ChatHistoryTurn } from '../server/gemini.ts';
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, DEFAULT_SITE_CONFIG } from '../src/data/catalog.ts';

interface VercelRequestLike {
  method?: string;
  body?: {
    message?: unknown;
    history?: unknown;
  };
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'Please enter a question about Carry Theory.' });
    return;
  }

  const history = Array.isArray(req.body?.history)
    ? (req.body.history as ChatHistoryTurn[])
    : [];

  try {
    const reply = await replyToCarryTheoryChat({
      message,
      history,
      siteConfig: DEFAULT_SITE_CONFIG,
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
    });
    res.status(200).json({ reply });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
}
