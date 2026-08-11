"use client";

import { useEffect, useRef, useState } from "react";

// Botón de voz del simulador — equivalente al botón físico BOOT de la Fase 1
// del firmware (firmware/src/main.cpp: capture_and_send_voice()). Usa la Web
// Speech API del navegador para STT (sólo disponible en Chrome/Edge/Android;
// Safari/iOS no la soporta bien) para no depender de un vendor de STT
// externo en el simulador — el backend "real" (backend/src/api/transcribe.ts)
// deja explícitamente pendiente qué proveedor de STT usar para el ESP32.

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultLike } };
}

export function MicButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) {
    return (
      <div className="rounded-full bg-white/5 px-4 py-2 text-center text-[11px] text-neutral-400">
        Este navegador no soporta reconocimiento de voz. Usá el campo de texto de abajo.
      </div>
    );
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={toggleListening}
      className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg transition active:scale-95 disabled:opacity-40 ${
        listening ? "animate-pulse bg-red-500" : "bg-device-accent"
      }`}
      aria-label={listening ? "Detener grabación" : "Mantené para hablar"}
    >
      {listening ? "●" : "🎙️"}
    </button>
  );
}
