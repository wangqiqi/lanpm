import { useCallback, useEffect, useRef, useState } from 'react'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

export type MeetingRecordingPhase = 'idle' | 'recording' | 'saving'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function useMeetingRecording(canRecord: boolean) {
  const [phase, setPhase] = useState<MeetingRecordingPhase>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)

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

  const startRecording = useCallback(async (): Promise<void> => {
    if (!canRecord || phase === 'recording' || phase === 'saving') return

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    streamRef.current = stream
    chunksRef.current = []

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }

    recorder.start(1000)
    startedAtRef.current = Date.now()
    setElapsedSec(0)
    setPhase('recording')
    clearTick()
    tickRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
  }, [canRecord, phase, clearTick])

  const stopAndSave = useCallback(async (): Promise<{ saved: boolean; path?: string }> => {
    if (phase !== 'recording' || !recorderRef.current) {
      return { saved: false }
    }

    setPhase('saving')
    clearTick()

    const recorder = recorderRef.current
    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('MediaRecorder failed'))
      recorder.onstop = () => {
        const type = recorder.mimeType || 'video/webm'
        resolve(new Blob(chunksRef.current, { type }))
      }
      recorder.stop()
    })

    recorderRef.current = null
    stopTracks()

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const suggestedName = `meeting-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`
    const result = await getLanpmApi().meeting.saveRecording({ bytes, suggestedName })

    chunksRef.current = []
    setElapsedSec(0)
    setPhase('idle')
    return result
  }, [phase, clearTick, stopTracks])

  useEffect(() => {
    return () => {
      clearTick()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      recorderRef.current = null
      stopTracks()
    }
  }, [clearTick, stopTracks])

  return {
    phase,
    elapsedSec,
    elapsedLabel: formatElapsed(elapsedSec),
    recording: phase === 'recording',
    saving: phase === 'saving',
    startRecording,
    stopAndSave
  }
}
