"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "knowflow-vistas";
const STORAGE_EVENT = "knowflow-vistas-change";
const EMPTY_SNAPSHOT = "[]";

function parseUnidades(snapshot: string): number[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is number => Number.isInteger(id)))];
  } catch {
    return [];
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? EMPTY_SNAPSHOT;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function useUnidadesLeidas() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return parseUnidades(snapshot);
}

export function setUnidadLeida(unidadId: number, leida: boolean) {
  const unidades = new Set(parseUnidades(getSnapshot()));
  if (leida) unidades.add(unidadId);
  else unidades.delete(unidadId);

  localStorage.setItem(STORAGE_KEY, JSON.stringify([...unidades]));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
