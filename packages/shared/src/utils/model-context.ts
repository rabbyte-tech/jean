/**
 * Context window sizes for common LLM models
 * Values represent the maximum tokens the model can process (input + output)
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI models
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
  
  // Anthropic models
  'claude-3-5-sonnet': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku': 200000,
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-2.1': 200000,
  'claude-2': 100000,
  
  // OpenRouter prefixes (common patterns)
  'openai/gpt-4o': 128000,
  'openai/gpt-4o-mini': 128000,
  'openai/gpt-4-turbo': 128000,
  'anthropic/claude-3-5-sonnet': 200000,
  'anthropic/claude-3-5-sonnet-20241022': 200000,
  'anthropic/claude-3-opus': 200000,
  
  // Google models
  'gemini-1.5-pro': 1000000,
  'gemini-1.5-flash': 1000000,
  'gemini-pro': 32760,
  
  // Meta models
  'llama-3.1-405b': 128000,
  'llama-3.1-70b': 128000,
  'llama-3.1-8b': 128000,
  
  // Default fallback
  'default': 0,
};

/**
 * Get the context window size for a model
 * @param modelId - The model identifier (e.g., "gpt-4o", "openai/gpt-4o")
 * @returns The context window size in tokens
 */
export function getModelContextWindow(modelId: string): number {
  // Direct match
  if (MODEL_CONTEXT_WINDOWS[modelId]) {
    return MODEL_CONTEXT_WINDOWS[modelId];
  }
  
  // Try to match by partial name (e.g., "gpt-4o-2024-05-13" -> "gpt-4o")
  for (const [key, size] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (modelId.includes(key)) {
      return size;
    }
  }
  
  // Fallback to default
  return MODEL_CONTEXT_WINDOWS['default'];
}

/**
 * Calculate the percentage of context window used
 * @param tokensUsed - Number of tokens used
 * @param modelId - The model identifier
 * @returns Percentage (0-100) of context window used
 */
export function getContextWindowPercentage(tokensUsed: number, modelId: string): number {
  const maxTokens = getModelContextWindow(modelId);
  return Math.min(100, Math.round((tokensUsed / maxTokens) * 100));
}
