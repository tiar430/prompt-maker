import type { HistoryItem, Template } from '../types';

const HISTORY_KEY = 'promptMaker.history.v1';
const TEMPLATES_KEY = 'promptMaker.templates.v1';

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const historyStorage = {
  getAll(): HistoryItem[] {
    const data = safeJsonParse<HistoryItem[]>(localStorage.getItem(HISTORY_KEY), []);
    return Array.isArray(data)
      ? data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      : [];
  },

  save(entry: Partial<HistoryItem>): HistoryItem {
    const all = historyStorage.getAll();
    const item: HistoryItem = {
      id: entry.id || uuid(),
      provider: entry.provider || '',
      model: entry.model || '',
      user_input: entry.user_input || '',
      generated_prompt: entry.generated_prompt || '',
      created_at: entry.created_at || new Date().toISOString(),
      generation_ms: entry.generation_ms ?? undefined,
      success: entry.success ?? true,
    };

    const next = [item, ...all];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return item;
  },

  remove(id: string): void {
    const next = historyStorage.getAll().filter((x) => x.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  },

  clear(): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  },
};

const defaultTemplates: Template[] = [
  {
    id: 'tpl-content-writing-blog',
    name: 'Content Writing: Blog Outline',
    category: 'Content Writing',
    tags: 'blog,outline,seo',
    rating: 4.7,
    prompt: 'Create a detailed SEO-friendly blog outline about: {topic}. Include title ideas, headings (H2/H3), key points per section, and FAQs.',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-code-review',
    name: 'Code Review Checklist',
    category: 'Code Review',
    tags: 'code,review,quality',
    rating: 4.5,
    prompt: 'You are a senior engineer. Review the following code for correctness, security, readability, and performance. Provide actionable suggestions and a prioritized list of issues. Code:\n\n{code}',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-data-analysis',
    name: 'Data Analysis: Insights',
    category: 'Data Analysis',
    tags: 'analysis,insights',
    rating: 4.3,
    prompt: 'Analyze this dataset summary and produce insights, anomalies, and recommended next analyses. Summary: {summary}',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-creative-writing',
    name: 'Creative Writing: Short Story',
    category: 'Creative Writing',
    tags: 'story,creative',
    rating: 4.6,
    prompt: 'Write a short story in the style of {style} with the theme: {theme}. Use vivid descriptions and a strong ending.',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-business-email',
    name: 'Business: Professional Email',
    category: 'Business',
    tags: 'email,professional',
    rating: 4.4,
    prompt: 'Draft a professional email to {recipient} about {subject}. Context: {context}. Tone: {tone}. Include a clear call-to-action.',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-education-lesson',
    name: 'Education: Lesson Plan',
    category: 'Education',
    tags: 'lesson,teaching',
    rating: 4.2,
    prompt: 'Create a lesson plan for {gradeLevel} about {topic}. Include objectives, materials, warm-up, activities, assessment, and homework.',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-database-sql',
    name: 'Database: SQL Generator',
    category: 'Database',
    tags: 'sql,database',
    rating: 4.1,
    prompt: 'Given the schema: {schema}. Write an optimized SQL query to: {task}. Explain the query briefly and suggest indexes if needed.',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-financing-budget',
    name: 'Financing: Budget Planner',
    category: 'Financing',
    tags: 'budget,finance',
    rating: 4.0,
    prompt: 'Create a monthly budget plan based on income {income} and expenses {expenses}. Suggest optimizations and savings targets.',
    is_public: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

export const templateStorage = {
  getAll(): Template[] {
    const stored = safeJsonParse<Template[] | null>(localStorage.getItem(TEMPLATES_KEY), null);
    if (!stored) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(defaultTemplates));
      return defaultTemplates;
    }
    return Array.isArray(stored) ? stored : [];
  },

  save(template: Partial<Template>): Template {
    const all = templateStorage.getAll();
    const item: Template = {
      id: template.id || uuid(),
      name: template.name || '',
      category: template.category || '',
      tags: template.tags || '',
      rating: template.rating ?? null,
      prompt: template.prompt || '',
      is_public: template.is_public ?? false,
      created_at: template.created_at || new Date().toISOString(),
    };

    const next = [item, ...all.filter((t) => t.id !== item.id)];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
    return item;
  },

  rate(templateId: string, rating: number): void {
    const all = templateStorage.getAll();
    const next = all.map((t) => {
      if (t.id !== templateId) return t;
      return { ...t, rating };
    });
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  },

  remove(templateId: string): void {
    const next = templateStorage.getAll().filter((t) => t.id !== templateId);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next));
  },
};
