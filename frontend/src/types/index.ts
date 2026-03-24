export interface Draft {
  provider: string;
  model: string;
  userInput: string;
}

export interface Tab {
  id: string;
  label: string;
}

export interface HistoryItem {
  id: string;
  provider: string;
  model: string;
  user_input: string;
  userInput?: string;
  generated_prompt: string;
  generatedPrompt?: string;
  created_at: string;
  createdAt?: string;
  generation_ms?: number | null;
  generationMs?: number | null;
  success: boolean;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  tags: string;
  prompt: string;
  is_public: boolean;
  rating?: number;
  created_at: string;
}
