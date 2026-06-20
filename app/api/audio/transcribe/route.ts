import { NextResponse } from 'next/server';

import { DriveRequestError, requireAuthorizedMindSafeUser } from '@/lib/drive-server';

export const runtime = 'nodejs';

const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;

async function sendTranscriptionRequest(apiKey: string, file: File, fileName: string, model: string) {
  const outbound = new FormData();
  outbound.append('model', model);
  outbound.append('response_format', 'text');
  outbound.append('file', file, fileName || file.name || 'recording.mp4');

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: outbound,
  });

  const bodyText = await response.text();
  return { response, bodyText };
}

export async function POST(request: Request) {
  try {
    await requireAuthorizedMindSafeUser(request);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new DriveRequestError(500, 'Missing OPENAI_API_KEY for audio transcription.');
    }

    const formData = await request.formData();
    const fileName = String(formData.get('fileName') || '').trim();
    const mimeType = String(formData.get('mimeType') || '').trim() || 'audio/mp4';
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new DriveRequestError(400, 'Missing audio file for transcription.');
    }

    if (file.size > MAX_AUDIO_FILE_BYTES) {
      throw new DriveRequestError(400, 'Audio file is too large to transcribe. OpenAI currently supports files up to 25 MB.');
    }

    const preferredModels = [
      process.env.OPENAI_AUDIO_TRANSCRIPTION_MODEL,
      'gpt-4o-mini-transcribe',
      'whisper-1',
    ].filter(Boolean) as string[];

    let transcriptText = '';
    let finalErrorStatus = 500;
    let finalErrorMessage = 'Unable to transcribe the audio recording.';

    for (const model of preferredModels) {
      const { response, bodyText } = await sendTranscriptionRequest(apiKey, file, fileName, model);

      if (response.ok) {
        transcriptText = bodyText.trim();
        break;
      }

      finalErrorStatus = response.status;

      try {
        const payload = JSON.parse(bodyText) as { error?: { message?: string } };
        finalErrorMessage = payload.error?.message || finalErrorMessage;
      } catch {
        finalErrorMessage = bodyText || finalErrorMessage;
      }

      const shouldTryFallback =
        (response.status === 400 || response.status === 403 || response.status === 404) &&
        model !== preferredModels[preferredModels.length - 1];

      if (!shouldTryFallback) {
        break;
      }
    }

    if (!transcriptText) {
      throw new DriveRequestError(finalErrorStatus, finalErrorMessage);
    }

    return NextResponse.json({
      transcript: transcriptText.trim(),
      mimeType,
      fileName: fileName || file.name || 'recording.mp4',
    });
  } catch (error) {
    const status = error instanceof DriveRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unable to transcribe the audio recording.';
    return NextResponse.json({ error: message }, { status });
  }
}
