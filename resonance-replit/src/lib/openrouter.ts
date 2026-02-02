// ============================================
// OPENROUTER LLM CLIENT
// ============================================

export type ModelId =
  | 'openai/gpt-4o'
  | 'anthropic/claude-sonnet-4'
  | 'google/gemini-2.0-flash-exp'
  | 'x-ai/grok-3'
  | 'meta-llama/llama-3.3-70b-instruct'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOptions {
  model?: ModelId
  temperature?: number
  maxTokens?: number
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Send messages to an LLM via OpenRouter
 */
export async function llm(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const {
    model = 'anthropic/claude-sonnet-4',
    temperature = 0.7,
    maxTokens = 4096,
  } = options

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Resonance',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      `OpenRouter error: ${error.message || error.error?.message || response.statusText}`
    )
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Convenience function for single-prompt queries
 */
export async function ask(
  prompt: string,
  model: ModelId = 'anthropic/claude-sonnet-4'
): Promise<string> {
  return llm([{ role: 'user', content: prompt }], { model })
}

/**
 * Generate a chat completion with system context
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
  options?: LLMOptions
): Promise<string> {
  return llm(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    options
  )
}
