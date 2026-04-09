const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export function getAuthorizedChatIds(): string[] {
  const multi = process.env.TELEGRAM_CHAT_IDS
  if (multi) return multi.split(',').map(s => s.trim()).filter(Boolean)
  const single = process.env.TELEGRAM_CHAT_ID
  if (single) return [single]
  return []
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  if (!res.ok) {
    console.error('Telegram sendMessage failed:', res.status, await res.text())
  }
}

export interface InlineButton {
  text: string
  callback_data: string
}

export async function sendMessageWithButtons(
  chatId: string,
  text: string,
  buttons: InlineButton[]
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [buttons.map(b => ({ text: b.text, callback_data: b.callback_data }))],
      },
    }),
  })
  if (!res.ok) {
    console.error('Telegram sendMessageWithButtons failed:', res.status, await res.text())
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
}

export async function deleteMessage(chatId: string, messageId: number): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  })
  if (!res.ok) {
    console.error('Telegram deleteMessage failed:', res.status, await res.text())
  }
}

/**
 * Obtiene información de un archivo de Telegram por su file_id.
 * Retorna la ruta del archivo para descargarlo.
 */
export async function getFile(fileId: string): Promise<{ file_path: string } | null> {
  const res = await fetch(`${TELEGRAM_API}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })
  if (!res.ok) {
    console.error('Telegram getFile failed:', res.status, await res.text())
    return null
  }
  const data = await res.json()
  if (!data.ok || !data.result?.file_path) {
    console.error('Telegram getFile response invalid:', data)
    return null
  }
  return { file_path: data.result.file_path }
}

/**
 * Descarga un archivo de Telegram dado su file_path.
 * Retorna el contenido del archivo como ArrayBuffer.
 */
export async function downloadFile(filePath: string): Promise<ArrayBuffer | null> {
  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error('Telegram downloadFile failed:', res.status)
    return null
  }
  return res.arrayBuffer()
}

/**
 * Transcribe un archivo de audio usando OpenAI Whisper.
 * Whisper soporta bien el formato OGG/Opus de Telegram.
 */
export async function transcribeAudioWithClaude(audioBuffer: ArrayBuffer, filename: string): Promise<string | null> {
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI()

  // Determinar el tipo MIME según la extensión
  const ext = filename.split('.').pop()?.toLowerCase() || 'ogg'
  const mimeTypes: Record<string, string> = {
    'ogg': 'audio/ogg',
    'oga': 'audio/ogg',
    'opus': 'audio/ogg',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'm4a': 'audio/mp4',
    'mp4': 'audio/mp4',
    'mpeg': 'audio/mpeg',
  }
  const mediaType = mimeTypes[ext] || 'audio/ogg'

  console.log(`Audio transcription: file=${filename}, ext=${ext}, mime=${mediaType}, size=${audioBuffer.byteLength} bytes`)

  try {
    // Crear un File object para la API de Whisper
    const audioFile = new File([audioBuffer], filename, { type: mediaType })

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
    })

    console.log(`Audio transcription result: ${response.text?.slice(0, 100) || 'empty'}`)
    return response.text || null
  } catch (err) {
    console.error('Whisper audio transcription failed:', err)
    if (err instanceof Error) {
      console.error('Error details:', err.message)
    }
    return null
  }
}
