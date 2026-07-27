"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hooks de asistencia por voz basados en el Web Speech API (nativo del
 * navegador, sin costo ni API keys):
 *  - useReconocimientoVoz: dictar la consulta (speech-to-text).
 *  - useSintesisVoz: leer la respuesta en voz alta (text-to-speech).
 *
 * Soporte real: muy bueno en Chrome/Edge (incl. Android). En Firefox el
 * reconocimiento no está disponible; en iOS Safari la lectura automática puede
 * requerir un toque del usuario. Por eso todo degrada con gracia.
 */

// --- Tipos mínimos del Web Speech API (no vienen en la lib estándar de TS) ---
interface ResultadoReconocimiento {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: { readonly transcript: string };
}
interface EventoReconocimiento extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: ResultadoReconocimiento;
  };
}
interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoReconocimiento) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type ConstructorReconocimiento = new () => Reconocimiento;

function obtenerConstructor(): ConstructorReconocimiento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Reconocimiento de voz: dictar una consulta. */
export function useReconocimientoVoz(opts: {
  lang?: string;
  onInterino?: (texto: string) => void;
  onFinal?: (texto: string) => void;
}) {
  const { lang = "es-CL", onInterino, onFinal } = opts;
  const soportado = typeof window !== "undefined" && !!obtenerConstructor();
  const [escuchando, setEscuchando] = useState(false);
  const recRef = useRef<Reconocimiento | null>(null);
  const cbRef = useRef({ onInterino, onFinal });
  useEffect(() => {
    cbRef.current = { onInterino, onFinal };
  }, [onInterino, onFinal]);

  useEffect(() => {
    return () => recRef.current?.abort();
  }, []);

  const detener = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const iniciar = useCallback(() => {
    const Ctor = obtenerConstructor();
    if (!Ctor) return;
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setEscuchando(true);
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    rec.onresult = (e) => {
      let interino = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) final += t;
        else interino += t;
      }
      if (interino) cbRef.current.onInterino?.(interino);
      if (final.trim()) cbRef.current.onFinal?.(final.trim());
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* start() lanza si ya estaba activo; se ignora */
    }
  }, [lang]);

  const alternar = useCallback(() => {
    if (escuchando) detener();
    else iniciar();
  }, [escuchando, iniciar, detener]);

  return { soportado, escuchando, iniciar, detener, alternar };
}

/** Síntesis de voz: leer un texto en voz alta. */
export function useSintesisVoz(lang = "es-CL") {
  const soportada = typeof window !== "undefined" && "speechSynthesis" in window;
  const [hablando, setHablando] = useState(false);

  useEffect(() => {
    // Precarga las voces (en algunos navegadores llegan asíncronas)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const detener = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setHablando(false);
    }
  }, []);

  const hablar = useCallback(
    (texto: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (!texto.trim()) return;
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(texto);
      u.lang = lang;
      const voz = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith("es"));
      if (voz) u.voice = voz;
      u.rate = 1;
      u.onstart = () => setHablando(true);
      u.onend = () => setHablando(false);
      u.onerror = () => setHablando(false);
      window.speechSynthesis.speak(u);
    },
    [lang]
  );

  return { soportada, hablando, hablar, detener };
}

/** Limpia el markdown para que la lectura en voz suene natural. */
export function paraVoz(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[>#]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
