import { embed, embedMany } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })
const embeddingModel = openai.embedding('text-embedding-3-small')

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text })
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: embeddingModel, values: texts })
  return embeddings
}

/**
 * Split text into overlapping chunks on paragraph boundaries.
 */
export function chunkText(
  text: string,
  maxChunkSize = 1000,
  overlap = 100
): string[] {
  if (!text || text.length <= maxChunkSize) return [text]

  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      // Keep overlap from end of current chunk
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + '\n\n' + para
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}
