import { historyStorage } from './storage';
import type { HistoryItem } from '../types';

interface Pricing {
  input: number;
  output: number;
}

interface PricingPer1K {
  [key: string]: Pricing;
}

const DEFAULT_PRICING_PER_1K: PricingPer1K = {
  openai: { input: 0.01, output: 0.03 },
  anthropic: { input: 0.08, output: 0.024 },
  gemini: { input: 0.002, output: 0.006 },
  grok: { input: 0.01, output: 0.03 },
  openrouter: { input: 0.01, output: 0.03 },
  mistral: { input: 0.004, output: 0.012 },
  ollama: { input: 0, output: 0 },
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.max(1, Math.round(text.length / 4));
};

interface Summary {
  totalPrompts: number;
  byProvider: Record<string, number>;
  promptsByDay: Record<string, number>;
  providerCosts: Record<string, number>;
  avgGenerationMs: number | null;
  successRate: string | null;
}

interface ExportResult {
  mime: string;
  filename: string;
  content: string;
}

export const analytics = {
  buildSummary({ items: itemsInput = null, pricingPer1k = DEFAULT_PRICING_PER_1K }: { items?: HistoryItem[]; pricingPer1k?: PricingPer1K } = {}): Summary {
    const items = itemsInput || historyStorage.getAll();

    const totalPrompts = items.length;
    const byProvider = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.provider] = (acc[item.provider] || 0) + 1;
      return acc;
    }, {});

    const promptsByDay = items.reduce<Record<string, number>>((acc, item) => {
      const day = new Date(item.created_at || item.createdAt || '').toISOString().slice(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const providerCosts = items.reduce<Record<string, number>>((acc, item) => {
      const provider = item.provider;
      const pricing = pricingPer1k[provider] || { input: 0, output: 0 };
      const inputTokens = estimateTokens(item.user_input);
      const outputTokens = estimateTokens(item.generated_prompt);
      const cost = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
      acc[provider] = (acc[provider] || 0) + cost;
      return acc;
    }, {});

    return {
      totalPrompts,
      byProvider,
      promptsByDay,
      providerCosts,
      avgGenerationMs: null,
      successRate: null,
    };
  },

  exportHistory(format: 'json' | 'txt' | 'csv', itemsInput?: HistoryItem[]): ExportResult {
    const items = itemsInput || historyStorage.getAll();
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      return {
        mime: 'application/json',
        filename: `prompt-history-${dateStr}.json`,
        content: JSON.stringify(items, null, 2),
      };
    }

    if (format === 'txt') {
      const content = items
        .map((x) => {
          return [
            `ID: ${x.id}`,
            `Date: ${x.created_at}`,
            `Provider: ${x.provider}`,
            `Model: ${x.model}`,
            `User Input:\n${x.generated_prompt}`,
            '---',
          ].join('\n');
        })
        .join('\n');

      return {
        mime: 'text/plain',
        filename: `prompt-history-${dateStr}.txt`,
        content,
      };
    }

    if (format === 'csv') {
      const escape = (v: string | number | boolean | null | undefined): string => {
        const s = String(v ?? '');
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const headers = ['id', 'created_at', 'provider', 'model', 'user_input', 'generated_prompt'];
      const rows = items.map((x) => headers.map((h) => escape(x[h as keyof HistoryItem])).join(','));
      const content = [headers.join(','), ...rows].join('\n');
      return {
        mime: 'text/csv',
        filename: `prompt-history-${dateStr}.csv`,
        content,
      };
    }

    throw new Error('Unsupported export format');
  },
};
