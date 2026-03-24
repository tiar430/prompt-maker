import { apiV2 } from './apiV2';

const HISTORY_KEY = 'prompt_generator.history.v1';
const TEMPLATES_KEY = 'prompt_generator.templates.v1';

const safeParse = <T>(v: string | null, fallback: T): T => {
  try {
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

interface MigrationResult {
  migrated: number;
}

interface LocalHistoryItem {
  provider?: string;
  model?: string;
  userInput?: string;
  generatedPrompt?: string;
  isPublic?: boolean;
}

interface LocalTemplateItem {
  name?: string;
  category?: string;
  tags?: string;
  prompt?: string;
  isPublic?: boolean;
}

export const migrateLocalToDb = {
  async migrateHistory(): Promise<MigrationResult> {
    const items = safeParse<LocalHistoryItem[]>(localStorage.getItem(HISTORY_KEY), []);
    if (!Array.isArray(items) || items.length === 0) return { migrated: 0 };

    let migrated = 0;
    for (const x of items) {
      if (!x?.provider || !x?.userInput || !x?.generatedPrompt) continue;
      try {
        await apiV2.history.add({
          provider: x.provider,
          model: x.model || '',
          user_input: x.userInput,
          generated_prompt: x.generatedPrompt,
          success: true,
        });
        migrated += 1;
      } catch {
        // ignore individual failures
      }
    }

    return { migrated };
  },

  async migrateTemplates(): Promise<MigrationResult> {
    const items = safeParse<LocalTemplateItem[]>(localStorage.getItem(TEMPLATES_KEY), []);
    if (!Array.isArray(items) || items.length === 0) return { migrated: 0 };

    let migrated = 0;
    for (const t of items) {
      if (!t?.name || !t?.category || !t?.prompt) continue;
      try {
        await apiV2.templates.upsert({
          name: t.name,
          category: t.category,
          tags: t.tags || '',
          prompt: t.prompt,
          is_public: !!t.isPublic,
        });
        migrated += 1;
      } catch {
        // ignore
      }
    }

    return { migrated };
  },

  clearLocal(): void {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(TEMPLATES_KEY);
  },
};
