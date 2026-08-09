/** A GPU / accelerator / FPGA record from data/gpus.json. */
export interface Gpu {
  id: string;
  model: string;
  vendor: string;
  segment?: string;
  acceleratorType?: string;
  architecture?: string;
  releaseDate?: string | null;
  processNode?: string | null;
  cudaCores?: number | null;
  tensorCores?: number | null;
  rtCores?: number | null;
  computeUnits?: number | null;
  vramGB?: number | null;
  memoryType?: string | null;
  memoryBusBit?: number | null;
  bandwidthGBs?: number | null;
  fp32TFLOPS?: number | null;
  fp16TFLOPS?: number | null;
  bf16TFLOPS?: number | null;
  fp8TFLOPS?: number | null;
  int8TOPS?: number | null;
  powerW?: number | null;
  msrpUSD?: number | null;
  priceUSD?: number | null;
  priceUpdated?: string | null;
  xianyu_cny?: number | null;
  merchant?: string;
  priceSource?: string;
  source?: string;
  available?: boolean;
  notes?: string;
  /** Index signature for spec-details overlay + derived columns. */
  [key: string]: unknown;
}
