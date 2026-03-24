import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Provider {
  id: string;
  name: string;
  requiresApiKey: boolean;
}

export interface Model {
  id: string;
  name: string;
}

export interface ModelsResponse {
  models: string[];
}

export interface GenerateResponse {
  generatedPrompt: string;
}

export interface ApiError {
  message: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getErrorMessage = (error: unknown, defaultMsg: string): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
      return 'Unable to connect to server. Please ensure the backend is running.';
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

export const promptService = {
  async getProviders(): Promise<{ data: Provider[] }> {
    try {
      const response = await apiClient.get('/prompt/providers');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch providers'));
    }
  },

  async getModels(provider: string, apiKey: string): Promise<{ data: ModelsResponse }> {
    try {
      const response = await apiClient.post('/prompt/models', {
        provider,
        apiKey
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch models'));
    }
  },

  async generatePrompt(provider: string, model: string, apiKey: string, userInput: string): Promise<{ data: GenerateResponse }> {
    try {
      const response = await apiClient.post('/prompt/generate', {
        provider,
        model,
        apiKey,
        userInput
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to generate prompt'));
    }
  }
};
