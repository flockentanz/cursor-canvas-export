import { useState } from "react";
import { buildTheme, type ThemeKind } from "./tokens";

let themeKind: ThemeKind = "dark";
let stateSeed: Record<string, unknown> = {};

export function setExportTheme(kind: ThemeKind): void {
  themeKind = kind;
}

export function setCanvasStateSeed(seed: Record<string, unknown>): void {
  stateSeed = seed ?? {};
}

export function useHostTheme() {
  return buildTheme(themeKind);
}

export type SetCanvasState<T> = (action: T | ((prev: T) => T)) => void;

export function useCanvasState<T>(key: string, defaultValue: T): [T, SetCanvasState<T>] {
  const initial = (key in stateSeed ? stateSeed[key] : defaultValue) as T;
  return useState(initial);
}

export function useCanvasAction(): (action: unknown) => void {
  return () => {};
}
