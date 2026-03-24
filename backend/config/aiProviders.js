export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelsEndpoint: 'https://api.openai.com/v1/models',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    modelsEndpoint: null, // Anthropic tidak punya endpoint list models
    staticModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3.5-sonnet-20241022'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    })
  },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/chat',
    modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    headers: () => ({
      'Content-Type': 'application/json'
    })
  },
  grok: {
    name: 'Grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    modelsEndpoint: null,
    staticModels: ['grok-beta', 'grok-vision-beta', 'llama3:70b-versatile'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Prompt Generator'
    })
  },
  mistral: {
    name: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    modelsEndpoint: 'https://api.mistral.ai/v1/models',
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  ollama: {
    name: 'Ollama',
    endpoint: 'http://localhost:11434/api/chat',
    modelsEndpoint: 'http://localhost:11434/api/tags',
    headers: () => ({
      'Content-Type': 'application/json'
    })
  }
};

export const PROMPT_TEMPLATE = `You are an expert prompt engineer specializing in creating structured, high-quality prompts for AI systems.

Your task: Generate a comprehensive, well-structured prompt based on the user's request.

User's request: {USER_INPUT}

Create a prompt following this exact architecture:

**Role**
Define the Expert Persona
<role>
You are a [specific role/expert] with expertise in [domain].
Your audience: [description + knowledge level]
Communication style: [tone + specific requirements]
</role>

**Task**
Specify the Objective
<task>
[Action verb] + [specific objective]
Key requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]
</task>

**Context**
Provide Relevant Background
<context>
[Relevant information, background details, or data needed]
</context>

**Examples**
Provide Example Outputs
<examples>
Example 1:
[Show what good output looks like for scenario 1]

Example 2:
[Show what good output looks like for scenario 2]
</examples>

**Output**
Define Expected Results
<output>
Format: [specific format]
Length: [constraint]
Structure: [if applicable]
</output>

**Constraints**
Set Boundaries & Guidelines
<constraints>
- [Specific do's and don'ts]
- [Style requirements]
- [Any limitations or boundaries]
</constraints>

**Instructions**
Guide the Process
<instructions>
For complex tasks: Think through your approach step-by-step, then provide the final answer in the requested format.
If information is missing or uncertain, state this explicitly rather than guessing.
</instructions>

Generate the complete prompt now, filling in all sections appropriately based on the user's request. Make it specific, actionable, and professionally structured.`;
