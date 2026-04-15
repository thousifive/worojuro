/**
 * AI client — single entry point for all AI calls in Worojuro.
 *
 * ACTIVE: Ollama (local) — no API key needed, runs on localhost:11434
 * BOILERPLATE: Anthropic + OpenAI kept below each function — swap when keys arrive.
 *
 * To switch to Anthropic/OpenAI:
 *   1. Set ANTHROPIC_API_KEY and OPENAI_API_KEY in .env.local
 *   2. Replace the Ollama block with the commented Anthropic/OpenAI block
 *   3. Run new migration to change vector(768) → vector(1536) for resumes + jobs
 *
 * Embedding dimensions:
 *   Ollama nomic-embed-text → 768 dims  (current)
 *   OpenAI text-embedding-3-small → 1536 dims  (future — needs migration)
 */

export const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? '768', 10);

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma3:4b';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';

// ── Text generation ────────────────────────────────────────────────────────────

/**
 * generateText — send a prompt + system message, get text back.
 * Returns null on any failure — callers must handle null gracefully.
 */
export async function generateText(
  userMessage: string,
  systemPrompt: string,
  maxTokens = 512
): Promise<string | null> {
  // ── ACTIVE: Ollama ──────────────────────────────────────────────────────────
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { num_predict: maxTokens },
      }),
      signal: AbortSignal.timeout(300_000),
    });

    if (!response.ok) {
      console.error(`[ai-client] Ollama error ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[ai-client] generateText failed:', err);
    return null;
  }
  // ── end Ollama ────────────────────────────────────────────────────────────

  /* ── BOILERPLATE: Anthropic (swap when ANTHROPIC_API_KEY available) ────────
  import Anthropic from '@anthropic-ai/sdk';
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : null;
  } catch (err) {
    console.error('[ai-client] Anthropic generateText failed:', err);
    return null;
  }
  ── end Anthropic ─────────────────────────────────────────────────────────── */
}

// ── Embeddings ─────────────────────────────────────────────────────────────────

/**
 * generateEmbedding — convert text to a vector for cosine similarity search.
 * Returns null on failure — callers skip embedding, leave column null.
 *
 * Current dimensions: 768 (nomic-embed-text)
 * OpenAI dimensions:  1536 (text-embedding-3-small) — needs migration to switch
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // ── ACTIVE: Ollama ──────────────────────────────────────────────────────────
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: text.slice(0, 8000), // nomic-embed-text context window
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      console.error(`[ai-client] Ollama embed error ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch (err) {
    console.error('[ai-client] generateEmbedding failed:', err);
    return null;
  }
  // ── end Ollama ────────────────────────────────────────────────────────────

  /* ── BOILERPLATE: OpenAI (swap when OPENAI_API_KEY available) ─────────────
  // Also update EMBEDDING_DIMENSIONS=1536 in .env.local and run migration:
  //   ALTER TABLE jobs ALTER COLUMN embedding TYPE vector(1536);
  //   ALTER TABLE resumes ALTER COLUMN embedding TYPE vector(1536);
  import OpenAI from 'openai';
  const client = new OpenAI();
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return response.data[0]?.embedding ?? null;
  } catch (err) {
    console.error('[ai-client] OpenAI embedding failed:', err);
    return null;
  }
  ── end OpenAI ────────────────────────────────────────────────────────────── */
}

// ── Health check ───────────────────────────────────────────────────────────────

export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
