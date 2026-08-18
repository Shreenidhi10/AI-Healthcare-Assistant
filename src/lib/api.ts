import axios, { AxiosError } from "axios";

import { computeReadability } from "@/lib/readability";
import type {
  AssistantResult,
  SimplifyRequestPayload,
  TranslateRequestPayload,
} from "@/types";

// ─── Mock imports (tree-shaken in production when mocks are off) ─────
import {
  getMockSimplifyResult,
  getMockTranslateResult,
  MOCK_LATENCY_MIN_MS,
  MOCK_LATENCY_MAX_MS,
} from "@/lib/mockData";

// ─── Configuration ───────────────────────────────────────────────────

/**
 * Toggle mock mode:
 *   • `true`  → returns local mock data, no network requests.
 *   • `false` → uses the real axios client against the backend.
 *
 * Controlled via the VITE_USE_MOCKS env variable.
 * Default: `true` (mocks enabled) when the variable is absent,
 * so frontend devs can work without a running backend.
 *
 * To switch to the real backend later:
 *   1. Set VITE_USE_MOCKS=false in your .env (or remove it entirely
 *      and flip the default below to `false`).
 *   2. Make sure VITE_API_BASE_URL points to the live backend.
 *   3. Restart the dev server.
 */
const USE_MOCKS: boolean =
  (import.meta.env.VITE_USE_MOCKS ?? "true") === "true";

// ─── Axios client (used only when USE_MOCKS is false) ────────────────

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// ─── Error handling ──────────────────────────────────────────────────

export class AssistantApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AssistantApiError";
  }
}

function normalizeError(error: unknown): AssistantApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response) {
      const message =
        axiosError.response.data?.message ??
        "The assistant couldn't process this text. Please try again.";
      return new AssistantApiError(message, axiosError.response.status);
    }
    if (axiosError.request) {
      return new AssistantApiError(
        "Couldn't reach the server. Check your connection and try again."
      );
    }
  }
  return new AssistantApiError("Something unexpected went wrong. Please try again.");
}

// ─── Mock helpers ────────────────────────────────────────────────────

/** Simulates network latency with a random delay. */
function simulateLatency(): Promise<void> {
  const ms =
    MOCK_LATENCY_MIN_MS +
    Math.random() * (MOCK_LATENCY_MAX_MS - MOCK_LATENCY_MIN_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Rewrites medical text at a lower reading level.
 * POST /simplify  { text }  ->  { resultText }
 */
export async function simplifyText(
  payload: SimplifyRequestPayload
): Promise<AssistantResult> {
  // ── Mock path ──────────────────────────────────────────────────
  if (USE_MOCKS) {
    await simulateLatency();
    const { resultText } = getMockSimplifyResult(payload.text);
    return {
      originalText: payload.text,
      resultText,
      mode: "simplify",
      readability: computeReadability(resultText),
    };
  }

  // ── Real path (unchanged) ──────────────────────────────────────
  try {
    const { data } = await apiClient.post<{ resultText: string }>("/simplify", payload);
    return {
      originalText: payload.text,
      resultText: data.resultText,
      mode: "simplify",
      readability: computeReadability(data.resultText),
    };
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * Translates medical text into the target language.
 * POST /translate  { text, targetLanguageCode }  ->  { resultText }
 */
export async function translateText(
  payload: TranslateRequestPayload
): Promise<AssistantResult> {
  // ── Mock path ──────────────────────────────────────────────────
  if (USE_MOCKS) {
    await simulateLatency();
    const { resultText } = getMockTranslateResult(payload.text, payload.targetLanguageCode);
    return {
      originalText: payload.text,
      resultText,
      mode: "translate",
      targetLanguageCode: payload.targetLanguageCode,
      readability: computeReadability(resultText),
    };
  }

  // ── Real path (unchanged) ──────────────────────────────────────
  try {
    const { data } = await apiClient.post<{ resultText: string }>("/translate", payload);
    return {
      originalText: payload.text,
      resultText: data.resultText,
      mode: "translate",
      targetLanguageCode: payload.targetLanguageCode,
      readability: computeReadability(data.resultText),
    };
  } catch (error) {
    throw normalizeError(error);
  }
}
