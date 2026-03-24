import axios from 'axios';
import { templateService } from './templateService.js';
import { historyService } from './historyService.js';
import { embeddingService } from './embeddingService.js';

const getEnv = () => ({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_EMBEDDING_MODEL: process.env.OPENROUTER_EMBEDDING_MODEL || 'text-embedding-3-small',
  OPENROUTER_CHAT_MODEL: process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL || 'llama3',
});

const buildContextBlock = async (hits) => {
  const parts = [];
  for (const h of hits) {
    if (h.sourceType === 'template') {
      const tpl = await templateService.get(h.sourceId);
      if (tpl) {
        parts.push({
          type: 'template',
          id: tpl.id,
          title: `${tpl.name} (${tpl.category})`,
          text: tpl.prompt,
          score: h.score,
        });
      }
    }
    if (h.sourceType === 'history') {
      const item = await historyService.get(h.sourceId);
      if (item) {
        parts.push({
          type: 'history',
          id: item.id,
          title: `${item.provider} / ${item.model} @ ${item.createdAt}`,
          text: `User input:\n${item.userInput}\n\nGenerated prompt:\n${item.generatedPrompt}`,
          score: h.score,
        });
      }
    }
  }

  return parts;
};

export const openRouterEmbed = async (text) => {
  const { OPENROUTER_API_KEY, OPENROUTER_EMBEDDING_MODEL } = getEnv();
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const res = await axios.post(
    'https://openrouter.ai/api/v1/embeddings',
    {
      model: OPENROUTER_EMBEDDING_MODEL,
      input: text,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      timeout: 60000,
    }
  );

  const vector = res.data?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) throw new Error('Failed to create embedding');
  return vector;
};

const ollamaGenerate = async ({ prompt }) => {
  const { OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL } = getEnv();
  const res = await axios.post(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      model: OLLAMA_CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    },
    { timeout: 120000 }
  );

  const text = res.data?.message?.content;
  if (!text) throw new Error('Ollama returned empty response');
  return text;
};

const openRouterGenerate = async ({ prompt }) => {
  const { OPENROUTER_API_KEY, OPENROUTER_CHAT_MODEL } = getEnv();
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: OPENROUTER_CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1400,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      timeout: 120000,
    }
  );

  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter returned empty response');
  return text;
};

export const suggestionService = {
  async suggest({ userInput, engine = 'ollama', topK = 5 }) {
    const { OPENROUTER_API_KEY, OLLAMA_BASE_URL } = getEnv();
    let contextParts = [];

    // Check which engine is requested and available
    const useOpenRouter = engine === 'openrouter' && OPENROUTER_API_KEY;
    const useOllama = engine === 'ollama';

    // Try Ollama first if requested
    if (useOllama) {
      try {
        // Check if Ollama is available
        await axios.get(OLLAMA_BASE_URL, { timeout: 5000 });
      } catch {
        // Ollama not available, fall back to OpenRouter if available
        if (OPENROUTER_API_KEY) {
          return this.suggest({ userInput, engine: 'openrouter', topK });
        }
        throw new Error('Ollama is not running. Please start Ollama or configure OPENROUTER_API_KEY in .env');
      }
    }

    // If using OpenRouter, check API key
    if (useOpenRouter && !OPENROUTER_API_KEY) {
      // Try Ollama instead
      if (useOllama) {
        // Already tried Ollama above and failed
        throw new Error('Ollama is not running and OPENROUTER_API_KEY is not configured');
      }
    }

    // Only use embedding/RAG with OpenRouter
    if (OPENROUTER_API_KEY) {
      try {
        const queryVector = await openRouterEmbed(userInput).catch(() => null);
        if (queryVector) {
          const hits = await embeddingService.searchSimilar({ queryVector, topK, sourceTypes: ['template', 'history'] }).catch(() => []);
          contextParts = await buildContextBlock(hits).catch(() => []);
        }
      } catch {
        // Ignore embedding errors, continue without context
      }
    }

    // Build prompt
    const contextText = contextParts.length > 0
      ? contextParts
          .map((c) => `### ${c.type.toUpperCase()} (${c.score.toFixed(3)}) - ${c.title}\n${c.text}`)
          .join('\n\n')
      : '';

    const finalPrompt = contextParts.length > 0
      ? `You are a prompt-engineering assistant.\n\nUser request:\n${userInput}\n\nRelevant context from this app (templates/history):\n${contextText}\n\nTask:\n1) Improve the user request into a clearer prompt request.\n2) Produce a "Better User Input" for structured prompt generation.\n3) Provide bullet suggestions.\n\nOutput JSON with keys: betterUserInput, suggestions, clarifyingQuestions.`
      : `You are a prompt-engineering assistant.\n\nUser request:\n${userInput}\n\nTask:\n1) Improve the user request into a clearer prompt request.\n2) Produce a "Better User Input" for structured prompt generation.\n3) Provide bullet suggestions.\n\nOutput JSON with keys: betterUserInput, suggestions, clarifyingQuestions.`;

    // Generate
    let text;
    try {
      if (useOpenRouter) {
        text = await openRouterGenerate({ prompt: finalPrompt });
      } else {
        text = await ollamaGenerate({ prompt: finalPrompt });
      }
    } catch (err) {
      // If primary engine fails, try the other one
      if (useOpenRouter && OPENROUTER_API_KEY) {
        try {
          text = await ollamaGenerate({ prompt: finalPrompt });
        } catch {
          throw new Error('Both OpenRouter and Ollama failed. Please check your configuration.');
        }
      } else {
        throw err;
      }
    }

    return { text, context: contextParts };
  },
};
