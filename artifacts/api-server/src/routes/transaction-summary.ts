import { Router, type IRouter } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth.js';
import { listData } from '../lib/data-store.js';
import {
  aggregateTransactions,
  resolveSummaryPeriod,
  validateSummaryOutput,
  type TransactionSummaryRow,
} from '../lib/transaction-summary.js';
import {
  consumeAndCacheTransactionSummary,
  getCachedTransactionSummary,
} from '../lib/transaction-summary-cache.js';
import { CreditsExhaustedError, getCreditBalance } from '../lib/credit-service.js';
import { ValidationError, requireEnum, requireString } from '../lib/validate.js';

const router: IRouter = Router();
const AI_BASE_URL = (process.env['OPENAI_BASE_URL'] ?? 'https://ai.sumopod.com').replace(/\/+$/, '');
const AI_MODEL = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = 30_000;
const PERIOD_TYPES = ['week', 'month', 'custom'] as const;

function queryString(value: unknown, field: string): string {
  return requireString(String(value ?? ''), field, 20);
}

function parsePeriod(input: {
  period_type?: unknown;
  start_date?: unknown;
  end_date?: unknown;
}) {
  const periodType = requireEnum(queryString(input.period_type, 'period_type'), 'period_type', PERIOD_TYPES);
  const startDate = queryString(input.start_date, 'start_date');
  const endDate = queryString(input.end_date, 'end_date');
  return resolveSummaryPeriod({ periodType, startDate, endDate });
}

function mapSheetRows(rows: Array<Record<string, unknown>>): TransactionSummaryRow[] {
  return rows.map((row) => ({
    id: typeof row.id === 'string' ? row.id : undefined,
    type: row.type === 'income' ? 'income' : 'expense',
    amount: Number(row.amount),
    category: typeof row.category === 'string' ? row.category : 'Lainnya',
    date: typeof row.date === 'string' ? row.date.slice(0, 10) : '',
  }));
}

function parseAiJson(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(withoutFence);
}

async function generateWithAi(
  apiKey: string,
  aggregate: ReturnType<typeof aggregateTransactions>,
): Promise<ReturnType<typeof validateSummaryOutput>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content:
              'Anda adalah asisten analisis transaksi pribadi. Tulis dalam bahasa Indonesia. ' +
              'Gunakan hanya data agregat yang diberikan, jangan mengarang transaksi, nominal, ' +
              'kategori, atau penyebab. Jangan memberi nasihat finansial generik. Kembalikan ' +
              'JSON valid tanpa markdown dengan bentuk: {headline:string, totals:{income:number,expense:number}, ' +
              'top_expense_categories:[{category:string,amount:number,percentage:number}], ' +
              'comparison:{income_change_percent:number|null,expense_change_percent:number|null,direction:"up"|"down"|"same"|"unavailable"}, ' +
              'insights:string[]} dengan tepat 1 atau 2 insight spesifik.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              current: aggregate.current,
              comparison_period: aggregate.comparisonPeriod,
              comparison: aggregate.comparison,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw Object.assign(new Error('AI_PROVIDER_ERROR'), { statusCode: response.status });
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('AI_EMPTY_OUTPUT');
    return validateSummaryOutput(parseAiJson(content));
  } finally {
    clearTimeout(timeout);
  }
}

async function handlePeriod(req: Parameters<Router['get']>[1] extends never ? never : any, res: any): Promise<void> {
  try {
    const period = parsePeriod(req.query);
    const summary = await getCachedTransactionSummary(req.userId!, period);
    res.status(200).json({ data: { cached: Boolean(summary), summary } });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to read transaction summary cache');
    res.status(500).json({ error: 'Failed to load transaction summary' });
  }
}

router.get('/transactions/summary', requireAuth, userRateLimit, handlePeriod);

router.post('/transactions/summary/generate', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const period = parsePeriod(body);
    const requestId = requireString(
      String(req.get('Idempotency-Key') ?? body.request_id ?? ''),
      'request_id',
      100,
    );
    const apiKey = process.env['OPENAI_API_KEY'];
    const currentBalance = await getCreditBalance(req.userId!);
    const rows = await listData('transactions', req.userId!);
    const aggregate = aggregateTransactions(mapSheetRows(rows as Array<Record<string, unknown>>), period);

    if (aggregate.current.transactionCount === 0) {
      res.status(200).json({ data: { summary: null, balance: currentBalance, empty: true } });
      return;
    }
    if (!apiKey) {
      res.status(503).json({ error: 'AI summarization is not configured' });
      return;
    }
    if (currentBalance <= 0) {
      res.status(402).json({ error: 'CREDITS_EXHAUSTED', balance: 0 });
      return;
    }

    let output;
    try {
      const aiOutput = await generateWithAi(apiKey, aggregate);
      output = {
        ...aiOutput,
        totals: {
          income: aggregate.current.income,
          expense: aggregate.current.expense,
        },
        top_expense_categories: aggregate.current.topExpenseCategories,
        comparison: {
          income_change_percent: aggregate.comparison.incomeChangePercent,
          expense_change_percent: aggregate.comparison.expenseChangePercent,
          direction: aggregate.comparison.direction,
        },
      };
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (err instanceof Error && err.name === 'AbortError') {
        res.status(504).json({ error: 'AI summary request timed out' });
        return;
      }
      req.log.warn({ status: statusCode ?? 502, provider: AI_BASE_URL, model: AI_MODEL }, 'Transaction summary provider failed');
      res.status(502).json({ error: 'AI summary could not be generated' });
      return;
    }

    try {
      const result = await consumeAndCacheTransactionSummary(req.userId!, requestId, period, output);
      res.status(200).json({ data: result });
      return;
    } catch (err) {
      if (err instanceof CreditsExhaustedError || (err instanceof Error && err.name === 'CreditsExhaustedError')) {
        res.status(402).json({ error: 'CREDITS_EXHAUSTED', balance: 0 });
        return;
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to generate transaction summary');
    res.status(500).json({ error: 'Failed to generate transaction summary' });
  }
});

export default router;
