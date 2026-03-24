import { useState, useEffect, useCallback, memo } from 'react';
import { promptService } from '../services/api';
import { apiV2 } from '../services/apiV2';
import { promptIntelligence } from '../services/promptIntelligence';
import type { Draft } from '../types';
import type { Provider } from '../services/api';

interface PromptFormProps {
  onPromptGenerated: (prompt: string) => void;
  initialDraft: Draft;
  onDraftChange: (d: Partial<Draft>) => void;
}

function PromptForm({ onPromptGenerated, initialDraft, onDraftChange }: PromptFormProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestEngine, setSuggestEngine] = useState('ollama');

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (!initialDraft) return;

    const apply = async () => {
      if (initialDraft.provider) {
        setSelectedProvider(initialDraft.provider);

        const providerMeta = providers.find((p) => p.id === initialDraft.provider);
        if (providerMeta && providerMeta.requiresApiKey === false) {
          try {
            setLoadingModels(true);
            const response = await promptService.getModels(initialDraft.provider, '');
            setModels(response.data.models);
          } catch {
            // ignore
          } finally {
            setLoadingModels(false);
          }
        }
      }

      if (initialDraft.model) setSelectedModel(initialDraft.model);
      if (typeof initialDraft.userInput === 'string') setUserInput(initialDraft.userInput);
    };

    apply();
  }, [initialDraft, providers]);

  const fetchProviders = useCallback(async () => {
    try {
      const response = await promptService.getProviders();
      setProviders(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    }
  }, []);

  const handleProviderChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setSelectedProvider(provider);
    setSelectedModel('');
    setModels([]);
    setApiKey('');
    setError('');

    onDraftChange({ provider, model: '', userInput: '' });

    const nextProvider = providers.find((p) => p.id === provider);
    if (nextProvider && nextProvider.requiresApiKey === false) {
      try {
        setLoadingModels(true);
        const response = await promptService.getModels(provider, '');
        setModels(response.data.models);
      } catch (err) {
        setError(err instanceof Error ? err.message : '');
      } finally {
        setLoadingModels(false);
      }
    }
  }, [providers, onDraftChange]);

  const handleApiKeyBlur = useCallback(async () => {
    if (selectedProvider && apiKey) {
      await fetchModels();
    }
  }, [selectedProvider, apiKey]);

  const handleFetchModelsClick = useCallback(async () => {
    await fetchModels();
  }, []);

  const fetchModels = useCallback(async () => {
    if (!selectedProvider) return;
    
    setLoadingModels(true);
    setError('');
    
    try {
      const response = await promptService.getModels(selectedProvider, apiKey);
      setModels(response.data.models);
      
      if (response.data.models.length === 0) {
        setError('No models available for this provider');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [selectedProvider, apiKey]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await promptService.generatePrompt(
        selectedProvider,
        selectedModel,
        apiKey,
        userInput
      );
      onPromptGenerated(response.data.generatedPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt');
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, selectedModel, apiKey, userInput, onPromptGenerated]);

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const requiresApiKey = currentProvider?.requiresApiKey;

  const detectedType = promptIntelligence.detectType(userInput);
  const detectedTone = promptIntelligence.detectTone(userInput);
  const suggestions = promptIntelligence.suggestions(userInput);
  const hints = promptIntelligence.autocompleteHints(userInput);

  const handleUserInputChange = useCallback((value: string) => {
    setUserInput(value);
    onDraftChange({ provider: selectedProvider, model: selectedModel, userInput: value });
  }, [selectedProvider, selectedModel, onDraftChange]);

  const handleSuggest = useCallback(async () => {
    setError('');
    setSuggestionText('');
    setSuggestLoading(true);
    try {
      const res = await apiV2.suggestions.suggest({
        userInput,
        engine: suggestEngine,
        topK: 5,
      });
      const text = res.data.text;
      setSuggestionText(text);

      try {
        const parsed = JSON.parse(text);
        if (parsed?.betterUserInput) {
          setUserInput(parsed.betterUserInput);
          onDraftChange({ provider: selectedProvider, model: selectedModel, userInput: parsed.betterUserInput });
        }
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get suggestions');
    } finally {
      setSuggestLoading(false);
    }
  }, [userInput, suggestEngine, selectedProvider, selectedModel, onDraftChange]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Generate Your Prompt</h2>
      
      {loading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-white/70 mb-1">
            <span>Generating prompt...</span>
            <span>Please wait</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary-500 h-2 rounded-full animate-pulse" 
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            AI Provider
          </label>
          <select
            value={selectedProvider}
            onChange={handleProviderChange}
            className="select-field"
            required
          >
            <option value="">Select a provider</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {requiresApiKey && selectedProvider && (
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={handleApiKeyBlur}
                className="input-field"
                placeholder="Enter your API key"
                required
              />
              <button
                type="button"
                onClick={handleFetchModelsClick}
                disabled={!apiKey || loadingModels}
                className="btn-secondary whitespace-nowrap disabled:opacity-50"
              >
                {loadingModels ? 'Loading...' : 'Load Models'}
              </button>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Your API key is used only for this request and not stored
            </p>
          </div>
        )}

        {!requiresApiKey && selectedProvider && (
          <div>
            <button
              type="button"
              onClick={handleFetchModelsClick}
              disabled={loadingModels}
              className="btn-secondary disabled:opacity-50"
            >
              {loadingModels ? 'Loading Models...' : 'Load Available Models'}
            </button>
            {selectedProvider === 'ollama' && (
              <p className="text-xs text-white/50 mt-1">
                Make sure Ollama is running locally
              </p>
            )}
          </div>
        )}

        {models.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model ({models.length} available)
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="select-field"
              required
            >
              <option value="">Select a model</option>
              {models.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What kind of prompt do you need?
          </label>
          <textarea
            value={userInput}
            onChange={(e) => handleUserInputChange(e.target.value)}
            className="input-field min-h-32"
            placeholder="Example: I need a prompt to create YouTube Shorts content about psychology"
            required
          />
          <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-gray-100 rounded">Type: {detectedType}</span>
            <span className="px-2 py-1 bg-gray-100 rounded">Tone: {detectedTone}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <select
              className="select-field max-w-[220px]"
              value={suggestEngine}
              onChange={(e) => setSuggestEngine(e.target.value)}
            >
              <option value="ollama">AI Suggest (Ollama local)</option>
              <option value="openrouter">AI Suggest (OpenRouter online)</option>
            </select>
            <button
              type="button"
              className="btn-secondary"
              disabled={!userInput || suggestLoading}
              onClick={handleSuggest}
            >
              {suggestLoading ? 'Suggesting...' : 'AI Suggest'}
            </button>
          </div>

          {suggestionText && (
            <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-sm font-semibold text-white">AI Suggestion Output</div>
              <pre className="mt-2 text-xs whitespace-pre-wrap font-mono text-white/80">{suggestionText}</pre>
            </div>
          )}

          {(hints.length > 0 || suggestions.length > 0) && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-semibold text-blue-900">Smart suggestions</div>
              <ul className="list-disc list-inside text-sm text-blue-900 mt-1 space-y-1">
                {hints.map((h, i) => (
                  <li key={`hint-${i}`}>{h}</li>
                ))}
                {suggestions.slice(0, 3).map((s, i) => (
                  <li key={`suggest-${i}`}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedProvider || !selectedModel || !userInput}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {loading ? 'Generating...' : 'Generate Prompt'}
        </button>
      </form>
    </div>
  );
}

export default memo(PromptForm);
