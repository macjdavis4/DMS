/**
 * OCR for handwritten data cards via Google Cloud Vision.
 *
 * The Vision API exposes two relevant endpoints:
 *   * TEXT_DETECTION — fast, well-suited to clean printed text
 *   * DOCUMENT_TEXT_DETECTION — slower, much better at handwriting & dense docs
 *
 * For dealer data cards (mostly hand-written), we use DOCUMENT_TEXT_DETECTION
 * and explicitly hint the language as English.
 *
 * If GOOGLE_APPLICATION_CREDENTIALS is not set, this module returns null —
 * the upload still succeeds, the data card is just stored without extraction.
 */
import { env } from './env'
import { logger } from './logger'

export interface OcrResult {
  text: string
  confidence: number  // 0..1, averaged across detected pages
}

let clientPromise: Promise<unknown> | null = null
async function getClient() {
  if (!env.GOOGLE_APPLICATION_CREDENTIALS) return null
  if (!clientPromise) {
    clientPromise = (async () => {
      // Imported lazily so installs without Vision configured don't pay the cost.
      const { ImageAnnotatorClient } = await import('@google-cloud/vision')
      return new ImageAnnotatorClient()
    })()
  }
  return clientPromise
}

export function isOcrConfigured(): boolean {
  return Boolean(env.GOOGLE_APPLICATION_CREDENTIALS)
}

export async function extractText(image: Buffer): Promise<OcrResult | null> {
  const client = await getClient()
  if (!client) return null

  try {
    // @ts-expect-error — dynamically-imported client typing is awkward
    const [response] = await client.documentTextDetection({
      image: { content: image },
      imageContext: { languageHints: ['en'] },
    })

    const fullText: string = response.fullTextAnnotation?.text ?? ''
    const pages = response.fullTextAnnotation?.pages ?? []
    const confidences: number[] = pages
      .map((p: { confidence?: number }) => p.confidence)
      .filter((c: unknown): c is number => typeof c === 'number')
    const avgConfidence =
      confidences.length === 0
        ? 0
        : confidences.reduce((a, b) => a + b, 0) / confidences.length

    return { text: fullText, confidence: avgConfidence }
  } catch (err) {
    logger.error({ err }, 'OCR extraction failed')
    return null
  }
}
