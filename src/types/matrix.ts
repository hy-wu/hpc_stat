import type { VerificationSource } from "./verification";

/** A model × tool record from data/model-tools.json. */
export interface ModelToolRecord {
  id: string;
  toolId: string;
  toolName: string;
  modelId: string;
  modelName: string;
  modelVendor: string;
  supportStatus: string;
  routeTags?: string[];
  capabilityTags?: string[];
  codingFit?: number | null;
  agentFit?: number | null;
  contextFit?: number | null;
  priceMeter?: string;
  planRequirement?: string;
  latencyNote?: string;
  notes?: string;
  sources?: VerificationSource[];
  checkedAt?: string;
}

/** A model × hardware record from data/model-hardware.json. */
export interface ModelHardwareRecord {
  id: string;
  modelId: string;
  modelName: string;
  modelVendor: string;
  gpuId: string;
  gpuName: string;
  gpuVendor: string;
  deployMode: string;
  precision: string;
  scenario?: string;
  gpuCount?: number;
  minVramGB?: number | null;
  fitScore?: number | null;
  memoryFit?: number | null;
  bandwidthFit?: number | null;
  computeFit?: number | null;
  inputTps?: number | null;
  outputTps?: number | null;
  concurrency?: number | null;
  perfSource?: string;
  throughputNote?: string;
  costNote?: string;
  notes?: string;
  sources?: VerificationSource[];
  checkedAt?: string;
}
