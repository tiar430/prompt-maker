import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Template {
  id: string;
  name: string;
  category: string;
  tags: string;
  prompt: string;
  is_public: boolean;
  rating: number | null;
  created_at: string;
}

export interface TemplateRating {
  id: string;
  template_id: string;
  rating: number;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  provider: string;
  model: string;
  user_input: string;
  generated_prompt: string;
  created_at: string;
  generation_ms: number | null;
  success: boolean;
}

export interface SuggestionRequest {
  userInput: string;
  engine: string;
  topK: number;
}

export interface SuggestionResponse {
  data: {
    text: string;
  };
}

interface ApiErrorResponse {
  message?: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const getErrorMessage = (error: unknown, defaultMsg: string): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
      return 'Unable to connect to server';
    }
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMsg;
};

const withErrorHandling = <T>(promise: Promise<{ data: T }>, defaultMsg: string): Promise<T> => {
  return promise
    .then((r) => r.data)
    .catch((error) => {
      throw new Error(getErrorMessage(error, defaultMsg));
    });
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const apiV2 = {
  templates: {
    list(params: Record<string, string> = {}) {
      return withErrorHandling<ApiResponse<Template[]>>(apiClient.get('/templates', { params }), 'Failed to load templates');
    },
    upsert(payload: Partial<Template>) {
      return withErrorHandling<ApiResponse<Template>>(apiClient.post('/templates', payload), 'Failed to save template');
    },
    remove(id: string) {
      return withErrorHandling<ApiResponse<null>>(apiClient.delete(`/templates/${id}`), 'Failed to delete template');
    },
    rate(payload: { template_id: string; rating: number }) {
      return withErrorHandling<ApiResponse<TemplateRating>>(apiClient.post('/templates/rate', payload), 'Failed to rate template');
    },
  },
  history: {
    list(params: Record<string, string> = {}) {
      return withErrorHandling<ApiResponse<HistoryItem[]>>(apiClient.get('/history', { params }), 'Failed to load history');
    },
    add(payload: { provider: string; model: string; userInput: string; generatedPrompt: string; success?: boolean }) {
      return withErrorHandling<ApiResponse<HistoryItem>>(apiClient.post('/history', payload), 'Failed to save to history');
    },
    remove(id: string) {
      return withErrorHandling<ApiResponse<null>>(apiClient.delete(`/history/${id}`), 'Failed to delete from history');
    },
    clear() {
      return withErrorHandling<ApiResponse<null>>(apiClient.post('/history/clear'), 'Failed to clear history');
    },
  },
  suggestions: {
    suggest(payload: SuggestionRequest) {
      return withErrorHandling<ApiResponse<SuggestionResponse>>(apiClient.post('/suggestions', payload), 'Failed to get suggestions');
    },
  },
};
