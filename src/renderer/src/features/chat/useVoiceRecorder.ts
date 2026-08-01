import { useCallback, useEffect, useRef, useState } from 'react'
import { VOICE_MESSAGE_MAX_MS } from '@shared/chat/voiceMessage'

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus'
  return 'audio/webm'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('read failed'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

export interface VoiceRecordingResult {
  audioBase64: string
  durationMs: number
  mimeType: string
}

export function useVoiceRecorder(maxMs = VOICE_MESSAGE_MAX_MS) {
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startedAtRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeRef = useRef(pickMimeType())
  const stopRef = useRef<(() => Promise<VoiceRecordingResult | null>) | null>(null)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    clearTick()
    try {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    } catch {
      // ignore
    }
    recorderRef.current = null
    chunksRef.current = []
    stopTracks()
    setRecording(false)
    setElapsedMs(0)
  }, [clearTick, stopTracks])

  const stop = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (!recorderRef.current) return null
    clearTick()
    const recorder = recorderRef.current
    const mimeType = mimeRef.current

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('MediaRecorder failed'))
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || mimeType }))
      }
      try {
        recorder.stop()
      } catch (err) {
        reject(err instanceof Error ? err : new Error('stop failed'))
      }
    })

    const durationMs = Math.min(maxMs, Date.now() - startedAtRef.current)
    stopTracks()
    recorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    setElapsedMs(0)

    if (blob.size === 0 || durationMs < 300) {
      return null
    }

    const audioBase64 = await blobToBase64(blob)
    return { audioBase64, durationMs, mimeType: blob.type || mimeType }
  }, [clearTick, maxMs, stopTracks])

  stopRef.current = stop

  const start = useCallback(async (): Promise<void> => {
    if (recorderRef.current) return
    mimeRef.current = pickMimeType()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    streamRef.current = stream
    chunksRef.current = []
    const recorder = new MediaRecorder(stream, { mimeType: mimeRef.current })
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.start(250)
    startedAtRef.current = Date.now()
    setElapsedMs(0)
    setRecording(true)
    clearTick()
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      setElapsedMs(elapsed)
      if (elapsed >= maxMs) {
        void stopRef.current?.()
      }
    }, 200)
  }, [clearTick, maxMs])

  useEffect(() => () => cancel(), [cancel])

  return { recording, elapsedMs, start, stop, cancel, maxMs }
}
