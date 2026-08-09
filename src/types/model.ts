import type { Verification } from "./verification";

export interface PricePoint {
  in: number;
  out: number;
  hit?: number;
}

/** An LLM model record from data/models.json. */
export interface LlmModel {
  id: string;
  name: string;
  vendor: string;
  multimodal?: string;
  copilotMultiplier?: number | null;
  performance?: string | null;
  arenaElo?: number | null;
  arenaEloNote?: string;
  arenaEloSource?: string;
  arenaEloCheckedAt?: string;
  mmlu?: number | null;
  humanEval?: number | null;
  gsm8k?: number | null;
  gpqa?: number | null;
  math?: number | null;
  evals?: Record<string, number>;
  llmStats?: Record<string, number>;
  contextWindow?: string;
  params?: number | null;
  paramsActive?: number | null;
  pricing?: Record<string, PricePoint | undefined>;
  verification?: Verification;
  /** Escape hatch for wide-table dynamic keys. */
  [key: string]: unknown;
}
