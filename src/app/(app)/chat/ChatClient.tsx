"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  FileText,
  Megaphone,
  Mic,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import Markdown from "@/components/Markdown";
import { paraVoz, useReconocimientoVoz, useSintesisVoz } from "./useVoz";

type Mensaje = {
  rol: "usuario" | "asistente";
  texto: string;
  consultaId?: number;
  fuentes?: { unidadId: number; titulo: string }[];
  resuelta?: boolean;
  rating?: "up" | "down";
  escalada?: boolean;
  error?: boolean;
};

const SUGERENCIAS = [
  "El cliente dice que está muy caro",
  "¿Le ofrezco el S25 o el Ultra?",
  "Me lo está comparando con el iPhone",
  "¿Cómo funciona el canje de su equipo usado?",
];

/** Avatar circular del asistente, junto a cada respuesta. */
function AsistenteAvatar() {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm">
      <Bot size={17} />
    </div>
  );
}

export default function ChatClient({ nombre }: { nombre: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [vozRespuestas, setVozRespuestas] = useState(true);
  const [hablandoIdx, setHablandoIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const vozRef = useRef(vozRespuestas);
  const sintesis = useSintesisVoz();
  const indiceHablando = sintesis.hablando ? hablandoIdx : null;

  useEffect(() => {
    vozRef.current = vozRespuestas;
  }, [vozRespuestas]);

  const reconocimiento = useReconocimientoVoz({
    onInterino: (t) => setInput(t),
    onFinal: (t) => {
      setInput("");
      enviar(t, true);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  // Si la síntesis termina o se detiene, limpia el índice "hablando"
  function leer(idx: number, texto: string) {
    if (indiceHablando === idx && sintesis.hablando) {
      sintesis.detener();
      setHablandoIdx(null);
    } else {
      setHablandoIdx(idx);
      sintesis.hablar(paraVoz(texto));
    }
  }

  async function enviar(texto: string, viaVoz = false) {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    sintesis.detener();
    setInput("");
    setMensajes((m) => [...m, { rol: "usuario", texto: pregunta }]);
    setCargando(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensajes((m) => {
        const idx = m.length;
        if (viaVoz || vozRef.current) {
          setHablandoIdx(idx);
          sintesis.hablar(paraVoz(data.respuesta));
        }
        return [
          ...m,
          {
            rol: "asistente",
            texto: data.respuesta,
            consultaId: data.consultaId,
            fuentes: data.fuentes,
            resuelta: data.resuelta,
          },
        ];
      });
    } catch {
      setMensajes((m) => [
        ...m,
        {
          rol: "asistente",
          texto: "Hubo un problema procesando tu pregunta. Intenta de nuevo.",
          error: true,
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function micClick() {
    if (reconocimiento.escuchando) {
      reconocimiento.detener();
      return;
    }
    sintesis.detener();
    reconocimiento.iniciar();
  }

  async function calificar(idx: number, rating: "up" | "down") {
    const msg = mensajes[idx];
    if (!msg.consultaId || msg.rating) return;
    setMensajes((m) => m.map((x, i) => (i === idx ? { ...x, rating } : x)));
    await fetch(`/api/consultas/${msg.consultaId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  }

  async function escalar(idx: number) {
    const msg = mensajes[idx];
    if (!msg.consultaId || msg.escalada) return;
    setMensajes((m) => m.map((x, i) => (i === idx ? { ...x, escalada: true } : x)));
    await fetch(`/api/consultas/${msg.consultaId}/escalar`, { method: "POST" });
  }

  return (
    <div className="flex h-[calc(100dvh-180px)] flex-col">
      {/* Barra: control de voz de las respuestas */}
      {sintesis.soportada && (
        <div className="flex items-center justify-end pb-2">
          <button
            type="button"
            onClick={() => {
              const nuevo = !vozRespuestas;
              setVozRespuestas(nuevo);
              if (!nuevo) sintesis.detener();
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              vozRespuestas
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
            }`}
            aria-pressed={vozRespuestas}
          >
            {vozRespuestas ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {vozRespuestas ? "Voz activada" : "Voz silenciada"}
          </button>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {mensajes.length === 0 && (
          <div className="flex flex-col items-center pt-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20">
              <Sparkles size={26} />
            </div>
            <h1 className="mt-4 text-lg font-bold text-slate-800">
              Hola, {nombre.split(" ")[0]}
            </h1>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
              Pregúntame con el cliente al lado. Solo respondo con conocimiento
              comercial validado de tu cargo.
            </p>
            {reconocimiento.soportado && (
              <p className="mx-auto mt-2 max-w-xs text-xs text-slate-400">
                También puedes tocar el micrófono y preguntarme hablando.
              </p>
            )}
            <div className="mt-6 w-full space-y-2">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="group flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                >
                  <span className="flex-1">{s}</span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-blue-500 opacity-0 transition-all -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, idx) =>
          m.rol === "usuario" ? (
            <div key={idx} className="animate-message-in flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-blue-600 to-blue-500 px-4 py-2.5 text-sm text-white shadow-sm">
                {m.texto}
              </div>
            </div>
          ) : (
            <div
              key={idx}
              className="animate-message-in flex items-start justify-start gap-2.5"
            >
              <AsistenteAvatar />
              <div
                className={`max-w-[86%] rounded-2xl rounded-tl-md px-4 py-3 text-sm shadow-sm ring-1 ${
                  m.error
                    ? "bg-red-50 text-red-700 ring-red-200"
                    : m.resuelta === false
                      ? "bg-amber-50 text-amber-900 ring-amber-200"
                      : "bg-white text-slate-700 ring-slate-200"
                }`}
              >
                <Markdown>{m.texto}</Markdown>

                {m.fuentes && m.fuentes.length > 0 && (
                  <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2.5">
                    {m.fuentes.map((f) => (
                      <Link
                        key={f.unidadId}
                        href={`/qr/${f.unidadId}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                      >
                        <FileText size={13} className="shrink-0" />
                        <span>Fuente: {f.titulo}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {m.consultaId && (
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    {sintesis.soportada && (
                      <button
                        onClick={() => leer(idx, m.texto)}
                        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                          indiceHablando === idx && sintesis.hablando
                            ? "bg-blue-100 text-blue-600"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        }`}
                        aria-label={
                          indiceHablando === idx && sintesis.hablando
                            ? "Detener lectura"
                            : "Escuchar respuesta"
                        }
                      >
                        {indiceHablando === idx && sintesis.hablando ? (
                          <Square size={15} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => calificar(idx, "up")}
                      disabled={!!m.rating}
                      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                        m.rating === "up"
                          ? "bg-emerald-100 text-emerald-600"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                      }`}
                      aria-label="Me sirvió"
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <button
                      onClick={() => calificar(idx, "down")}
                      disabled={!!m.rating}
                      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                        m.rating === "down"
                          ? "bg-red-100 text-red-600"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                      }`}
                      aria-label="No me sirvió"
                    >
                      <ThumbsDown size={16} />
                    </button>
                    <button
                      onClick={() => escalar(idx)}
                      disabled={m.escalada}
                      className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        m.escalada
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      }`}
                    >
                      {m.escalada ? (
                        <>
                          <Check size={14} /> Escalada
                        </>
                      ) : (
                        <>
                          <Megaphone size={14} /> Escalar a jefe de tienda
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {cargando && (
          <div className="animate-message-in flex items-start gap-2.5">
            <AsistenteAvatar />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200">
              <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
              <span
                className="typing-dot h-2 w-2 rounded-full bg-slate-400"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="typing-dot h-2 w-2 rounded-full bg-slate-400"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="flex items-center gap-2 pt-2"
      >
        {reconocimiento.soportado && (
          <button
            type="button"
            onClick={micClick}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition ${
              reconocimiento.escuchando
                ? "animate-pulse bg-red-500 text-white shadow-md shadow-red-500/30"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            aria-label={reconocimiento.escuchando ? "Detener dictado" : "Preguntar por voz"}
          >
            <Mic size={18} />
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            reconocimiento.escuchando ? "Escuchando…" : "Escribe tu pregunta…"
          }
          className="flex-1 rounded-full border border-slate-300 bg-white px-5 py-3 text-base shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="submit"
          disabled={cargando || !input.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm transition hover:brightness-105 disabled:opacity-40 disabled:hover:brightness-100"
          aria-label="Enviar"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
