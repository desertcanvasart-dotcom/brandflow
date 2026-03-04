import { deepgramClient } from './client'

interface TranscriptResult {
  transcript: string
  paragraphs: Array<{ text: string; start: number; end: number }>
}

export async function transcribeAudio(audioUrl: string): Promise<TranscriptResult> {
  const { result, error } = await deepgramClient.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: 'nova-2',
      smart_format: true,
      paragraphs: true,
      diarize: true,
    }
  )

  if (error) throw new Error(`Transcription failed: ${error.message}`)

  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  const paragraphData = result.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs ?? []

  const paragraphs = paragraphData.map((p: any) => ({
    text: p.sentences?.map((s: any) => s.text).join(' ') ?? '',
    start: p.start ?? 0,
    end: p.end ?? 0,
  }))

  return { transcript, paragraphs }
}
