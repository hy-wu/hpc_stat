const fieldDefs = [
  { key: "model", label: "型号", type: "text", visible: true },
  { key: "vendor", label: "厂商", type: "text", visible: true },
  { key: "segment", label: "场景", type: "text", visible: true },
  { key: "acceleratorType", label: "类型", type: "text", visible: true },
  { key: "architecture", label: "架构", type: "text", visible: true },
  { key: "releaseDate", label: "发布", type: "date", visible: true, heatmap: true },
  { key: "vramGB", label: "内存/HBM GB", type: "number", visible: true, heatmap: true },
  { key: "memoryType", label: "内存类型", type: "text", visible: true },
  { key: "bandwidthGBs", label: "带宽 GB/s", type: "number", visible: true, heatmap: true },
  { key: "fp32TFLOPS", label: "FP32 TFLOPS", type: "number", visible: true, heatmap: true },
  { key: "fp16TFLOPS", label: "FP16 TFLOPS", type: "number", visible: true, heatmap: true },
  { key: "bf16TFLOPS", label: "BF16 TFLOPS", type: "number", visible: true, heatmap: true },
  { key: "fp8TFLOPS", label: "FP8 TFLOPS", type: "number", visible: true, heatmap: true },
  { key: "int8TOPS", label: "INT8 TOPS", type: "number", visible: true, heatmap: true },
  { key: "powerW", label: "功耗 W", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "priceUSD", label: "价格 USD", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "xianyu_cny", label: "咸鱼价 ¥", type: "number", visible: true, heatmap: true, inverseHeatmap: true, description: "闲鱼二手参考价（人民币，2026年5月，仅供参考）" },
  { key: "pricePerGb", label: "$/GB", type: "number", visible: true, derived: true, heatmap: true, inverseHeatmap: true },
  { key: "fp16PerWatt", label: "FP16/W", type: "number", visible: true, derived: true, heatmap: true, description: "FP16 TFLOPS 每瓦功耗效率（越高越好）" },
  { key: "fp16PerDollar", label: "FP16/$", type: "number", visible: true, derived: true, heatmap: true, description: "FP16 TFLOPS 每美元性价比（越高越好）" },
  { key: "bwPerDollar", label: "带宽/$", type: "number", visible: true, derived: true, heatmap: true, description: "内存带宽 GB/s 每美元性价比（越高越好）" },
  { key: "fp32PerDollar", label: "FP32/$", type: "number", visible: false, derived: true, heatmap: true, description: "FP32 TFLOPS 每美元性价比（越高越好）" },
  { key: "vramPerDollar", label: "VRAM/$", type: "number", visible: true, derived: true, heatmap: true, description: "显存 GB 每美元性价比（越高越好）" },
  { key: "bwPerWatt", label: "BW/W", type: "number", visible: true, derived: true, heatmap: true, description: "内存带宽 GB/s 每瓦效率（越高越好）" },
  { key: "priceUpdated", label: "价格日期", type: "date", visible: true },
  { key: "cudaCores", label: "CUDA/SP/ALU", type: "number", visible: false },
  { key: "tensorCores", label: "Tensor/XMX/AI", type: "number", visible: false },
  { key: "rtCores", label: "RT Core", type: "number", visible: false },
  { key: "computeUnits", label: "CU/SM/Xe/Tile", type: "number", visible: false },
  { key: "processNode", label: "制程", type: "text", visible: false },
  { key: "memoryBusBit", label: "位宽 bit", type: "number", visible: false, heatmap: true },
  { key: "pcie", label: "PCIe", type: "text", visible: false },
  { key: "nvlinkGBs", label: "互联 GB/s", type: "number", visible: false },
  { key: "msrpUSD", label: "MSRP USD", type: "number", visible: false, heatmap: true, inverseHeatmap: true },
  { key: "availability", label: "获取方式", type: "text", visible: true },
  { key: "softwareStack", label: "软件栈", type: "text", visible: true },
  { key: "merchant", label: "价格商家", type: "text", visible: false },
  { key: "source", label: "来源", type: "url", visible: false },
  { key: "notes", label: "备注", type: "text", visible: false },
];

const specDetailFields = [
  { key: "gpuDie", label: "GPU 芯片", type: "text", visible: true },
  { key: "baseClockMHz", label: "基础频率 MHz", type: "number", visible: true, heatmap: true },
  { key: "boostClockMHz", label: "Boost MHz", type: "number", visible: true, heatmap: true },
  { key: "memoryClockGbps", label: "显存速率 Gbps", type: "number", visible: true, heatmap: true },
  { key: "fp64TFLOPS", label: "FP64 TFLOPS", type: "number", visible: true, heatmap: true },
  { key: "fp64Ratio", label: "FP64 比例", type: "text", visible: true },
  { key: "tf32TFLOPS", label: "TF32 TFLOPS", type: "number", visible: true, heatmap: true },
  { key: "int4TOPS", label: "INT4 TOPS", type: "number", visible: true, heatmap: true },
  { key: "fp4TOPS", label: "FP4 TOPS", type: "number", visible: true, heatmap: true, description: "FP4/MXFP4 张量核心吞吐（Blackwell 及以上支持）" },
  { key: "l1CacheKB", label: "L1/共享 KB", type: "number", visible: true },
  { key: "regFileKB", label: "寄存器 KB", type: "number", visible: false, description: "所有 SM/CU 的寄存器堆合计大小" },
  { key: "l2CacheMB", label: "L2 MB", type: "number", visible: true },
  { key: "l3CacheMB", label: "L3/Infinity MB", type: "number", visible: true },
  { key: "rops", label: "ROPs", type: "number", visible: true },
  { key: "tmus", label: "TMUs", type: "number", visible: true },
  { key: "pixelRateGPixelS", label: "像素填充 GPixel/s", type: "number", visible: true },
  { key: "textureRateGTexelS", label: "纹理填充 GTexel/s", type: "number", visible: true },
  { key: "dieSizeMm2", label: "Die mm²", type: "number", visible: true, heatmap: true },
  { key: "transistorsBillion", label: "晶体管 B", type: "number", visible: true, heatmap: true },
  {
    key: "fp32OpsPerClock",
    label: "FP32/周期",
    type: "number",
    visible: true,
    description: "架构级每周期 FP32 吞吐口径，跨厂商比较时需要看定义",
  },
  {
    key: "ipcNotes",
    label: "IPC/周期口径",
    type: "text",
    visible: true,
    description: "记录 IPC、每 SM/CU/Xe 每周期吞吐或微架构测试口径",
  },
  { key: "computeCapability", label: "计算能力/API", type: "text", visible: true },
  { key: "sparsitySupport", label: "稀疏加速", type: "text", visible: true },
  {
    key: "llamaCppTgTokS",
    label: "llama.cpp tg t/s",
    type: "number",
    visible: false,
    heatmap: true,
    description: "llama.cpp Llama 3 8B Q4_K_M 单用户 token 生成速度（t/s），社区实测数据",
  },
];

fieldDefs.splice(
  fieldDefs.findIndex((field) => field.key === "priceUSD"),
  0,
  ...specDetailFields,
);

const fieldOrder = [
  "model",
  "vendor",
  "segment",
  "acceleratorType",
  "architecture",
  "gpuDie",
  "releaseDate",
  "processNode",
  "dieSizeMm2",
  "transistorsBillion",
  "cudaCores",
  "computeUnits",
  "tensorCores",
  "rtCores",
  "baseClockMHz",
  "boostClockMHz",
  "fp32OpsPerClock",
  "ipcNotes",
  "powerW",
  "vramGB",
  "memoryType",
  "memoryBusBit",
  "memoryClockGbps",
  "bandwidthGBs",
  "l1CacheKB",
  "l2CacheMB",
  "l3CacheMB",
  "regFileKB",
  "pcie",
  "nvlinkGBs",
  "computeCapability",
  "softwareStack",
  "sparsitySupport",
  "fp64TFLOPS",
  "fp64Ratio",
  "fp32TFLOPS",
  "fp16TFLOPS",
  "bf16TFLOPS",
  "tf32TFLOPS",
  "fp8TFLOPS",
  "int8TOPS",
  "int4TOPS",
  "fp4TOPS",
  "fp16PerWatt",
  "fp16PerDollar",
  "bwPerDollar",
  "fp32PerDollar",
  "vramPerDollar",
  "bwPerWatt",
  "llamaCppTgTokS",
  "rops",
  "tmus",
  "pixelRateGPixelS",
  "textureRateGTexelS",
  "msrpUSD",
  "priceUSD",
  "xianyu_cny",
  "pricePerGb",
  "priceUpdated",
  "availability",
  "merchant",
  "source",
  "notes",
];
const fieldRank = new Map(fieldOrder.map((key, index) => [key, index]));
fieldDefs.sort((a, b) => (fieldRank.get(a.key) ?? 999) - (fieldRank.get(b.key) ?? 999));

const defaultVisibleKeys = new Set([
  "model", "vendor", "segment", "acceleratorType", "architecture", "releaseDate",
  "processNode", "vramGB", "memoryType", "memoryBusBit", "bandwidthGBs",
  "fp32TFLOPS", "fp16TFLOPS", "bf16TFLOPS", "fp8TFLOPS", "int8TOPS",
  "powerW", "priceUSD", "xianyu_cny", "pricePerGb", "fp16PerWatt", "fp16PerDollar", "bwPerWatt", "vramPerDollar",
  "priceUpdated", "availability", "softwareStack",
]);
fieldDefs.forEach((field) => {
  field.visible = defaultVisibleKeys.has(field.key);
});

const seedGpus = [
  {
    id: "nvidia-b200-sxm",
    model: "NVIDIA B200 SXM",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Blackwell",
    releaseDate: "2024-03-18",
    processNode: "TSMC 4NP",
    cudaCores: 208000,
    tensorCores: null,
    rtCores: null,
    computeUnits: null,
    vramGB: 192,
    memoryType: "HBM3e",
    memoryBusBit: 8192,
    bandwidthGBs: 8000,
    fp32TFLOPS: null,
    fp16TFLOPS: 2250,
    bf16TFLOPS: 2250,
    fp8TFLOPS: 4500,
    int8TOPS: 4500,
    powerW: 1000,
    pcie: "SXM",
    nvlinkGBs: 1800,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    merchant: "",
    source: "https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/",
    notes: "AI accelerator, values vary by platform.",
  },
  {
    id: "google-tpu-v6e",
    model: "Google Cloud TPU v6e (Trillium) chip",
    vendor: "Google",
    segment: "Cloud Accelerator",
    acceleratorType: "TPU",
    architecture: "TPU v6e / Trillium",
    gpuDie: "TPU v6e",
    releaseDate: "2024-12-11",
    processNode: null,
    cudaCores: null,
    tensorCores: 1,
    rtCores: null,
    computeUnits: 1,
    vramGB: 32,
    memoryType: "HBM",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 1638,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: 918,
    fp8TFLOPS: null,
    int8TOPS: 1836,
    powerW: null,
    pcie: "Cloud TPU slice",
    nvlinkGBs: 800,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    availability: "Google Cloud only",
    softwareStack: "JAX / TensorFlow / PyTorch/XLA",
    merchant: "",
    source: "https://cloud.google.com/tpu/docs/v6e",
    notes: "Per-chip public spec; optimized for transformer training/fine-tuning/serving. Price depends on region and reservation.",
  },
  {
    id: "google-tpu-v5p",
    model: "Google Cloud TPU v5p chip",
    vendor: "Google",
    segment: "Cloud Accelerator",
    acceleratorType: "TPU",
    architecture: "TPU v5p",
    gpuDie: "TPU v5p",
    releaseDate: "2023-12-06",
    processNode: null,
    cudaCores: null,
    tensorCores: 2,
    rtCores: null,
    computeUnits: 1,
    vramGB: 95,
    memoryType: "HBM",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 2575,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: 459,
    fp8TFLOPS: 459,
    int8TOPS: null,
    powerW: null,
    pcie: "Cloud TPU slice",
    nvlinkGBs: 1200,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    availability: "Google Cloud only",
    softwareStack: "JAX / TensorFlow / PyTorch/XLA",
    merchant: "",
    source: "https://cloud.google.com/tpu/docs/v5p",
    notes: "Per-chip public spec; 3D torus Pod architecture with 95GB HBM per chip.",
  },
  {
    id: "google-tpu-v5e",
    model: "Google Cloud TPU v5e chip",
    vendor: "Google",
    segment: "Cloud Accelerator",
    acceleratorType: "TPU",
    architecture: "TPU v5e",
    gpuDie: "TPU v5e",
    releaseDate: "2023-08-29",
    processNode: null,
    cudaCores: null,
    tensorCores: 1,
    rtCores: null,
    computeUnits: 1,
    vramGB: 16,
    memoryType: "HBM",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 800,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: 197,
    fp8TFLOPS: null,
    int8TOPS: 393,
    powerW: null,
    pcie: "Cloud TPU slice",
    nvlinkGBs: 400,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    availability: "Google Cloud only",
    softwareStack: "JAX / TensorFlow / PyTorch/XLA",
    merchant: "",
    source: "https://cloud.google.com/tpu/docs/v5e",
    notes: "Cost-oriented TPU generation for training and serving; per-chip public spec.",
  },
  {
    id: "google-tpu-v4",
    model: "Google Cloud TPU v4 chip",
    vendor: "Google",
    segment: "Cloud Accelerator",
    acceleratorType: "TPU",
    architecture: "TPU v4",
    gpuDie: "TPU v4",
    releaseDate: "2021-05-18",
    processNode: null,
    cudaCores: null,
    tensorCores: 2,
    rtCores: null,
    computeUnits: 1,
    vramGB: 32,
    memoryType: "HBM2",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 1200,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: 275,
    fp8TFLOPS: null,
    int8TOPS: 275,
    powerW: 170,
    pcie: "Cloud TPU slice",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    availability: "Google Cloud only",
    softwareStack: "JAX / TensorFlow / PyTorch/XLA",
    merchant: "",
    source: "https://cloud.google.com/tpu/docs/v4",
    notes: "Per-chip public spec; power is Google measured mean (min/mean/max 90/170/192W).",
  },
  {
    id: "nvidia-h200-sxm",
    model: "NVIDIA H200 SXM",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Hopper",
    releaseDate: "2023-11-13",
    processNode: "TSMC 4N",
    cudaCores: 16896,
    tensorCores: 528,
    rtCores: null,
    computeUnits: 132,
    vramGB: 141,
    memoryType: "HBM3e",
    memoryBusBit: 6144,
    bandwidthGBs: 4800,
    fp32TFLOPS: 67,
    fp16TFLOPS: 1979,
    bf16TFLOPS: 1979,
    fp8TFLOPS: 3958,
    int8TOPS: 3958,
    powerW: 700,
    pcie: "SXM",
    nvlinkGBs: 900,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    merchant: "",
    source: "https://www.nvidia.com/en-us/data-center/h200/",
    notes: "HBM3e capacity makes it useful for large model inference.",
  },
  {
    id: "nvidia-h100-sxm-80gb",
    model: "NVIDIA H100 SXM 80GB",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Hopper",
    releaseDate: "2022-03-22",
    processNode: "TSMC 4N",
    cudaCores: 16896,
    tensorCores: 528,
    rtCores: null,
    computeUnits: 132,
    vramGB: 80,
    memoryType: "HBM3",
    memoryBusBit: 5120,
    bandwidthGBs: 3350,
    fp32TFLOPS: 67,
    fp16TFLOPS: 1979,
    bf16TFLOPS: 1979,
    fp8TFLOPS: 3958,
    int8TOPS: 3958,
    powerW: 700,
    pcie: "SXM",
    nvlinkGBs: 900,
    msrpUSD: null,
    priceUSD: 28500,
    priceUpdated: "2026-05-01",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/data-center/h100/",
    notes: "Common training baseline; market price changes sharply.",
  },
  {
    id: "nvidia-a100-sxm4-80gb",
    model: "NVIDIA A100 SXM4 80GB",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Ampere",
    releaseDate: "2020-05-14",
    processNode: "TSMC 7N",
    cudaCores: 6912,
    tensorCores: 432,
    rtCores: null,
    computeUnits: 108,
    vramGB: 80,
    memoryType: "HBM2e",
    memoryBusBit: 5120,
    bandwidthGBs: 1935,
    fp32TFLOPS: 19.5,
    fp16TFLOPS: 312,
    bf16TFLOPS: 312,
    fp8TFLOPS: null,
    int8TOPS: 624,
    powerW: 400,
    pcie: "SXM4",
    nvlinkGBs: 600,
    msrpUSD: null,
    priceUSD: 14500,
    priceUpdated: "2026-05-10",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/data-center/a100/",
    notes: "Still a workhorse for training and inference.",
  },
  {
    id: "nvidia-v100-sxm2-32gb",
    model: "NVIDIA Tesla V100 SXM2 32GB",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Volta",
    releaseDate: "2018-03-27",
    processNode: "TSMC 12N",
    cudaCores: 5120,
    tensorCores: 640,
    rtCores: null,
    computeUnits: 80,
    vramGB: 32,
    memoryType: "HBM2",
    memoryBusBit: 4096,
    bandwidthGBs: 900,
    fp32TFLOPS: 15.7,
    fp16TFLOPS: 125,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 62,
    powerW: 300,
    pcie: "SXM2",
    nvlinkGBs: 300,
    msrpUSD: null,
    priceUSD: 3200,
    priceUpdated: "2026-05-01",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/data-center/v100/",
    notes: "Volta; first Tensor Core GPU; widely used as DNN training baseline.",
  },
  {
    id: "nvidia-v100-pcie-16gb",
    model: "NVIDIA Tesla V100 PCIe 16GB",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Volta",
    releaseDate: "2017-06-21",
    processNode: "TSMC 12N",
    cudaCores: 5120,
    tensorCores: 640,
    rtCores: null,
    computeUnits: 80,
    vramGB: 16,
    memoryType: "HBM2",
    memoryBusBit: 4096,
    bandwidthGBs: 900,
    fp32TFLOPS: 14.0,
    fp16TFLOPS: 112,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 56,
    powerW: 250,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: 200,
    msrpUSD: null,
    priceUSD: 2100,
    priceUpdated: "2026-05-01",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/data-center/v100/",
    notes: "PCIe form factor; slightly lower clocks than SXM2.",
  },
  {
    id: "nvidia-p100-pcie-16gb",
    model: "NVIDIA Tesla P100 PCIe 16GB",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Pascal",
    releaseDate: "2016-06-20",
    processNode: "TSMC 16N",
    cudaCores: 3584,
    tensorCores: null,
    rtCores: null,
    computeUnits: 56,
    vramGB: 16,
    memoryType: "HBM2",
    memoryBusBit: 4096,
    bandwidthGBs: 732,
    fp32TFLOPS: 10.6,
    fp16TFLOPS: 21.2,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 250,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: 160,
    msrpUSD: null,
    priceUSD: 900,
    priceUpdated: "2026-05-01",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/data-center/tesla-p100/",
    notes: "Pre-Tensor Core data center GPU; excellent FP64 ratio for HPC.",
  },
  {
    id: "nvidia-l40s",
    model: "NVIDIA L40S",
    vendor: "NVIDIA",
    segment: "Data Center",
    architecture: "Ada Lovelace",
    releaseDate: "2023-08-08",
    processNode: "TSMC 4N",
    cudaCores: 18176,
    tensorCores: 568,
    rtCores: 142,
    computeUnits: 142,
    vramGB: 48,
    memoryType: "GDDR6",
    memoryBusBit: 384,
    bandwidthGBs: 864,
    fp32TFLOPS: 91.6,
    fp16TFLOPS: 1466,
    bf16TFLOPS: 1466,
    fp8TFLOPS: 2932,
    int8TOPS: 2932,
    powerW: 350,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 11500,
    priceUpdated: "2026-05-05",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/data-center/l40s/",
    notes: "Multimodal AI, Omniverse, and graphics workloads.",
  },
  {
    id: "amd-instinct-mi300x",
    model: "AMD Instinct MI300X",
    vendor: "AMD",
    segment: "Data Center",
    architecture: "CDNA 3",
    releaseDate: "2023-12-06",
    processNode: "5 nm / 6 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 304,
    vramGB: 192,
    memoryType: "HBM3",
    memoryBusBit: 8192,
    bandwidthGBs: 5300,
    fp32TFLOPS: 163.4,
    fp16TFLOPS: 1307,
    bf16TFLOPS: 1307,
    fp8TFLOPS: 2615,
    int8TOPS: 2615,
    powerW: 750,
    pcie: "OAM",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 17500,
    priceUpdated: "2026-04-20",
    merchant: "manual",
    source: "https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html",
    notes: "Large HBM memory for dense inference workloads.",
  },
  {
    id: "huawei-ascend-910b",
    model: "Huawei Ascend 910B",
    vendor: "Huawei",
    segment: "Data Center",
    acceleratorType: "NPU",
    architecture: "Da Vinci / Ascend 910B",
    gpuDie: "Ascend 910B",
    releaseDate: "2023-08-01",
    processNode: "7 nm (est.)",
    cudaCores: null,
    tensorCores: 32,
    rtCores: null,
    computeUnits: 1,
    vramGB: 64,
    memoryType: "HBM2e",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 3200,
    fp32TFLOPS: null,
    fp16TFLOPS: 320,
    bf16TFLOPS: 320,
    fp8TFLOPS: null,
    int8TOPS: 640,
    powerW: 310,
    pcie: "Atlas server / PCIe module",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    availability: "OEM/server channel",
    softwareStack: "CANN / MindSpore / PyTorch Ascend",
    merchant: "channel",
    source: "https://www.hiascend.com/en/",
    notes: "Public 910B figures vary by card/server SKU; this row uses common 910B-class public estimates for planning.",
  },
  {
    id: "huawei-ascend-310p3",
    model: "Huawei Ascend 310P3",
    vendor: "Huawei",
    segment: "Inference",
    acceleratorType: "NPU",
    architecture: "Da Vinci / Ascend 310P",
    gpuDie: "Ascend 310P3",
    releaseDate: "2020-09-23",
    processNode: "12 nm",
    cudaCores: null,
    tensorCores: 32,
    rtCores: null,
    computeUnits: 1,
    vramGB: 24,
    memoryType: "LPDDR4X",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 204.8,
    fp32TFLOPS: null,
    fp16TFLOPS: 22,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 88,
    powerW: 75,
    pcie: "PCIe 3.0 x8",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    availability: "PCIe card / OEM channel",
    softwareStack: "CANN / MindSpore / PyTorch Ascend",
    merchant: "channel",
    source: "https://www.hiascend.com/en/",
    notes: "Inference-focused Ascend card; useful for CANN/MindIE deployment comparisons.",
  },
  {
    id: "nvidia-rtx-6000-ada",
    model: "NVIDIA RTX 6000 Ada",
    vendor: "NVIDIA",
    segment: "Workstation",
    architecture: "Ada Lovelace",
    releaseDate: "2022-09-20",
    processNode: "TSMC 4N",
    cudaCores: 18176,
    tensorCores: 568,
    rtCores: 142,
    computeUnits: 142,
    vramGB: 48,
    memoryType: "GDDR6 ECC",
    memoryBusBit: 384,
    bandwidthGBs: 960,
    fp32TFLOPS: 91.1,
    fp16TFLOPS: 1457,
    bf16TFLOPS: 1457,
    fp8TFLOPS: null,
    int8TOPS: 1457,
    powerW: 300,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 6800,
    priceUSD: 6400,
    priceUpdated: "2026-04-28",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/design-visualization/rtx-6000/",
    notes: "48GB ECC, compact power envelope for workstations.",
  },
  {
    id: "nvidia-a40",
    model: "NVIDIA A40",
    vendor: "NVIDIA",
    segment: "Workstation",
    architecture: "Ampere",
    releaseDate: "2020-10-05",
    processNode: "Samsung 8N",
    cudaCores: 10752,
    tensorCores: 336,
    rtCores: 84,
    computeUnits: 84,
    vramGB: 48,
    memoryType: "GDDR6 ECC",
    memoryBusBit: 384,
    bandwidthGBs: 696,
    fp32TFLOPS: 37.4,
    fp16TFLOPS: 149.7,
    bf16TFLOPS: 149.7,
    fp8TFLOPS: null,
    int8TOPS: 299.3,
    powerW: 300,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 3800,
    priceUpdated: "2026-05-01",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/data-center/a40/",
    notes: "48GB ECC alternative to A100 for dense inference at lower cost.",
  },
  {
    id: "amd-radeon-pro-w7900",
    model: "AMD Radeon Pro W7900",
    vendor: "AMD",
    segment: "Workstation",
    architecture: "RDNA 3",
    releaseDate: "2023-06-13",
    processNode: "TSMC 5N / 6N",
    cudaCores: 6144,
    tensorCores: null,
    rtCores: 96,
    computeUnits: 96,
    vramGB: 48,
    memoryType: "GDDR6 ECC",
    memoryBusBit: 384,
    bandwidthGBs: 864,
    fp32TFLOPS: 61.3,
    fp16TFLOPS: 122.6,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 295,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 3999,
    priceUSD: 3200,
    priceUpdated: "2026-05-01",
    merchant: "manual",
    source: "https://www.amd.com/en/products/graphics/workstation/radeon-pro/w7900.html",
    notes: "48GB ECC VRAM on RDNA 3; strong for dense local inference.",
  },
  {
    id: "amd-radeon-pro-duo",
    model: "AMD Radeon Pro Duo",
    vendor: "AMD",
    segment: "Workstation",
    architecture: "GCN 3 (Fiji dual)",
    releaseDate: "2016-04-26",
    processNode: "TSMC 28nm",
    cudaCores: 8192,
    tensorCores: null,
    rtCores: null,
    computeUnits: 128,
    vramGB: 8,
    memoryType: "HBM1 (dual)",
    memoryBusBit: 4096,
    bandwidthGBs: 1024,
    fp32TFLOPS: 8.19,
    fp16TFLOPS: 16.4,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 350,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: null,
    msrpUSD: 1499,
    priceUSD: 150,
    priceUpdated: "2026-05-01",
    merchant: "used",
    source: "https://www.amd.com/en/products/graphics/workstation/radeon-pro-duo.html",
    notes: "Dual Fiji XT dies; each 4096 SPs + 4GB HBM1. mGPU workload dependent.",
  },
  {
    id: "amd-alveo-v80",
    model: "AMD Alveo V80",
    vendor: "AMD",
    segment: "FPGA",
    acceleratorType: "FPGA",
    architecture: "Versal HBM",
    gpuDie: "Versal HBM",
    releaseDate: "2024-06-01",
    processNode: "TSMC 7N / 6N",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: null,
    vramGB: 32,
    memoryType: "HBM2e + DDR4",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 820,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: null,
    pcie: "PCIe 4.0/5.0",
    nvlinkGBs: 100,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    availability: "PCIe card / OEM channel",
    softwareStack: "Vivado / Vitis",
    merchant: "",
    source: "https://www.amd.com/en/products/accelerators/alveo/v80.html",
    notes: "FPGA fabric plus HBM; throughput is workload-specific, so FLOPS fields are intentionally blank.",
  },
  {
    id: "amd-alveo-u55c",
    model: "AMD Alveo U55C",
    vendor: "AMD",
    segment: "FPGA",
    acceleratorType: "FPGA",
    architecture: "Alveo / UltraScale+ HBM",
    gpuDie: "XCU55C",
    releaseDate: "2021-11-01",
    processNode: "TSMC 16N",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: null,
    vramGB: 16,
    memoryType: "HBM2",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 460,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 150,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 4500,
    priceUpdated: "2026-05-18",
    availability: "PCIe card / used market",
    softwareStack: "Vivado / Vitis",
    merchant: "used",
    source: "https://www.amd.com/en/products/accelerators/alveo/u55c.html",
    notes: "Memory-bound and custom-pipeline workloads; compare by HBM bandwidth/power rather than generic FLOPS.",
  },
  {
    id: "intel-stratix-10-nx",
    model: "Intel Stratix 10 NX PCIe",
    vendor: "Intel",
    segment: "FPGA",
    acceleratorType: "FPGA",
    architecture: "Stratix 10 NX",
    gpuDie: "Stratix 10 NX",
    releaseDate: "2020-06-18",
    processNode: "Intel 14 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: null,
    vramGB: 16,
    memoryType: "HBM2",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 512,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 143,
    powerW: 225,
    pcie: "PCIe card",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    availability: "PCIe card / OEM channel",
    softwareStack: "Quartus / oneAPI FPGA",
    merchant: "channel",
    source: "https://www.intel.com/content/www/us/en/products/details/fpga/stratix/10/nx.html",
    notes: "AI Tensor Block FPGA; TOPS depends on bit width and kernel mapping.",
  },
  {
    id: "nvidia-rtx-5090",
    model: "NVIDIA GeForce RTX 5090",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Blackwell",
    releaseDate: "2025-01-30",
    processNode: "TSMC 4NP",
    cudaCores: 21760,
    tensorCores: 680,
    rtCores: 170,
    computeUnits: 170,
    vramGB: 32,
    memoryType: "GDDR7",
    memoryBusBit: 512,
    bandwidthGBs: 1792,
    fp32TFLOPS: 104.8,
    fp16TFLOPS: 1676,
    bf16TFLOPS: 1676,
    fp8TFLOPS: 3352,
    int8TOPS: 3352,
    powerW: 575,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 1999,
    priceUSD: 2450,
    priceUpdated: "2026-05-08",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/",
    notes: "Consumer flagship; watch cooling and PSU requirements.",
  },
  {
    id: "nvidia-rtx-5080",
    model: "NVIDIA GeForce RTX 5080",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Blackwell",
    releaseDate: "2025-01-30",
    processNode: "TSMC 4NP",
    cudaCores: 10752,
    tensorCores: 336,
    rtCores: 84,
    computeUnits: 84,
    vramGB: 16,
    memoryType: "GDDR7",
    memoryBusBit: 256,
    bandwidthGBs: 1024,
    fp32TFLOPS: 64.7,
    fp16TFLOPS: 1035,
    bf16TFLOPS: 1035,
    fp8TFLOPS: 2070,
    int8TOPS: 2070,
    powerW: 400,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 999,
    priceUSD: 1150,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/",
    notes: "High-end Blackwell desktop card.",
  },
  {
    id: "nvidia-rtx-5070-ti",
    model: "NVIDIA GeForce RTX 5070 Ti",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Blackwell",
    releaseDate: "2025-02-20",
    processNode: "TSMC 4NP",
    cudaCores: 8960,
    tensorCores: 280,
    rtCores: 70,
    computeUnits: 70,
    vramGB: 16,
    memoryType: "GDDR7",
    memoryBusBit: 256,
    bandwidthGBs: 896,
    fp32TFLOPS: 44.1,
    fp16TFLOPS: 706,
    bf16TFLOPS: 706,
    fp8TFLOPS: 1411,
    int8TOPS: 1411,
    powerW: 300,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 749,
    priceUSD: 870,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-ti/",
    notes: "Blackwell mid-high; strong BW for local inference.",
  },
  {
    id: "nvidia-rtx-5070",
    model: "NVIDIA GeForce RTX 5070",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Blackwell",
    releaseDate: "2025-03-05",
    processNode: "TSMC 4NP",
    cudaCores: 6144,
    tensorCores: 192,
    rtCores: 48,
    computeUnits: 48,
    vramGB: 12,
    memoryType: "GDDR7",
    memoryBusBit: 192,
    bandwidthGBs: 672,
    fp32TFLOPS: 30.8,
    fp16TFLOPS: 492,
    bf16TFLOPS: 492,
    fp8TFLOPS: 985,
    int8TOPS: 985,
    powerW: 250,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 549,
    priceUSD: 620,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070/",
    notes: "Blackwell mid-range; good FP8 for quantized LLMs.",
  },
  {
    id: "nvidia-rtx-4090",
    model: "NVIDIA GeForce RTX 4090",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ada Lovelace",
    releaseDate: "2022-10-12",
    processNode: "TSMC 4N",
    cudaCores: 16384,
    tensorCores: 512,
    rtCores: 128,
    computeUnits: 128,
    vramGB: 24,
    memoryType: "GDDR6X",
    memoryBusBit: 384,
    bandwidthGBs: 1008,
    fp32TFLOPS: 82.6,
    fp16TFLOPS: 1321,
    bf16TFLOPS: 1321,
    fp8TFLOPS: null,
    int8TOPS: 1321,
    powerW: 450,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 1599,
    priceUSD: 1850,
    priceUpdated: "2026-05-08",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/",
    notes: "Still strong for local inference with 24GB VRAM.",
  },
  {
    id: "nvidia-rtx-4080-super",
    model: "NVIDIA GeForce RTX 4080 SUPER",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ada Lovelace",
    releaseDate: "2024-01-31",
    processNode: "TSMC 4N",
    cudaCores: 10240,
    tensorCores: 320,
    rtCores: 80,
    computeUnits: 80,
    vramGB: 16,
    memoryType: "GDDR6X",
    memoryBusBit: 256,
    bandwidthGBs: 736,
    fp32TFLOPS: 52.2,
    fp16TFLOPS: 836,
    bf16TFLOPS: 836,
    fp8TFLOPS: null,
    int8TOPS: 836,
    powerW: 320,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 999,
    priceUSD: 1090,
    priceUpdated: "2026-05-08",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4080-family/",
    notes: "High gaming performance; VRAM limits larger LLMs.",
  },
  {
    id: "nvidia-rtx-4070-ti-super",
    model: "NVIDIA GeForce RTX 4070 Ti SUPER",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ada Lovelace",
    releaseDate: "2024-01-24",
    processNode: "TSMC 4N",
    cudaCores: 8448,
    tensorCores: 264,
    rtCores: 66,
    computeUnits: 66,
    vramGB: 16,
    memoryType: "GDDR6X",
    memoryBusBit: 256,
    bandwidthGBs: 672,
    fp32TFLOPS: 44.1,
    fp16TFLOPS: 706,
    bf16TFLOPS: 706,
    fp8TFLOPS: null,
    int8TOPS: 706,
    powerW: 285,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 799,
    priceUSD: 850,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/",
    notes: "Good 16GB entry point for AI.",
  },
  {
    id: "nvidia-rtx-4070-super",
    model: "NVIDIA GeForce RTX 4070 SUPER",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ada Lovelace",
    releaseDate: "2024-01-17",
    processNode: "TSMC 4N",
    cudaCores: 7168,
    tensorCores: 224,
    rtCores: 56,
    computeUnits: 56,
    vramGB: 12,
    memoryType: "GDDR6X",
    memoryBusBit: 192,
    bandwidthGBs: 504,
    fp32TFLOPS: 35.5,
    fp16TFLOPS: 568,
    bf16TFLOPS: 568,
    fp8TFLOPS: null,
    int8TOPS: 568,
    powerW: 220,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 599,
    priceUSD: 620,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/",
    notes: "Excellent efficiency.",
  },
  {
    id: "nvidia-rtx-4060-ti-16gb",
    model: "NVIDIA GeForce RTX 4060 Ti 16GB",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ada Lovelace",
    releaseDate: "2023-07-18",
    processNode: "TSMC 4N",
    cudaCores: 4352,
    tensorCores: 136,
    rtCores: 34,
    computeUnits: 34,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 128,
    bandwidthGBs: 288,
    fp32TFLOPS: 22.1,
    fp16TFLOPS: 353,
    bf16TFLOPS: 353,
    fp8TFLOPS: null,
    int8TOPS: 353,
    powerW: 165,
    pcie: "PCIe 4.0 x8",
    nvlinkGBs: null,
    msrpUSD: 499,
    priceUSD: 480,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/",
    notes: "16GB VRAM on a budget, but limited bandwidth.",
  },
  {
    id: "nvidia-rtx-3090-ti",
    model: "NVIDIA GeForce RTX 3090 Ti",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ampere",
    releaseDate: "2022-03-29",
    processNode: "Samsung 8N",
    cudaCores: 10752,
    tensorCores: 336,
    rtCores: 84,
    computeUnits: 84,
    vramGB: 24,
    memoryType: "GDDR6X",
    memoryBusBit: 384,
    bandwidthGBs: 1008,
    fp32TFLOPS: 40.0,
    fp16TFLOPS: 160,
    bf16TFLOPS: 160,
    fp8TFLOPS: null,
    int8TOPS: 320,
    powerW: 450,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: 112.5,
    msrpUSD: 1999,
    priceUSD: 950,
    priceUpdated: "2026-05-12",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3090-3090ti/",
    notes: "Peak Ampere consumer card, high power draw.",
  },
  {
    id: "nvidia-rtx-3090",
    model: "NVIDIA GeForce RTX 3090",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ampere",
    releaseDate: "2020-09-24",
    processNode: "Samsung 8N",
    cudaCores: 10496,
    tensorCores: 328,
    rtCores: 82,
    computeUnits: 82,
    vramGB: 24,
    memoryType: "GDDR6X",
    memoryBusBit: 384,
    bandwidthGBs: 936,
    fp32TFLOPS: 35.6,
    fp16TFLOPS: 142,
    bf16TFLOPS: 142,
    fp8TFLOPS: null,
    int8TOPS: 284,
    powerW: 350,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: 112.5,
    msrpUSD: 1499,
    priceUSD: 780,
    priceUpdated: "2026-05-08",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3090/",
    notes: "Used-market value option; has NVLink on some cards.",
  },
  {
    id: "nvidia-rtx-3080-10gb",
    model: "NVIDIA GeForce RTX 3080 10GB",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ampere",
    releaseDate: "2020-09-17",
    processNode: "Samsung 8N",
    cudaCores: 8704,
    tensorCores: 272,
    rtCores: 68,
    computeUnits: 68,
    vramGB: 10,
    memoryType: "GDDR6X",
    memoryBusBit: 320,
    bandwidthGBs: 760,
    fp32TFLOPS: 29.8,
    fp16TFLOPS: 119.1,
    bf16TFLOPS: 119.1,
    fp8TFLOPS: null,
    int8TOPS: 238.2,
    powerW: 320,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 699,
    priceUSD: 420,
    priceUpdated: "2026-05-12",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3080/",
    notes: "Popular second-hand option; 10GB VRAM limits larger models.",
  },
  {
    id: "nvidia-rtx-3060-12gb",
    model: "NVIDIA GeForce RTX 3060 12GB",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Ampere",
    releaseDate: "2021-02-25",
    processNode: "Samsung 8N",
    cudaCores: 3584,
    tensorCores: 112,
    rtCores: 28,
    computeUnits: 28,
    vramGB: 12,
    memoryType: "GDDR6",
    memoryBusBit: 192,
    bandwidthGBs: 360,
    fp32TFLOPS: 12.7,
    fp16TFLOPS: 51,
    bf16TFLOPS: 51,
    fp8TFLOPS: null,
    int8TOPS: 102,
    powerW: 170,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 329,
    priceUSD: 280,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-family/",
    notes: "Entry level with decent VRAM for small models.",
  },
  {
    id: "nvidia-cmp-40hx",
    model: "NVIDIA CMP 40HX",
    vendor: "NVIDIA",
    segment: "Mining",
    architecture: "Ampere",
    releaseDate: "2021-05-18",
    processNode: "Samsung 8N",
    cudaCores: 3584,
    tensorCores: 112,
    rtCores: null,
    computeUnits: 28,
    vramGB: 8,
    memoryType: "GDDR6",
    memoryBusBit: 192,
    bandwidthGBs: 336,
    fp32TFLOPS: 12.5,
    fp16TFLOPS: 50,
    bf16TFLOPS: 50,
    fp8TFLOPS: null,
    int8TOPS: 100,
    powerW: 185,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/cmp/",
    notes: "专用挖矿卡（GA106）；无显示输出；矿难后大量流入二手市场；Tensor Core 支持推理。",
  },
  {
    id: "nvidia-p106-100",
    model: "NVIDIA P106-100",
    vendor: "NVIDIA",
    segment: "Mining",
    architecture: "Pascal",
    releaseDate: "2017-06-01",
    processNode: "TSMC 16nm FinFET+",
    cudaCores: 1280,
    tensorCores: null,
    rtCores: null,
    computeUnits: 10,
    vramGB: 6,
    memoryType: "GDDR5",
    memoryBusBit: 192,
    bandwidthGBs: 192,
    fp32TFLOPS: 4.37,
    fp16TFLOPS: 4.37,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 90,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    merchant: "used",
    source: "https://www.techpowerup.com/gpu-specs/p106-100.c2979",
    notes: "Pascal 挖矿卡（GP106）；无显示输出；无 Tensor Core；咸鱼价格极低。",
  },
  {
    id: "amd-rx-580-8gb",
    model: "AMD Radeon RX 580 8GB",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "GCN 4 (Polaris 20)",
    releaseDate: "2017-04-18",
    processNode: "GlobalFoundries 14nm FinFET+",
    cudaCores: 2304,
    tensorCores: null,
    rtCores: null,
    computeUnits: 36,
    vramGB: 8,
    memoryType: "GDDR5",
    memoryBusBit: 256,
    bandwidthGBs: 256,
    fp32TFLOPS: 6.17,
    fp16TFLOPS: 6.17,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 185,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: null,
    msrpUSD: 229,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    merchant: "used",
    source: "https://www.amd.com/en/support/graphics/amd-radeon-rx-500-series/amd-radeon-rx-580.html",
    notes: "经典 GCN4 卡；中国二手市场极多；ROCm 支持有限（gfx803 已过时）。",
  },
  {
    id: "amd-rx-7900-xtx",
    model: "AMD Radeon RX 7900 XTX",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "RDNA 3",
    releaseDate: "2022-12-13",
    processNode: "5 nm / 6 nm",
    cudaCores: 6144,
    tensorCores: null,
    rtCores: 96,
    computeUnits: 96,
    vramGB: 24,
    memoryType: "GDDR6",
    memoryBusBit: 384,
    bandwidthGBs: 960,
    fp32TFLOPS: 61.4,
    fp16TFLOPS: 122.8,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 355,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 999,
    priceUSD: 900,
    priceUpdated: "2026-05-08",
    merchant: "manual",
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7900xtx.html",
    notes: "24GB VRAM; ROCm support depends on OS and stack.",
  },
  {
    id: "amd-rx-7900-xt",
    model: "AMD Radeon RX 7900 XT",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "RDNA 3",
    releaseDate: "2022-12-13",
    processNode: "5 nm / 6 nm",
    cudaCores: 5376,
    tensorCores: null,
    rtCores: 84,
    computeUnits: 84,
    vramGB: 20,
    memoryType: "GDDR6",
    memoryBusBit: 320,
    bandwidthGBs: 800,
    fp32TFLOPS: 51.6,
    fp16TFLOPS: 103.2,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 315,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 899,
    priceUSD: 720,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7900xt.html",
    notes: "20GB VRAM alternative.",
  },
  {
    id: "amd-rx-7800-xt",
    model: "AMD Radeon RX 7800 XT",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "RDNA 3",
    releaseDate: "2023-09-06",
    processNode: "5 nm / 6 nm",
    cudaCores: 3840,
    tensorCores: null,
    rtCores: 60,
    computeUnits: 60,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 256,
    bandwidthGBs: 624,
    fp32TFLOPS: 37.3,
    fp16TFLOPS: 74.6,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 263,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 499,
    priceUSD: 510,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7800xt.html",
    notes: "Solid 16GB mid-range.",
  },
  {
    id: "amd-rx-6800-xt",
    model: "AMD Radeon RX 6800 XT",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "RDNA 2",
    releaseDate: "2020-11-18",
    processNode: "TSMC 7N",
    cudaCores: 4608,
    tensorCores: null,
    rtCores: 72,
    computeUnits: 72,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 256,
    bandwidthGBs: 512,
    fp32TFLOPS: 20.7,
    fp16TFLOPS: 20.7,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 300,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 649,
    priceUSD: 290,
    priceUpdated: "2026-05-12",
    merchant: "used",
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6800xt.html",
    notes: "Popular for ROCm-based inference; competitive used price.",
  },
  {
    id: "amd-rx-9070-xt",
    model: "AMD Radeon RX 9070 XT",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "RDNA 4",
    releaseDate: "2025-03-27",
    processNode: "TSMC N4P",
    cudaCores: 4096,
    tensorCores: null,
    rtCores: 64,
    computeUnits: 64,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 256,
    bandwidthGBs: 640,
    fp32TFLOPS: 48.7,
    fp16TFLOPS: 97.4,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 771,
    powerW: 304,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 599,
    priceUSD: 649,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html",
    notes: "RDNA 4; dedicated AI accelerators; best price/perf in class.",
  },
  {
    id: "amd-rx-9070",
    model: "AMD Radeon RX 9070",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "RDNA 4",
    releaseDate: "2025-03-27",
    processNode: "TSMC N4P",
    cudaCores: 3584,
    tensorCores: null,
    rtCores: 56,
    computeUnits: 56,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 256,
    bandwidthGBs: 560,
    fp32TFLOPS: 36.8,
    fp16TFLOPS: 73.6,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 586,
    powerW: 220,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 549,
    priceUSD: 580,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070.html",
    notes: "RDNA 4; AI accelerators; non-XT variant with excellent efficiency.",
  },
  {
    id: "intel-arc-a770-16gb",
    model: "Intel Arc A770 16GB",
    vendor: "Intel",
    segment: "Desktop",
    architecture: "Xe-HPG Alchemist",
    releaseDate: "2022-10-12",
    processNode: "TSMC N6",
    cudaCores: null,
    tensorCores: 512,
    rtCores: 32,
    computeUnits: 32,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 256,
    bandwidthGBs: 560,
    fp32TFLOPS: 17.2,
    fp16TFLOPS: 34.4,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 225,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: 349,
    priceUSD: 300,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.intel.com/content/www/us/en/products/details/discrete-gpus/arc/desktop/a-series/a770.html",
    notes: "Cheap 16GB VRAM option, check software compatibility.",
  },
  {
    id: "intel-arc-b580",
    model: "Intel Arc B580",
    vendor: "Intel",
    segment: "Desktop",
    architecture: "Xe2 Battlemage",
    releaseDate: "2024-12-05",
    processNode: "TSMC N5",
    cudaCores: null,
    tensorCores: null,
    rtCores: 20,
    computeUnits: 20,
    vramGB: 12,
    memoryType: "GDDR6",
    memoryBusBit: 192,
    bandwidthGBs: 456,
    fp32TFLOPS: 10.7,
    fp16TFLOPS: 21.5,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 215,
    powerW: 190,
    pcie: "PCIe 4.0 x8",
    nvlinkGBs: null,
    msrpUSD: 249,
    priceUSD: 260,
    priceUpdated: "2026-05-12",
    merchant: "manual",
    source: "https://www.intel.com/content/www/us/en/products/details/discrete-gpus/arc/desktop/b-series/b580.html",
    notes: "Battlemage; competitive price/VRAM ratio; check driver maturity.",
  },
  {
    id: "intel-xeon-phi-7290f",
    model: "Intel Xeon Phi 7290F",
    vendor: "Intel",
    segment: "Many-core CPU",
    acceleratorType: "Many-core CPU",
    architecture: "Knights Landing",
    gpuDie: "KNL 7290F",
    releaseDate: "2016-10-01",
    processNode: "Intel 14 nm",
    cudaCores: 72,
    tensorCores: null,
    rtCores: null,
    computeUnits: 72,
    vramGB: 16,
    memoryType: "MCDRAM + DDR4-2400",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 490,
    fp32TFLOPS: 6.9,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 260,
    pcie: "Socket / Omni-Path",
    nvlinkGBs: 12.5,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    availability: "used / discontinued",
    softwareStack: "x86 / AVX-512 / OpenMP / MPI",
    merchant: "used",
    source: "https://www.intel.com/content/www/us/en/products/sku/95831/intel-xeon-phi-processor-7290-16gb-1-50-ghz-72-core/specifications.html",
    notes: "Discontinued many-core CPU; MCDRAM bandwidth is commonly cited around 490GB/s, while Intel ARK lists DDR4 bandwidth separately.",
  },
  {
    id: "intel-xeon-phi-7210",
    model: "Intel Xeon Phi 7210",
    vendor: "Intel",
    segment: "Many-core CPU",
    acceleratorType: "Many-core CPU",
    architecture: "Knights Landing",
    gpuDie: "KNL 7210",
    releaseDate: "2016-06-01",
    processNode: "Intel 14 nm",
    cudaCores: 64,
    tensorCores: null,
    rtCores: null,
    computeUnits: 64,
    vramGB: 16,
    memoryType: "MCDRAM + DDR4-2133",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 490,
    fp32TFLOPS: 5.3,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 215,
    pcie: "Socket",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: "2026-05-18",
    availability: "used / discontinued",
    softwareStack: "x86 / AVX-512 / OpenMP / MPI",
    merchant: "used",
    source: "https://www.intel.com/content/www/us/en/products/sku/94033/intel-xeon-phi-processor-7210-16gb-1-30-ghz-64-core/specifications.html",
    notes: "Entry KNL SKU; useful historical baseline for AVX-512 and high-bandwidth-memory CPU experiments.",
  },
  {
    id: "apple-m3-max-40gpu",
    model: "Apple M3 Max 40-core GPU",
    vendor: "Apple",
    segment: "Integrated",
    architecture: "Apple GPU",
    releaseDate: "2023-10-30",
    processNode: "TSMC N3B",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 40,
    vramGB: 128,
    memoryType: "Unified LPDDR5",
    memoryBusBit: null,
    bandwidthGBs: 400,
    fp32TFLOPS: 16.2,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: null,
    pcie: "SoC",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    merchant: "",
    source: "https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max/",
    notes: "Unified memory ceiling depends on Mac configuration.",
  },
  {
    id: "apple-m4-max-40gpu",
    model: "Apple M4 Max 40-core GPU",
    vendor: "Apple",
    segment: "Integrated",
    architecture: "Apple GPU",
    releaseDate: "2024-11-08",
    processNode: "TSMC N3E",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 40,
    vramGB: 128,
    memoryType: "Unified LPDDR5X",
    memoryBusBit: null,
    bandwidthGBs: 546,
    fp32TFLOPS: 21.3,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: null,
    pcie: "SoC",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    merchant: "",
    source: "https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/",
    notes: "Unified memory up to 128 GB; excellent inference bandwidth per watt.",
  },
  {
    id: "apple-m2-ultra-76gpu",
    model: "Apple M2 Ultra 76-core GPU",
    vendor: "Apple",
    segment: "Integrated",
    architecture: "Apple GPU",
    releaseDate: "2023-06-05",
    processNode: "TSMC 5N",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 76,
    vramGB: 192,
    memoryType: "Unified LPDDR5",
    memoryBusBit: null,
    bandwidthGBs: 800,
    fp32TFLOPS: 27.2,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: null,
    pcie: "SoC",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: null,
    priceUpdated: null,
    merchant: "",
    source: "https://www.apple.com/newsroom/2023/06/apple-unveils-m2-ultra/",
    notes: "Huge unified memory for inference.",
  },
  {
    id: "amd-instinct-mi250x",
    model: "AMD Instinct MI250X",
    vendor: "AMD",
    segment: "Data Center",
    architecture: "CDNA 2",
    releaseDate: "2021-11-08",
    processNode: "TSMC 6N",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 220,
    vramGB: 128,
    memoryType: "HBM2e",
    memoryBusBit: 8192,
    bandwidthGBs: 3277,
    fp32TFLOPS: 95.7,
    fp16TFLOPS: 383,
    bf16TFLOPS: 383,
    fp8TFLOPS: null,
    int8TOPS: 383,
    powerW: 500,
    pcie: "OAM",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 6500,
    priceUpdated: "2026-05-18",
    availability: "used / OEM server",
    softwareStack: "ROCm / HIP / PyTorch",
    merchant: "used",
    source: "https://www.amd.com/en/products/server-accelerators/instinct-mi250x.html",
    notes: "Frontier-era dual-die accelerator; strong FP64 and HBM bandwidth on the secondary market.",
  },
  {
    id: "cambricon-mlu370-x8",
    model: "Cambricon MLU370-X8",
    vendor: "Cambricon",
    segment: "Data Center",
    acceleratorType: "NPU",
    architecture: "MLUarch 02",
    gpuDie: "MLU370-X8",
    releaseDate: "2022-06-01",
    processNode: "7 nm (est.)",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 1,
    vramGB: 64,
    memoryType: "HBM2e",
    memoryBusBit: 4096,
    memoryClockGbps: null,
    bandwidthGBs: 1536,
    fp32TFLOPS: null,
    fp16TFLOPS: 96,
    bf16TFLOPS: 96,
    fp8TFLOPS: null,
    int8TOPS: 256,
    powerW: 300,
    pcie: "PCIe 4.0 x16",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 2200,
    priceUpdated: "2026-05-18",
    availability: "used / OEM channel",
    softwareStack: "NeuWare / MagicMind / PyTorch",
    merchant: "used",
    source: "https://www.cambricon.com/",
    notes: "Representative domestic training/inference accelerator; public MLU370 X8 figures vary by board revision, so this row uses common board-class numbers.",
  },
  {
    id: "huawei-atlas-300i-pro",
    model: "Huawei Atlas 300I Pro",
    vendor: "Huawei",
    segment: "Inference",
    acceleratorType: "NPU",
    architecture: "Da Vinci / Ascend 310P",
    gpuDie: "Ascend 310P",
    releaseDate: "2020-09-23",
    processNode: "12 nm",
    cudaCores: null,
    tensorCores: 32,
    rtCores: null,
    computeUnits: 1,
    vramGB: 24,
    memoryType: "LPDDR4X",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 204.8,
    fp32TFLOPS: null,
    fp16TFLOPS: 22,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 88,
    powerW: 75,
    pcie: "PCIe 3.0 x8",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 320,
    priceUpdated: "2026-05-18",
    availability: "PCIe card / used market",
    softwareStack: "CANN / MindSpore / PyTorch Ascend",
    merchant: "used",
    source: "https://www.hiascend.com/en/",
    notes: "Atlas 300I Pro class inference card built around Ascend 310P; common in edge inference and second-hand server retrofits.",
  },
  {
    id: "nvidia-titan-v",
    model: "NVIDIA TITAN V",
    vendor: "NVIDIA",
    segment: "Workstation",
    architecture: "Volta",
    releaseDate: "2017-12-07",
    processNode: "TSMC 12N",
    cudaCores: 5120,
    tensorCores: 640,
    rtCores: null,
    computeUnits: 80,
    vramGB: 12,
    memoryType: "HBM2",
    memoryBusBit: 3072,
    bandwidthGBs: 653,
    fp32TFLOPS: 14.9,
    fp16TFLOPS: 110,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 220,
    powerW: 250,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: null,
    msrpUSD: 2999,
    priceUSD: 850,
    priceUpdated: "2026-05-18",
    availability: "used / collector card",
    softwareStack: "CUDA / cuDNN / TensorRT",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/titan/titan-v/",
    notes: "Classic Volta prosumer card with HBM2 and first-gen Tensor Cores; still useful for CUDA experiments.",
  },
  {
    id: "nvidia-titan-rtx",
    model: "NVIDIA TITAN RTX",
    vendor: "NVIDIA",
    segment: "Workstation",
    architecture: "Turing",
    releaseDate: "2018-12-03",
    processNode: "TSMC 12N",
    cudaCores: 4608,
    tensorCores: 576,
    rtCores: 72,
    computeUnits: 72,
    vramGB: 24,
    memoryType: "GDDR6",
    memoryBusBit: 384,
    bandwidthGBs: 672,
    fp32TFLOPS: 16.3,
    fp16TFLOPS: 130.5,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: 261,
    powerW: 280,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: 100,
    msrpUSD: 2499,
    priceUSD: 1200,
    priceUpdated: "2026-05-18",
    availability: "used / prosumer",
    softwareStack: "CUDA / cuDNN / TensorRT",
    merchant: "used",
    source: "https://www.nvidia.com/en-us/titan/titan-rtx/",
    notes: "24GB Turing flagship; still a common local-LLM used-market baseline.",
  },
  {
    id: "nvidia-rtx-5060-ti-16gb",
    model: "NVIDIA GeForce RTX 5060 Ti 16GB",
    vendor: "NVIDIA",
    segment: "Desktop",
    architecture: "Blackwell",
    releaseDate: "2025-04-16",
    processNode: "TSMC 4NP",
    cudaCores: 4608,
    tensorCores: 144,
    rtCores: 36,
    computeUnits: 36,
    vramGB: 16,
    memoryType: "GDDR7",
    memoryBusBit: 128,
    bandwidthGBs: 448,
    fp32TFLOPS: 24.1,
    fp16TFLOPS: 386,
    bf16TFLOPS: 386,
    fp8TFLOPS: 772,
    int8TOPS: 772,
    powerW: 180,
    pcie: "PCIe 5.0 x8",
    nvlinkGBs: null,
    msrpUSD: 429,
    priceUSD: 459,
    priceUpdated: "2026-05-18",
    availability: "retail / new",
    softwareStack: "CUDA / TensorRT / DirectML",
    merchant: "manual",
    source: "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5060-family/",
    notes: "New 16GB Blackwell entry point; a practical reference against 4060 Ti 16GB, A770 16GB, and used 3090-class cards.",
  },
  {
    id: "moore-threads-mtt-s80",
    model: "Moore Threads MTT S80",
    vendor: "Moore Threads",
    segment: "Desktop",
    architecture: "MUSA / Chunxiao",
    releaseDate: "2022-11-03",
    processNode: "12 nm",
    cudaCores: 4096,
    tensorCores: null,
    rtCores: null,
    computeUnits: null,
    vramGB: 16,
    memoryType: "GDDR6",
    memoryBusBit: 256,
    bandwidthGBs: 448,
    fp32TFLOPS: 14.4,
    fp16TFLOPS: 28.8,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 255,
    pcie: "PCIe 5.0 x16",
    nvlinkGBs: null,
    msrpUSD: 299,
    priceUSD: 240,
    priceUpdated: "2026-05-18",
    availability: "used / regional retail",
    softwareStack: "MUSA SDK / Torch MUSA",
    merchant: "used",
    source: "https://www.mthreads.com/",
    notes: "Representative Moore Threads desktop card; software maturity matters more than raw specs for AI workloads.",
  },
  {
    id: "amd-radeon-vii",
    model: "AMD Radeon VII",
    vendor: "AMD",
    segment: "Desktop",
    architecture: "GCN 5 (Vega 20)",
    releaseDate: "2019-02-07",
    processNode: "TSMC 7N",
    cudaCores: 3840,
    tensorCores: null,
    rtCores: null,
    computeUnits: 60,
    vramGB: 16,
    memoryType: "HBM2",
    memoryBusBit: 4096,
    bandwidthGBs: 1024,
    fp32TFLOPS: 13.8,
    fp16TFLOPS: 27.7,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 300,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: null,
    msrpUSD: 699,
    priceUSD: 420,
    priceUpdated: "2026-05-18",
    availability: "used / collector card",
    softwareStack: "ROCm / HIP / OpenCL",
    merchant: "used",
    source: "https://www.amd.com/en/products/graphics/amd-radeon-vii",
    notes: "Classic 16GB HBM2 Radeon; still interesting for memory-bound ROCm tinkering and legacy prosumer builds.",
  },
  {
    id: "bitmain-antminer-s19j-pro-hashboard",
    model: "Bitmain Antminer S19j Pro hashboard",
    vendor: "Bitmain",
    segment: "Mining",
    acceleratorType: "ASIC",
    architecture: "SHA-256 ASIC (BM1397D)",
    gpuDie: "BM1397D ×26",
    releaseDate: "2021-06-01",
    processNode: "TSMC 7 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    // 每张矿板焊有 26 颗 BM1397D 芯片；完整矿机 3 张板 ≈ 78 颗
    computeUnits: 26,
    // BM1397D 无可寻址 DRAM；片内只有几 KB SRAM 用于 SHA-256 流水线状态缓冲
    vramGB: null,
    memoryType: "On-die SRAM (片内 ~几 KB/芯片，仅用于流水线缓冲)",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: null,
    // BM1397D 是硬连线 SHA-256 ASIC，无浮点 ALU；以下字段字面上不适用
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    // 整机 3068 W / 3 张板 ≈ 1023 W/板（含板级 VRM 损耗）
    powerW: 1023,
    pcie: "Miner backplane / custom edge",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 45,
    priceUpdated: "2026-05-18",
    availability: "used /拆机矿板",
    softwareStack: "SHA-256 firmware only（无通用编程接口）",
    merchant: "used",
    source: "https://www.bitmain.com/products/",
    notes: "BM1397D：TSMC 7nm SHA-256 ASIC；每芯片约 2016 个哈希引擎（双级 SHA-256 流水），工作频率 400–800 MHz，片内 SRAM 仅供流水线状态缓冲，无 DRAM，无浮点单元，无通用寄存器堆。FP/INT 字段字面上不适用。保留此条目因闲鱼流通量高，适合作为极低价位并行板的价格基准。",
  },
  {
    id: "bitmain-antminer-s17-pro-hashboard",
    model: "Bitmain Antminer S17 Pro hashboard",
    vendor: "Bitmain",
    segment: "Mining",
    acceleratorType: "ASIC",
    architecture: "SHA-256 ASIC (BM1397)",
    gpuDie: "BM1397 ×18",
    releaseDate: "2019-04-08",
    processNode: "TSMC 7 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    // 每张矿板 18 颗 BM1397；完整矿机 3 张板 = 54 颗
    computeUnits: 18,
    vramGB: null,
    memoryType: "On-die SRAM (片内 ~几 KB/芯片，仅用于流水线缓冲)",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: null,
    fp32TFLOPS: null,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    // 整机 2094 W / 3 张板 ≈ 698 W/板
    powerW: 698,
    pcie: "Miner backplane / custom edge",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 18,
    priceUpdated: "2026-05-18",
    availability: "used /拆机矿板",
    softwareStack: "SHA-256 firmware only（无通用编程接口）",
    merchant: "used",
    source: "https://www.bitmain.com/products/",
    notes: "BM1397：TSMC 7nm SHA-256 ASIC，架构与 S19 系列相同但工作频率稍低；同样无浮点单元、无 DRAM、无通用寄存器。老矿场最常见拆机板之一，适合作为超低价位对照基准。",
  },
  {
    id: "xilinx-vu9p-bcu1525",
    model: "Xilinx VU9P (BCU1525 / VCU1525)",
    vendor: "Xilinx",
    segment: "FPGA",
    acceleratorType: "FPGA",
    architecture: "UltraScale+",
    gpuDie: "XCVU9P-L2FSGD2104",
    releaseDate: "2017-09-01",
    processNode: "TSMC 16 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    // DSP48E2 切片数量；是 FPGA 上最接近"并行乘加单元"的指标
    computeUnits: 6840,
    // BCU1525 通常配 4×16 GB DDR4 UDIMM = 64 GB
    vramGB: 64,
    memoryType: "DDR4 (4 通道)",
    memoryBusBit: 256,
    memoryClockGbps: 2.4,
    // 4 通道 × 64-bit × 2400 MT/s = 76.8 GB/s
    bandwidthGBs: 76.8,
    // 理论峰值（所有 DSP 用于 FP32 乘加，约 350 MHz）；实际取决于比特流设计
    fp32TFLOPS: 1.4,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    // DSP INT8 打包理论峰值（500 MHz）
    int8TOPS: 7.0,
    // VU9P 满负荷典型功耗
    powerW: 225,
    pcie: "PCIe 3.0 x16",
    nvlinkGBs: null,
    // VCU1525 官方零售价；BCU1525 国产仿制版当时售价约 $1000 新品
    msrpUSD: 9000,
    priceUSD: 200,
    priceUpdated: "2026-05-18",
    availability: "used / 闲鱼 BCU1525 clone",
    softwareStack: "Vivado / Vitis / OpenCL / Vitis AI",
    merchant: "used",
    source: "https://www.xilinx.com/products/boards-and-kits/alveo/vcu1525.html",
    notes: "Virtex UltraScale+ VU9P FPGA；BCU1525 是国产仿制版，以太坊矿潮时代大量流入闲鱼，价格极低。计算性能完全取决于比特流：DSP48E2×6840, LUT6×1,143,000, FF×2,364,480, BRAM 36K×4320（≈18.5 MB）, URAM×960（≈33.75 MB）。FP32/INT8 为理论最大值，实际工程设计通常只能达到 50–80%。",
  },
  {
    id: "amd-epyc-7742",
    model: "AMD EPYC 7742",
    vendor: "AMD",
    segment: "Many-core CPU",
    acceleratorType: "Many-core CPU",
    architecture: "Zen 2",
    gpuDie: "Rome 64C",
    releaseDate: "2019-08-07",
    processNode: "TSMC 7N",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 64,
    vramGB: null,
    memoryType: "8ch DDR4-3200",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 204.8,
    fp32TFLOPS: 4.61,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 225,
    pcie: "PCIe 4.0 x128",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 380,
    priceUpdated: "2026-05-18",
    availability: "used / tray",
    softwareStack: "x86-64 / AVX2 / OpenMP / MPI",
    merchant: "used",
    source: "https://www.amd.com/en/products/processors/server/epyc/7002-series/amd-epyc-7742.html",
    notes: "64-core Rome staple on the second-hand market; useful to benchmark against cheap GPU-less inference or CPU preprocessing boxes.",
  },
  {
    id: "amd-epyc-7b13",
    model: "AMD EPYC 7B13",
    vendor: "AMD",
    segment: "Many-core CPU",
    acceleratorType: "Many-core CPU",
    architecture: "Zen 3",
    gpuDie: "Milan 64C",
    releaseDate: "2021-03-15",
    processNode: "TSMC 7N",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 64,
    vramGB: null,
    memoryType: "8ch DDR4-3200",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 204.8,
    fp32TFLOPS: 5.02,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 240,
    pcie: "PCIe 4.0 x128",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 580,
    priceUpdated: "2026-05-18",
    availability: "used / OEM tray",
    softwareStack: "x86-64 / AVX2 / OpenMP / MPI",
    merchant: "used",
    source: "https://www.amd.com/en/products/processors/server/epyc/7003-series.html",
    notes: "Popular OEM Milan 64-core SKU in China second-hand channels; often a better all-rounder than Rome at similar platform cost.",
  },
  {
    id: "intel-xeon-platinum-8280",
    model: "Intel Xeon Platinum 8280",
    vendor: "Intel",
    segment: "Many-core CPU",
    acceleratorType: "Many-core CPU",
    architecture: "Cascade Lake-SP",
    gpuDie: "Cascade Lake 28C",
    releaseDate: "2019-04-02",
    processNode: "Intel 14 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 28,
    vramGB: null,
    memoryType: "6ch DDR4-2933",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 140.8,
    fp32TFLOPS: 2.42,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 205,
    pcie: "PCIe 3.0 x48",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 220,
    priceUpdated: "2026-05-18",
    availability: "used / tray",
    softwareStack: "x86-64 / AVX-512 / OpenMP / MPI",
    merchant: "used",
    source: "https://www.intel.com/content/www/us/en/products/sku/192481/intel-xeon-platinum-8280-processor-38-5m-cache-2-70-ghz/specifications.html",
    notes: "Classic dual-socket used-market Xeon; cheap entry for memory-capacity-heavy CPU-side preprocessing nodes.",
  },
  {
    id: "intel-xeon-platinum-8380",
    model: "Intel Xeon Platinum 8380",
    vendor: "Intel",
    segment: "Many-core CPU",
    acceleratorType: "Many-core CPU",
    architecture: "Ice Lake-SP",
    gpuDie: "Ice Lake 40C",
    releaseDate: "2021-04-06",
    processNode: "Intel 10 nm",
    cudaCores: null,
    tensorCores: null,
    rtCores: null,
    computeUnits: 40,
    vramGB: null,
    memoryType: "8ch DDR4-3200",
    memoryBusBit: null,
    memoryClockGbps: null,
    bandwidthGBs: 204.8,
    fp32TFLOPS: 2.94,
    fp16TFLOPS: null,
    bf16TFLOPS: null,
    fp8TFLOPS: null,
    int8TOPS: null,
    powerW: 270,
    pcie: "PCIe 4.0 x64",
    nvlinkGBs: null,
    msrpUSD: null,
    priceUSD: 360,
    priceUpdated: "2026-05-18",
    availability: "used / tray",
    softwareStack: "x86-64 / AVX-512 / OpenMP / MPI",
    merchant: "used",
    source: "https://www.intel.com/content/www/us/en/products/sku/212270/intel-xeon-platinum-8380-processor-60m-cache-2-30-ghz/specifications.html",
    notes: "40-core Ice Lake Xeon with 8-channel memory and PCIe 4.0; a more modern used CPU baseline for host-side compare.",
  },
];

const specDetailsById = {
  "nvidia-b200-sxm": {
    gpuDie: "B200",
    fp64TFLOPS: 37,
    tf32TFLOPS: 1100,
    fp4TOPS: 9000,
    computeCapability: "Blackwell / CUDA 10.x",
    sparsitySupport: "2:4 sparse Tensor Core, FP4/FP8",
  },
  "nvidia-h200-sxm": {
    gpuDie: "GH100",
    boostClockMHz: 1980,
    fp64TFLOPS: 34,
    tf32TFLOPS: 989,
    int4TOPS: 7916,
    l1CacheKB: 33792,
    regFileKB: 33792,
    l2CacheMB: 50,
    dieSizeMm2: 814,
    transistorsBillion: 80,
    computeCapability: "CUDA 9.0",
    sparsitySupport: "2:4 sparse Tensor Core",
  },
  "nvidia-h100-sxm-80gb": {
    gpuDie: "GH100",
    boostClockMHz: 1980,
    fp64TFLOPS: 34,
    tf32TFLOPS: 989,
    int4TOPS: 7916,
    l1CacheKB: 33792,
    regFileKB: 33792,
    l2CacheMB: 50,
    dieSizeMm2: 814,
    transistorsBillion: 80,
    computeCapability: "CUDA 9.0",
    sparsitySupport: "2:4 sparse Tensor Core",
  },
  "nvidia-a100-sxm4-80gb": {
    gpuDie: "GA100",
    boostClockMHz: 1410,
    memoryClockGbps: 3.2,
    fp64TFLOPS: 9.7,
    fp64Ratio: "1:2",
    tf32TFLOPS: 156,
    int4TOPS: 1248,
    l1CacheKB: 20736,
    regFileKB: 27648,
    l2CacheMB: 40,
    dieSizeMm2: 826,
    transistorsBillion: 54.2,
    computeCapability: "CUDA 8.0",
    sparsitySupport: "2:4 sparse Tensor Core",
  },
  "nvidia-l40s": {
    gpuDie: "AD102",
    boostClockMHz: 2520,
    memoryClockGbps: 18,
    fp64TFLOPS: 1.43,
    fp64Ratio: "1:64",
    tf32TFLOPS: 733,
    int4TOPS: 5864,
    l1CacheKB: 18176,
    regFileKB: 18176,
    l2CacheMB: 96,
    rops: 192,
    tmus: 568,
    dieSizeMm2: 608.5,
    transistorsBillion: 76.3,
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
  },
  "amd-instinct-mi300x": {
    gpuDie: "MI300X",
    fp64TFLOPS: 81.7,
    l3CacheMB: 256,
    transistorsBillion: 153,
    computeCapability: "ROCm CDNA 3",
    sparsitySupport: "Matrix Core",
  },
  "nvidia-rtx-6000-ada": {
    gpuDie: "AD102",
    baseClockMHz: 915,
    boostClockMHz: 2505,
    memoryClockGbps: 20,
    fp64TFLOPS: 1.42,
    fp64Ratio: "1:64",
    tf32TFLOPS: 728,
    int4TOPS: 5828,
    l1CacheKB: 18176,
    regFileKB: 18176,
    l2CacheMB: 96,
    rops: 192,
    tmus: 568,
    dieSizeMm2: 608.5,
    transistorsBillion: 76.3,
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
  },
  "nvidia-rtx-5090": {
    gpuDie: "GB202",
    baseClockMHz: 2010,
    boostClockMHz: 2410,
    memoryClockGbps: 28,
    fp4TOPS: 6704,
    fp64Ratio: "1:64",
    l1CacheKB: 43520,
    regFileKB: 43520,
    l2CacheMB: 96,
    rops: 176,
    tmus: 680,
    dieSizeMm2: 750,
    transistorsBillion: 92.2,
    fp32OpsPerClock: 128,
    ipcNotes: "128 FP32 lanes per SM; IPC depends on instruction mix and scheduling",
    computeCapability: "Blackwell / CUDA 10.x",
    sparsitySupport: "2:4 sparse Tensor Core, FP4",
    llamaCppTgTokS: 260,
  },
  "nvidia-rtx-5080": {
    gpuDie: "GB203",
    baseClockMHz: 2295,
    boostClockMHz: 2617,
    memoryClockGbps: 30,
    fp4TOPS: 4140,
    fp64Ratio: "1:64",
    l1CacheKB: 21504,
    regFileKB: 21504,
    l2CacheMB: 64,
    rops: 112,
    tmus: 336,
    dieSizeMm2: 378,
    transistorsBillion: 45.6,
    fp32OpsPerClock: 128,
    ipcNotes: "128 FP32 lanes per SM; IPC depends on instruction mix and scheduling",
    computeCapability: "Blackwell / CUDA 10.x",
    sparsitySupport: "2:4 sparse Tensor Core, FP4",
    llamaCppTgTokS: 152,
  },
  "nvidia-rtx-4090": {
    gpuDie: "AD102",
    baseClockMHz: 2235,
    boostClockMHz: 2520,
    memoryClockGbps: 21,
    fp64TFLOPS: 1.29,
    fp64Ratio: "1:64",
    l1CacheKB: 16384,
    regFileKB: 32768,
    l2CacheMB: 72,
    rops: 176,
    tmus: 512,
    pixelRateGPixelS: 443.5,
    textureRateGTexelS: 1290.2,
    dieSizeMm2: 608.5,
    transistorsBillion: 76.3,
    fp32OpsPerClock: 128,
    ipcNotes: "128 FP32 lanes per SM",
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 145,
  },
  "nvidia-rtx-4080-super": {
    gpuDie: "AD103",
    baseClockMHz: 2295,
    boostClockMHz: 2550,
    memoryClockGbps: 23,
    fp64Ratio: "1:64",
    l1CacheKB: 10240,
    regFileKB: 20480,
    l2CacheMB: 64,
    rops: 112,
    tmus: 320,
    dieSizeMm2: 378.6,
    transistorsBillion: 45.9,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 110,
  },
  "nvidia-rtx-4070-ti-super": {
    gpuDie: "AD103",
    baseClockMHz: 2340,
    boostClockMHz: 2610,
    memoryClockGbps: 21,
    fp64Ratio: "1:64",
    l1CacheKB: 8448,
    regFileKB: 16896,
    l2CacheMB: 48,
    rops: 96,
    tmus: 264,
    dieSizeMm2: 378.6,
    transistorsBillion: 45.9,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 97,
  },
  "nvidia-rtx-4070-super": {
    gpuDie: "AD104",
    baseClockMHz: 1980,
    boostClockMHz: 2475,
    memoryClockGbps: 21,
    fp64Ratio: "1:64",
    l1CacheKB: 7168,
    regFileKB: 14336,
    l2CacheMB: 48,
    rops: 80,
    tmus: 224,
    dieSizeMm2: 294.5,
    transistorsBillion: 35.8,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 75,
  },
  "nvidia-rtx-4060-ti-16gb": {
    gpuDie: "AD106",
    baseClockMHz: 2310,
    boostClockMHz: 2535,
    memoryClockGbps: 18,
    fp64Ratio: "1:64",
    l1CacheKB: 4352,
    regFileKB: 8704,
    l2CacheMB: 32,
    rops: 48,
    tmus: 136,
    dieSizeMm2: 188.8,
    transistorsBillion: 22.9,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.9",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 68,
  },
  "nvidia-rtx-3090-ti": {
    gpuDie: "GA102",
    baseClockMHz: 1560,
    boostClockMHz: 1860,
    memoryClockGbps: 21,
    fp64TFLOPS: 0.63,
    fp64Ratio: "1:64",
    l1CacheKB: 10752,
    regFileKB: 21504,
    l2CacheMB: 6,
    rops: 112,
    tmus: 336,
    dieSizeMm2: 628.4,
    transistorsBillion: 28.3,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.6",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 88,
  },
  "nvidia-rtx-3090": {
    gpuDie: "GA102",
    baseClockMHz: 1395,
    boostClockMHz: 1695,
    memoryClockGbps: 19.5,
    fp64TFLOPS: 0.56,
    fp64Ratio: "1:64",
    l1CacheKB: 10496,
    regFileKB: 20992,
    l2CacheMB: 6,
    rops: 112,
    tmus: 328,
    pixelRateGPixelS: 189.8,
    textureRateGTexelS: 556,
    dieSizeMm2: 628.4,
    transistorsBillion: 28.3,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.6",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 85,
  },
  "nvidia-rtx-3060-12gb": {
    gpuDie: "GA106",
    baseClockMHz: 1320,
    boostClockMHz: 1777,
    memoryClockGbps: 15,
    fp64Ratio: "1:64",
    l1CacheKB: 3584,
    regFileKB: 7168,
    l2CacheMB: 3,
    rops: 48,
    tmus: 112,
    dieSizeMm2: 276,
    transistorsBillion: 12,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.6",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 52,
  },
  "amd-rx-7900-xtx": {
    gpuDie: "Navi 31 XTX",
    baseClockMHz: 1855,
    boostClockMHz: 2499,
    memoryClockGbps: 20,
    fp64TFLOPS: 1.92,
    fp64Ratio: "1:32",
    l1CacheKB: 12288,
    l2CacheMB: 6,
    l3CacheMB: 96,
    rops: 192,
    tmus: 384,
    pixelRateGPixelS: 479.8,
    textureRateGTexelS: 959.6,
    dieSizeMm2: 529,
    transistorsBillion: 57.7,
    computeCapability: "ROCm gfx1100 / RDNA 3",
    llamaCppTgTokS: 112,
  },
  "amd-rx-7900-xt": {
    gpuDie: "Navi 31 XT",
    baseClockMHz: 1500,
    boostClockMHz: 2394,
    memoryClockGbps: 20,
    fp64Ratio: "1:32",
    l1CacheKB: 10752,
    l3CacheMB: 80,
    rops: 192,
    tmus: 336,
    dieSizeMm2: 529,
    transistorsBillion: 57.7,
    computeCapability: "ROCm gfx1100 / RDNA 3",
    llamaCppTgTokS: 95,
  },
  "amd-rx-7800-xt": {
    gpuDie: "Navi 32 XT",
    baseClockMHz: 1295,
    boostClockMHz: 2430,
    memoryClockGbps: 19.5,
    fp64Ratio: "1:32",
    l1CacheKB: 7680,
    l3CacheMB: 64,
    rops: 96,
    tmus: 240,
    dieSizeMm2: 346,
    transistorsBillion: 28.1,
    computeCapability: "ROCm gfx1101 / RDNA 3",
    llamaCppTgTokS: 88,
  },
  "intel-arc-a770-16gb": {
    gpuDie: "ACM-G10",
    baseClockMHz: 2100,
    memoryClockGbps: 17.5,
    l1CacheKB: 2048,
    l2CacheMB: 16,
    rops: 128,
    tmus: 256,
    dieSizeMm2: 406,
    transistorsBillion: 21.7,
    computeCapability: "Xe HPG / oneAPI Level Zero",
  },
  "apple-m3-max-40gpu": {
    gpuDie: "Apple M3 Max",
    transistorsBillion: 92,
    computeCapability: "Metal 3",
    llamaCppTgTokS: 62,
  },
  "apple-m2-ultra-76gpu": {
    gpuDie: "Apple M2 Ultra",
    transistorsBillion: 134,
    computeCapability: "Metal 3",
    llamaCppTgTokS: 105,
  },
  "nvidia-rtx-5070-ti": {
    gpuDie: "GB203",
    baseClockMHz: 2122,
    boostClockMHz: 2452,
    memoryClockGbps: 28,
    fp4TOPS: 2822,
    fp64Ratio: "1:64",
    l1CacheKB: 17920,
    regFileKB: 17920,
    l2CacheMB: 64,
    rops: 112,
    tmus: 280,
    dieSizeMm2: 378,
    transistorsBillion: 45.6,
    fp32OpsPerClock: 128,
    computeCapability: "Blackwell / CUDA 10.x",
    sparsitySupport: "2:4 sparse Tensor Core, FP4",
    llamaCppTgTokS: 130,
  },
  "nvidia-rtx-5070": {
    gpuDie: "GB205",
    baseClockMHz: 1987,
    boostClockMHz: 2506,
    memoryClockGbps: 28,
    fp4TOPS: 1970,
    fp64Ratio: "1:64",
    l1CacheKB: 12288,
    regFileKB: 12288,
    l2CacheMB: 48,
    rops: 64,
    tmus: 192,
    transistorsBillion: 30,
    fp32OpsPerClock: 128,
    computeCapability: "Blackwell / CUDA 10.x",
    sparsitySupport: "2:4 sparse Tensor Core, FP4",
    llamaCppTgTokS: 100,
  },
  "intel-arc-b580": {
    gpuDie: "BMG-G21",
    baseClockMHz: 1665,
    boostClockMHz: 2670,
    memoryClockGbps: 19,
    l1CacheKB: 5120,
    l2CacheMB: 16,
    rops: 80,
    tmus: 160,
    transistorsBillion: 18.7,
    computeCapability: "Xe2 HPG / oneAPI Level Zero",
    sparsitySupport: "XMX Matrix Engines",
  },
  "amd-rx-9070-xt": {
    gpuDie: "Navi 48 XTX",
    baseClockMHz: 1580,
    boostClockMHz: 2970,
    memoryClockGbps: 20,
    fp64TFLOPS: 1.52,
    fp64Ratio: "1:32",
    l1CacheKB: 8192,
    l2CacheMB: 4,
    l3CacheMB: 64,
    rops: 128,
    tmus: 256,
    transistorsBillion: 53.9,
    computeCapability: "ROCm gfx1201 / RDNA 4",
    sparsitySupport: "Matrix Core (WMMA)",
    llamaCppTgTokS: 98,
  },
  "apple-m4-max-40gpu": {
    gpuDie: "Apple M4 Max",
    transistorsBillion: 92,
    computeCapability: "Metal 3",
    llamaCppTgTokS: 83,
  },
  "nvidia-v100-sxm2-32gb": {
    gpuDie: "GV100",
    boostClockMHz: 1530,
    memoryClockGbps: 1.75,
    fp64TFLOPS: 7.8,
    fp64Ratio: "1:2",
    l1CacheKB: 10240,
    regFileKB: 20480,
    l2CacheMB: 6,
    dieSizeMm2: 815,
    transistorsBillion: 21.1,
    computeCapability: "CUDA 7.0",
    sparsitySupport: "Tensor Core (FP16)",
  },
  "nvidia-v100-pcie-16gb": {
    gpuDie: "GV100",
    boostClockMHz: 1370,
    memoryClockGbps: 1.75,
    fp64TFLOPS: 7.0,
    fp64Ratio: "1:2",
    l1CacheKB: 10240,
    regFileKB: 20480,
    l2CacheMB: 6,
    dieSizeMm2: 815,
    transistorsBillion: 21.1,
    computeCapability: "CUDA 7.0",
    sparsitySupport: "Tensor Core (FP16)",
  },
  "nvidia-p100-pcie-16gb": {
    gpuDie: "GP100",
    boostClockMHz: 1328,
    fp64TFLOPS: 5.3,
    fp64Ratio: "1:2",
    l1CacheKB: 3584,
    regFileKB: 14336,
    l2CacheMB: 4,
    dieSizeMm2: 610,
    transistorsBillion: 15.3,
    computeCapability: "CUDA 6.0",
  },
  "nvidia-a40": {
    gpuDie: "GA102",
    baseClockMHz: 735,
    boostClockMHz: 1740,
    memoryClockGbps: 14.5,
    fp64TFLOPS: 0.59,
    fp64Ratio: "1:64",
    tf32TFLOPS: 149.7,
    int4TOPS: 598.7,
    l1CacheKB: 10752,
    regFileKB: 21504,
    l2CacheMB: 48,
    rops: 112,
    tmus: 336,
    dieSizeMm2: 628.4,
    transistorsBillion: 28.3,
    computeCapability: "CUDA 8.6",
    sparsitySupport: "2:4 sparse Tensor Core",
  },
  "nvidia-rtx-3080-10gb": {
    gpuDie: "GA102",
    baseClockMHz: 1440,
    boostClockMHz: 1710,
    memoryClockGbps: 19,
    fp64TFLOPS: 0.47,
    fp64Ratio: "1:64",
    l1CacheKB: 8704,
    regFileKB: 17408,
    l2CacheMB: 5,
    rops: 96,
    tmus: 272,
    dieSizeMm2: 628.4,
    transistorsBillion: 28.3,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.6",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 70,
  },
  "amd-radeon-pro-w7900": {
    gpuDie: "Navi 31 XTX",
    baseClockMHz: 1900,
    boostClockMHz: 2499,
    memoryClockGbps: 18,
    fp64TFLOPS: 1.92,
    fp64Ratio: "1:32",
    l1CacheKB: 12288,
    l2CacheMB: 6,
    l3CacheMB: 96,
    rops: 192,
    tmus: 384,
    dieSizeMm2: 529,
    transistorsBillion: 57.7,
    computeCapability: "ROCm gfx1100 / RDNA 3",
  },
  "amd-radeon-pro-duo": {
    gpuDie: "2× Fiji XT",
    boostClockMHz: 1000,
    fp64TFLOPS: 1.02,
    fp64Ratio: "1:8",
    l1CacheKB: 8192,
    dieSizeMm2: 596,
    transistorsBillion: 17.1,
    computeCapability: "ROCm gfx803 / GCN 3",
  },
  "amd-rx-6800-xt": {
    gpuDie: "Navi 21 XT",
    baseClockMHz: 1825,
    boostClockMHz: 2250,
    memoryClockGbps: 16,
    fp64TFLOPS: 1.29,
    fp64Ratio: "1:16",
    l1CacheKB: 9216,
    l2CacheMB: 4,
    l3CacheMB: 128,
    rops: 128,
    tmus: 288,
    dieSizeMm2: 519,
    transistorsBillion: 26.8,
    computeCapability: "ROCm gfx1030 / RDNA 2",
    llamaCppTgTokS: 75,
  },
  "amd-rx-9070": {
    gpuDie: "Navi 48 XT",
    baseClockMHz: 1455,
    boostClockMHz: 2570,
    memoryClockGbps: 17.5,
    fp64TFLOPS: 1.15,
    fp64Ratio: "1:32",
    l1CacheKB: 7168,
    l2CacheMB: 4,
    l3CacheMB: 64,
    rops: 112,
    tmus: 224,
    transistorsBillion: 53.9,
    computeCapability: "ROCm gfx1200 / RDNA 4",
    sparsitySupport: "Matrix Core (WMMA)",
    llamaCppTgTokS: 85,
  },
  "nvidia-cmp-40hx": {
    gpuDie: "GA106",
    baseClockMHz: 1620,
    boostClockMHz: 1740,
    memoryClockGbps: 14,
    fp64Ratio: "1:64",
    l1CacheKB: 3584,
    regFileKB: 7168,
    l2CacheMB: 3,
    rops: null,
    tmus: null,
    dieSizeMm2: 276,
    transistorsBillion: 13,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 8.6",
    sparsitySupport: "2:4 sparse Tensor Core",
    llamaCppTgTokS: 50,
  },
  "nvidia-p106-100": {
    gpuDie: "GP106",
    baseClockMHz: 1569,
    boostClockMHz: 1708,
    memoryClockGbps: 8,
    fp64Ratio: "1:32",
    l1CacheKB: 640,
    regFileKB: 2560,
    l2CacheMB: 1.5,
    rops: 32,
    tmus: 80,
    dieSizeMm2: 200,
    transistorsBillion: 4.4,
    fp32OpsPerClock: 128,
    computeCapability: "CUDA 6.1",
    ipcNotes: "Pascal GP106；128 CUDA cores/SM",
  },
  "amd-rx-580-8gb": {
    gpuDie: "Polaris 20",
    baseClockMHz: 1257,
    boostClockMHz: 1340,
    memoryClockGbps: 8,
    fp64TFLOPS: 0.39,
    fp64Ratio: "1:16",
    l1CacheKB: 2304,
    l2CacheMB: 2,
    rops: 32,
    tmus: 144,
    dieSizeMm2: 232,
    transistorsBillion: 5.7,
    computeCapability: "ROCm gfx803 / GCN 4.0",
    ipcNotes: "GCN 4.0；64 SP/CU；2 FP32 ops/clk per SP",
  },
  "amd-instinct-mi250x": {
    gpuDie: "2× Aldebaran",
    fp64TFLOPS: 47.9,
    fp64Ratio: "1:2",
    l2CacheMB: 16,
    transistorsBillion: 58.2,
    computeCapability: "ROCm gfx90a / CDNA 2",
    sparsitySupport: "Matrix Core",
    ipcNotes: "双 GCD CDNA 2；220 CUs 总计，矩阵吞吐优先于图形口径",
  },
  "cambricon-mlu370-x8": {
    computeCapability: "NeuWare / MagicMind",
    sparsitySupport: "Mixed precision tensor",
    ipcNotes: "公开板卡口径差异较大；此处采用 MLU370 X8 常见公开峰值",
  },
  "huawei-atlas-300i-pro": {
    computeCapability: "CANN / Ascend 310P",
    sparsitySupport: "Cube Unit",
  },
  "nvidia-titan-v": {
    gpuDie: "GV100",
    baseClockMHz: 1200,
    boostClockMHz: 1455,
    memoryClockGbps: 1.7,
    fp64TFLOPS: 7.45,
    fp64Ratio: "1:2",
    l1CacheKB: 10240,
    regFileKB: 20480,
    l2CacheMB: 4.5,
    dieSizeMm2: 815,
    transistorsBillion: 21.1,
    computeCapability: "CUDA 7.0",
    sparsitySupport: "Tensor Core (FP16)",
    llamaCppTgTokS: 34,
  },
  "nvidia-titan-rtx": {
    gpuDie: "TU102",
    baseClockMHz: 1350,
    boostClockMHz: 1770,
    memoryClockGbps: 14,
    fp64TFLOPS: 0.51,
    fp64Ratio: "1:32",
    l1CacheKB: 4608,
    regFileKB: 9216,
    l2CacheMB: 6,
    rops: 96,
    tmus: 288,
    dieSizeMm2: 754,
    transistorsBillion: 18.6,
    fp32OpsPerClock: 64,
    computeCapability: "CUDA 7.5",
    sparsitySupport: "Tensor Core",
    llamaCppTgTokS: 52,
  },
  "nvidia-rtx-5060-ti-16gb": {
    gpuDie: "GB206",
    baseClockMHz: 2407,
    boostClockMHz: 2572,
    memoryClockGbps: 28,
    fp4TOPS: 1544,
    fp64Ratio: "1:64",
    l1CacheKB: 4608,
    regFileKB: 9216,
    l2CacheMB: 32,
    rops: 48,
    tmus: 144,
    transistorsBillion: 21.9,
    fp32OpsPerClock: 128,
    computeCapability: "Blackwell / CUDA 10.x",
    sparsitySupport: "2:4 sparse Tensor Core, FP4",
    llamaCppTgTokS: 72,
  },
  "moore-threads-mtt-s80": {
    gpuDie: "Chunxiao",
    baseClockMHz: 1800,
    memoryClockGbps: 14,
    computeCapability: "MUSA / DirectX 12",
    ipcNotes: "国产桌面 GPU，生态兼容性比理论算力更关键",
  },
  "amd-radeon-vii": {
    gpuDie: "Vega 20 XT",
    baseClockMHz: 1400,
    boostClockMHz: 1750,
    memoryClockGbps: 2,
    fp64TFLOPS: 3.46,
    fp64Ratio: "1:4",
    l1CacheKB: 3840,
    l2CacheMB: 4,
    rops: 64,
    tmus: 240,
    dieSizeMm2: 331,
    transistorsBillion: 13.2,
    computeCapability: "ROCm gfx906 / Vega 20",
    ipcNotes: "GCN 5/Vega 20；HBM2 带宽在旧卡里仍很突出",
    llamaCppTgTokS: 44,
  },
  "bitmain-antminer-s19j-pro-hashboard": {
    computeCapability: "SHA-256 only（无通用 ISA）",
    // 每芯片含约 2016 个 SHA-256 哈希引擎（双级压缩函数流水）
    // 工作频率：典型 500–700 MHz（由矿池固件控制）
    // 片内仅有约几 KB SRAM/芯片用于流水线状态，无 L1/L2/L3 cache 概念
    // 无浮点单元，无通用寄存器堆，FP/INT TOPS 字段不适用
    ipcNotes: "BM1397D SHA-256 ASIC；每芯片 ~2016 哈希引擎 @ 400–800 MHz；片内 SRAM ≈ 几 KB/芯片（流水线缓冲）；无 FP ALU；无通用寄存器；无 DRAM",
  },
  "bitmain-antminer-s17-pro-hashboard": {
    computeCapability: "SHA-256 only（无通用 ISA）",
    ipcNotes: "BM1397 SHA-256 ASIC；架构与 S19 系列相同，频率稍低（典型 400–600 MHz）；片内 SRAM ≈ 几 KB/芯片；无 FP ALU；无通用寄存器；无 DRAM",
  },
  "xilinx-vu9p-bcu1525": {
    baseClockMHz: 200,
    boostClockMHz: 500,
    // on-chip SRAM：BRAM 36K×4320 ≈ 18.5 MB + URAM×960 ≈ 33.75 MB = 合计 ~52 MB
    l3CacheMB: 52,
    computeCapability: "FPGA（Vivado / Vitis / OpenCL）",
    ipcNotes: "XCVU9P-L2FSGD2104；DSP48E2×6840, LUT6×1,143,000, FF×2,364,480, BRAM×18.5 MB, URAM×33.75 MB；时钟频率因设计差异极大（100–500 MHz）；FP32/INT8 为资源全用时的理论上限",
    transistorsBillion: 21.0,
  },
  "amd-epyc-7742": {
    baseClockMHz: 2250,
    boostClockMHz: 3400,
    l3CacheMB: 256,
    computeCapability: "x86-64 / AVX2 / 8ch DDR4",
    ipcNotes: "Zen 2 单路 64 核；FP32 峰值按双 256-bit FMA 近似估算",
  },
  "amd-epyc-7b13": {
    baseClockMHz: 2450,
    boostClockMHz: 3650,
    l3CacheMB: 256,
    computeCapability: "x86-64 / AVX2 / 8ch DDR4",
    ipcNotes: "Zen 3 OEM 64 核；二手渠道常见，适合作为 CPU-only 对照",
  },
  "intel-xeon-platinum-8280": {
    baseClockMHz: 2700,
    boostClockMHz: 4000,
    l3CacheMB: 38.5,
    computeCapability: "x86-64 / AVX-512 / 6ch DDR4",
    ipcNotes: "Cascade Lake 单路 28 核；FP32 峰值按 AVX-512 FMA 近似估算",
  },
  "intel-xeon-platinum-8380": {
    baseClockMHz: 2300,
    boostClockMHz: 3400,
    l3CacheMB: 60,
    computeCapability: "x86-64 / AVX-512 / 8ch DDR4",
    ipcNotes: "Ice Lake 单路 40 核；适合和便宜高显存卡对比整机成本",
  },
};

const xianyuCnyById = {
  // Data Center
  "nvidia-h100-sxm-80gb": 150000,
  "nvidia-a100-sxm4-80gb": 65000,
  "nvidia-v100-sxm2-32gb": 8500,
  "nvidia-v100-pcie-16gb": 4200,
  "nvidia-p100-pcie-16gb": 1800,
  "nvidia-l40s": 45000,
  "amd-instinct-mi300x": 125000,
  "amd-instinct-mi250x": 32000,
  "cambricon-mlu370-x8": 14000,
  "huawei-ascend-910b": 80000,
  "huawei-ascend-310p3": 2500,
  "huawei-atlas-300i-pro": 1800,
  // Workstation
  "nvidia-rtx-6000-ada": 30000,
  "nvidia-a40": 9000,
  "amd-radeon-pro-w7900": 18000,
  "amd-radeon-pro-duo": 350,
  "nvidia-titan-v": 3500,
  "nvidia-titan-rtx": 5000,
  // FPGA / legacy accelerators
  "amd-alveo-u55c": 5000,
  "intel-stratix-10-nx": 12000,
  "intel-xeon-phi-7290f": 1500,
  "intel-xeon-phi-7210": 500,
  // Desktop NVIDIA
  "nvidia-rtx-5090": 20000,
  "nvidia-rtx-5080": 9500,
  "nvidia-rtx-5070-ti": 7000,
  "nvidia-rtx-5070": 5200,
  "nvidia-rtx-4090": 12500,
  "nvidia-rtx-4080-super": 6500,
  "nvidia-rtx-4070-ti-super": 4500,
  "nvidia-rtx-4070-super": 3000,
  "nvidia-rtx-5060-ti-16gb": 3200,
  "nvidia-rtx-4060-ti-16gb": 2000,
  "nvidia-rtx-3090-ti": 4200,
  "nvidia-rtx-3090": 3200,
  "nvidia-rtx-3080-10gb": 1700,
  "nvidia-rtx-3060-12gb": 700,
  "nvidia-cmp-40hx": 250,
  "nvidia-p106-100": 100,
  // Desktop AMD
  "amd-rx-9070-xt": 3200,
  "amd-rx-9070": 2700,
  "amd-rx-7900-xtx": 4000,
  "amd-rx-7900-xt": 3000,
  "amd-rx-7800-xt": 1800,
  "amd-rx-6800-xt": 1200,
  "amd-rx-580-8gb": 250,
  "amd-radeon-vii": 1600,
  // Intel
  "intel-arc-a770-16gb": 950,
  "intel-arc-b580": 1300,
  // Moore Threads / CPU / mining boards / FPGA
  "moore-threads-mtt-s80": 1500,
  "bitmain-antminer-s19j-pro-hashboard": 220,
  "bitmain-antminer-s17-pro-hashboard": 100,
  "xilinx-vu9p-bcu1525": 1200,
  "amd-epyc-7742": 2800,
  "amd-epyc-7b13": 4200,
  "intel-xeon-platinum-8280": 1600,
  "intel-xeon-platinum-8380": 2600,
};

const state = {
  gpus: loadStoredGpus(),
  visibleColumns: new Set(fieldDefs.filter((field) => field.visible).map((field) => field.key)),
  sortField: "vramGB",
  sortDirection: "desc",
  globalSearch: "",
  vendor: "all",
  segment: "all",
  accelType: "all",
  rules: [],
  compact: false,
};

const defaultVisibleColumns = new Set(fieldDefs.filter((field) => field.visible).map((field) => field.key));

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  segmentFilter: document.querySelector("#segmentFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  vendorFilter: document.querySelector("#vendorFilter"),
  sortField: document.querySelector("#sortField"),
  sortDirectionButton: document.querySelector("#sortDirectionButton"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  addRuleButton: document.querySelector("#addRuleButton"),
  filterRules: document.querySelector("#filterRules"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  gpuTable: document.querySelector("#gpuTable"),
  columnPicker: document.querySelector("#columnPicker"),
  toggleColumnsButton: document.querySelector("#toggleColumnsButton"),
  compactToggleButton: document.querySelector("#compactToggleButton"),
  visibleCount: document.querySelector("#visibleCount"),
  maxMemory: document.querySelector("#maxMemory"),
  bestPricePerGb: document.querySelector("#bestPricePerGb"),
  latestPriceDate: document.querySelector("#latestPriceDate"),
  priceDialog: document.querySelector("#priceDialog"),
  refreshPriceButton: document.querySelector("#refreshPriceButton"),
  pricePayload: document.querySelector("#pricePayload"),
  applyPriceButton: document.querySelector("#applyPriceButton"),
  loadLocalPriceButton: document.querySelector("#loadLocalPriceButton"),
  priceResult: document.querySelector("#priceResult"),
  importDialog: document.querySelector("#importDialog"),
  importDataButton: document.querySelector("#importDataButton"),
  importPayload: document.querySelector("#importPayload"),
  applyImportButton: document.querySelector("#applyImportButton"),
  importResult: document.querySelector("#importResult"),
  exportDataButton: document.querySelector("#exportDataButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
};

const VENDOR_LOGOS = {
  nvidia: "https://www.nvidia.com/favicon.ico",
  amd: "https://www.amd.com/favicon.ico",
  intel: "https://www.intel.com/favicon.ico",
  apple: "https://www.apple.com/favicon.ico",
  google: "https://www.google.com/favicon.ico",
  huawei: "https://consumer.huawei.com/favicon.ico",
  cambricon: "https://www.cambricon.com/favicon.ico",
  moorethreads: "https://www.mthreads.com/favicon.ico",
  bitmain: "https://www.bitmain.com/favicon.ico",
  xilinx: "https://www.xilinx.com/favicon.ico",
};

const SEGMENT_CLASS = {
  "Data Center": "seg-data-center",
  "Cloud Accelerator": "seg-cloud-accelerator",
  "Workstation": "seg-workstation",
  "Desktop": "seg-desktop",
  "Integrated": "seg-integrated",
  "Inference": "seg-inference",
  "FPGA": "seg-fpga",
  "Mining": "seg-mining",
  "Many-core CPU": "seg-many-core-cpu",
};

const ACCEL_TYPE_CLASS = {
  "GPU": "type-gpu",
  "TPU": "type-tpu",
  "NPU": "type-npu",
  "FPGA": "type-fpga",
  "ASIC": "type-asic",
  "Many-core CPU": "type-many-core-cpu",
};

init();

function init() {
  renderSelectOptions();
  renderColumnPicker();
  syncColumnPickerState();
  bindEvents();
  render();
}

function loadStoredGpus() {
  const stored = localStorage.getItem("unified-gpu-table-data");
  if (!stored) return seedGpus.map(normalizeGpu);
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return seedGpus.map(normalizeGpu);
    // Merge new seed GPUs that aren't already in stored data
    const storedIds = new Set(parsed.map(g => g.id));
    const newSeeds = seedGpus.filter(g => !storedIds.has(g.id)).map(normalizeGpu);
    return [...parsed.map(normalizeGpu), ...newSeeds];
  } catch {
    return seedGpus.map(normalizeGpu);
  }
}

function saveGpus() {
  localStorage.setItem("unified-gpu-table-data", JSON.stringify(state.gpus));
}

function normalizeGpu(gpu) {
  const normalized = { ...(specDetailsById[gpu.id] || {}), ...gpu };
  if (!normalized.acceleratorType) {
    normalized.acceleratorType = "GPU";
  }
  if (normalized.xianyu_cny == null && xianyuCnyById[gpu.id] != null) {
    normalized.xianyu_cny = xianyuCnyById[gpu.id];
  }
  for (const field of fieldDefs) {
    if (!(field.key in normalized) && !field.derived) {
      normalized[field.key] = null;
    }
  }
  normalized.id = normalized.id || slugify(normalized.model || crypto.randomUUID());
  return normalized;
}

function renderSelectOptions() {
  fillSelect(elements.segmentFilter, ["all", ...uniqueValues("segment")], "全部场景");
  fillSelect(elements.typeFilter, ["all", ...uniqueValues("acceleratorType")], "全部类型");
  fillSelect(elements.vendorFilter, ["all", ...uniqueValues("vendor")], "全部厂商");
  elements.sortField.innerHTML = fieldDefs
    .map(
      (field) =>
        `<option value="${field.key}" title="${escapeAttr(field.description || field.label)}">${field.label}</option>`,
    )
    .join("");
  elements.sortField.value = state.sortField;
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = values
    .map((value) => `<option value="${escapeAttr(value)}">${value === "all" ? allLabel : value}</option>`)
    .join("");
}

function uniqueValues(key) {
  return [...new Set(state.gpus.map((gpu) => gpu[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
}

function bindEvents() {
  elements.globalSearch.addEventListener("input", () => {
    state.globalSearch = elements.globalSearch.value.trim().toLowerCase();
    render();
  });

  elements.segmentFilter.addEventListener("change", () => {
    state.segment = elements.segmentFilter.value;
    render();
  });

  elements.typeFilter.addEventListener("change", () => {
    state.accelType = elements.typeFilter.value;
    render();
  });

  elements.vendorFilter.addEventListener("change", () => {
    state.vendor = elements.vendorFilter.value;
    render();
  });

  elements.sortField.addEventListener("change", () => {
    state.sortField = elements.sortField.value;
    render();
  });

  elements.sortDirectionButton.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
    render();
  });

  elements.resetFiltersButton.addEventListener("click", () => {
    state.globalSearch = "";
    state.vendor = "all";
    state.segment = "all";
    state.accelType = "all";
    state.rules = [];
    elements.globalSearch.value = "";
    elements.vendorFilter.value = "all";
    elements.segmentFilter.value = "all";
    elements.typeFilter.value = "all";
    renderRules();
    render();
  });

  elements.addRuleButton.addEventListener("click", () => {
    state.rules.push({ field: "vramGB", op: ">=", value: "24" });
    renderRules();
    render();
  });

  elements.toggleColumnsButton.addEventListener("click", () => {
    elements.columnPicker.hidden = !elements.columnPicker.hidden;
    syncColumnPickerState();
  });

  elements.columnPicker.addEventListener("click", (event) => {
    const action = event.target.closest("[data-column-action]")?.dataset.columnAction;
    if (!action) return;
    if (action === "select-all") {
      state.visibleColumns = new Set(fieldDefs.map((field) => field.key));
    }
    if (action === "reset-default") {
      state.visibleColumns = new Set(defaultVisibleColumns);
    }
    renderColumnPicker();
    render();
  });

  elements.columnPicker.addEventListener("change", (event) => {
    const input = event.target.closest("input[type='checkbox'][value]");
    if (!input) return;
    if (input.checked) {
      state.visibleColumns.add(input.value);
    } else {
      state.visibleColumns.delete(input.value);
    }
    renderColumnPicker();
    render();
  });

  elements.compactToggleButton.addEventListener("click", () => {
    state.compact = !state.compact;
    elements.gpuTable.classList.toggle("compact", state.compact);
  });

  elements.refreshPriceButton.addEventListener("click", () => {
    elements.pricePayload.value = JSON.stringify(samplePricePayload(), null, 2);
    elements.priceResult.textContent = "";
    elements.priceDialog.showModal();
  });

  elements.applyPriceButton.addEventListener("click", () => {
    applyPriceUpdatesFromTextarea();
  });

  elements.loadLocalPriceButton.addEventListener("click", async () => {
    await loadLocalPrices();
  });

  elements.importDataButton.addEventListener("click", () => {
    elements.importPayload.value = JSON.stringify(state.gpus.slice(0, 2), null, 2);
    elements.importResult.textContent = "";
    elements.importDialog.showModal();
  });

  elements.applyImportButton.addEventListener("click", () => {
    importGpuData();
  });

  elements.exportDataButton.addEventListener("click", () => {
    exportCurrentData();
  });

  elements.exportCsvButton.addEventListener("click", () => {
    exportCsv();
  });
}

function render() {
  const rows = getFilteredRows();
  renderSummary(rows);
  renderTable(rows);
}

function getFilteredRows() {
  const filtered = state.gpus
    .map(enrichGpuRow)
    .filter(matchesGlobalSearch)
    .filter((gpu) => state.vendor === "all" || gpu.vendor === state.vendor)
    .filter((gpu) => state.segment === "all" || gpu.segment === state.segment)
    .filter((gpu) => state.accelType === "all" || gpu.acceleratorType === state.accelType)
    .filter(matchesRules);

  const field = fieldDefs.find((item) => item.key === state.sortField);
  return filtered.sort((a, b) => compareValues(a[state.sortField], b[state.sortField], field?.type));
}

function enrichGpuRow(gpu) {
  const fp16 = isUsableNumber(gpu.fp16TFLOPS) ? Number(gpu.fp16TFLOPS) : null;
  const fp32 = isUsableNumber(gpu.fp32TFLOPS) ? Number(gpu.fp32TFLOPS) : null;
  const power = isUsableNumber(gpu.powerW) ? Number(gpu.powerW) : null;
  const price = isUsableNumber(gpu.priceUSD) ? Number(gpu.priceUSD) : null;
  const bw = isUsableNumber(gpu.bandwidthGBs) ? Number(gpu.bandwidthGBs) : null;
  const vram = isUsableNumber(gpu.vramGB) ? Number(gpu.vramGB) : null;
  return {
    ...gpu,
    pricePerGb: computePricePerGb(gpu),
    fp16PerWatt: fp16 && power ? Number((fp16 / power).toFixed(3)) : null,
    fp16PerDollar: fp16 && price ? Number((fp16 / price).toFixed(4)) : null,
    bwPerDollar: bw && price ? Number((bw / price).toFixed(4)) : null,
    fp32PerDollar: fp32 && price ? Number((fp32 / price).toFixed(4)) : null,
    vramPerDollar: vram && price ? Number((vram / price).toFixed(4)) : null,
    bwPerWatt: bw && power ? Number((bw / power).toFixed(3)) : null,
  };
}

function computeColumnStats(rows, columns) {
  const stats = {};
  for (const field of columns) {
    if (field.heatmap) {
      let values;
      if (field.type === "date") {
        values = rows.map(r => r[field.key]).filter(v => v && !isNaN(new Date(v).getTime())).map(v => new Date(v).getTime());
      } else {
        values = rows.map(r => r[field.key]).filter(isUsableNumber).map(Number);
      }
      stats[field.key] = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
    }
  }
  return stats;
}

function getHeatmapColor(percent) {
  if (percent < 50) return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
}

function compareValues(a, b, type) {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let result;
  if (type === "number") {
    result = Number(a) - Number(b);
  } else if (type === "date") {
    result = new Date(a).getTime() - new Date(b).getTime();
  } else {
    result = String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  }
  return state.sortDirection === "asc" ? result : -result;
}

function matchesGlobalSearch(gpu) {
  if (!state.globalSearch) return true;
  return fieldDefs.some((field) => String(gpu[field.key] ?? "").toLowerCase().includes(state.globalSearch));
}

function matchesRules(gpu) {
  return state.rules.every((rule) => {
    const field = fieldDefs.find((item) => item.key === rule.field);
    const actual = gpu[rule.field];
    const expected = rule.value;
    if (!expected) return true;
    if (field?.type === "number") {
      const left = Number(actual);
      const right = Number(expected);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (rule.op === ">=") return left >= right;
      if (rule.op === "<=") return left <= right;
      if (rule.op === ">") return left > right;
      if (rule.op === "<") return left < right;
      if (rule.op === "=") return left === right;
    }
    const left = String(actual ?? "").toLowerCase();
    const right = String(expected).toLowerCase();
    if (rule.op === "=") return left === right;
    if (rule.op === "!=") return left !== right;
    return left.includes(right);
  });
}

function renderSummary(rows) {
  elements.visibleCount.textContent = rows.length.toLocaleString("zh-CN");
  const maxMemory = max(rows.map((gpu) => gpu.vramGB));
  elements.maxMemory.textContent = maxMemory ? `${formatNumber(maxMemory)} GB` : "-";
  const bestPrice = min(rows.map((gpu) => gpu.pricePerGb));
  elements.bestPricePerGb.textContent = bestPrice ? `$${formatNumber(bestPrice)}` : "-";
  const latest = rows
    .map((gpu) => gpu.priceUpdated)
    .filter(Boolean)
    .sort()
    .at(-1);
  elements.latestPriceDate.textContent = latest || "-";
}

function renderTable(rows) {
  const columns = fieldDefs.filter((field) => state.visibleColumns.has(field.key));
  const stats = computeColumnStats(rows, columns);
  elements.tableHead.innerHTML = `<tr>${columns
    .map(
      (field) =>
        `<th><button type="button" data-sort="${field.key}" title="${escapeAttr(field.description || field.label)}">${formatHeaderLabel(field.label)}${sortMark(field.key)}</button></th>`,
    )
    .join("")}</tr>`;

  elements.tableBody.innerHTML = rows
    .map(
      (gpu) =>
        `<tr>${columns
          .map((field) => `<td>${formatCell(gpu, field, stats[field.key])}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  elements.tableHead.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.getAttribute("data-sort");
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDirection = "desc";
      }
      elements.sortField.value = state.sortField;
      elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
      render();
    });
  });
}

function renderRules() {
  elements.filterRules.innerHTML = state.rules
    .map(
      (rule, index) => `
        <div class="rule">
          <div>
            <label>字段</label>
            <select data-rule-field="${index}">
              ${fieldDefs.map((field) => `<option value="${field.key}" ${field.key === rule.field ? "selected" : ""}>${field.label}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>条件</label>
            <select data-rule-op="${index}">
              ${operatorOptions(rule.op)}
            </select>
          </div>
          <div>
            <label>值</label>
            <input data-rule-value="${index}" value="${escapeAttr(rule.value)}" />
          </div>
          <button class="ghost-button" data-rule-remove="${index}" type="button" title="删除条件">×</button>
        </div>
      `,
    )
    .join("");

  elements.filterRules.querySelectorAll("[data-rule-field]").forEach((select) => {
    select.addEventListener("change", () => {
      state.rules[Number(select.dataset.ruleField)].field = select.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-op]").forEach((select) => {
    select.addEventListener("change", () => {
      state.rules[Number(select.dataset.ruleOp)].op = select.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-value]").forEach((input) => {
    input.addEventListener("input", () => {
      state.rules[Number(input.dataset.ruleValue)].value = input.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rules.splice(Number(button.dataset.ruleRemove), 1);
      renderRules();
      render();
    });
  });
}

function renderColumnPicker() {
  const selectedCount = state.visibleColumns.size;
  const allSelected = selectedCount === fieldDefs.length;
  elements.columnPicker.innerHTML = `
    <div class="column-picker-head">
      <div>
        <p class="column-picker-title">显示列</p>
        <p class="column-picker-meta">已选 ${selectedCount} / ${fieldDefs.length}</p>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all" ${allSelected ? "disabled" : ""}>
          全选
        </button>
        <button class="text-button" type="button" data-column-action="reset-default">恢复默认</button>
      </div>
    </div>
    <div class="column-picker-grid">
      ${fieldDefs
        .map(
          (field) => `
            <label class="column-option" title="${escapeAttr(field.description || field.label)}">
              <input type="checkbox" value="${field.key}" ${state.visibleColumns.has(field.key) ? "checked" : ""} />
              <span>${field.label}</span>
            </label>
          `,
        )
        .join("")}
    </div>
  `;
  syncColumnPickerState();
}

function syncColumnPickerState() {
  const expanded = !elements.columnPicker.hidden;
  elements.toggleColumnsButton.setAttribute("aria-expanded", String(expanded));
  elements.toggleColumnsButton.textContent = `列设置 (${state.visibleColumns.size}/${fieldDefs.length})`;
}

function operatorOptions(selected) {
  const ops = ["contains", "=", "!=", ">=", "<=", ">", "<"];
  const labels = {
    contains: "包含",
    "=": "等于",
    "!=": "不等于",
    ">=": "大于等于",
    "<=": "小于等于",
    ">": "大于",
    "<": "小于",
  };
  return ops.map((op) => `<option value="${op}" ${op === selected ? "selected" : ""}>${labels[op]}</option>`).join("");
}


function vendorSlug(v) {
  return (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function renderVendorTag(vendor) {
  if (!vendor) return "-";
  const slug = vendorSlug(vendor);
  const logoUrl = VENDOR_LOGOS[slug];
  const img = logoUrl
    ? `<img class="vendor-logo" src="${escapeAttr(logoUrl)}" alt="" onerror="this.style.display='none'">`
    : "";
  return `<span class="tag vendor-tag vendor-${escapeAttr(slug)}">${img}${escapeHtml(vendor)}</span>`;
}


function archClass(arch) {
  if (!arch) return "";
  const a = arch.toLowerCase();
  if (a.includes("blackwell")) return "arch-blackwell";
  if (a.includes("ada")) return "arch-ada";
  if (a.includes("hopper")) return "arch-hopper";
  if (a.includes("ampere")) return "arch-ampere";
  if (a.includes("turing")) return "arch-turing";
  if (a.includes("volta")) return "arch-volta";
  if (a.includes("pascal")) return "arch-pascal";
  if (a.includes("rdna 4") || a.includes("rdna4")) return "arch-rdna4";
  if (a.includes("rdna 3") || a.includes("rdna3")) return "arch-rdna3";
  if (a.includes("rdna 2") || a.includes("rdna2")) return "arch-rdna2";
  if (a.includes("cdna")) return "arch-cdna";
  if (a.includes("gcn")) return "arch-gcn";
  if (a.includes("tpu")) return "arch-tpu-chip";
  if (a.includes("da vinci") || a.includes("ascend")) return "arch-ascend";
  if (a.includes("knights")) return "arch-kni";
  if (a.includes("xe2") || a.includes("battlemage")) return "arch-xe2";
  if (a.includes("xe-hpg") || a.includes("alchemist") || a.startsWith("xe")) return "arch-xe";
  if (a.includes("versal") || a.includes("ultrascale")) return "arch-versal";
  if (a.includes("stratix")) return "arch-stratix";
  if (a.includes("apple gpu")) return "arch-apple-gpu";
  return "";
}

function formatCell(gpu, field, stat) {
  const value = gpu[field.key];
  // Determine numeric value for heatmap (supports both numbers and dates)
  let heatmapNum = null;
  if (field.heatmap && stat) {
    if (field.type === "date" && value && !isNaN(new Date(value).getTime())) {
      heatmapNum = new Date(value).getTime();
    } else if (isUsableNumber(value)) {
      heatmapNum = Number(value);
    }
  }
  if (heatmapNum !== null) {
    const lengthPercent = ((heatmapNum - stat.min) / (stat.max - stat.min || 1)) * 100;
    const colorPercent = field.inverseHeatmap ? 100 - lengthPercent : lengthPercent;
    const color = getHeatmapColor(colorPercent);
    let displayStr;
    if (field.type === "date") displayStr = String(value);
    else if (field.key === "priceUSD" || field.key === "msrpUSD") displayStr = `$${formatNumber(heatmapNum)}`;
    else if (field.key === "xianyu_cny") displayStr = `¥${formatNumber(heatmapNum)}`;
    else if (field.key === "pricePerGb") displayStr = `$${heatmapNum.toFixed(2)}`;
    else if (field.derived) displayStr = heatmapNum < 1 ? heatmapNum.toFixed(4) : heatmapNum.toFixed(3);
    else displayStr = formatNumber(heatmapNum);
    return `<div class="heatmap-container mini" title="${displayStr}"><div class="heatmap-bar" style="width:${Math.max(0, Math.min(100, lengthPercent)).toFixed(1)}%;background:${color}"></div><span class="heatmap-value">${escapeHtml(displayStr)}</span></div>`;
  }
  if (field.key === "model") return `<span class="model-cell">${escapeHtml(value)}</span>`;
  if (field.key === "vendor") return renderVendorTag(value);
  if (field.key === "segment") {
    const cls = SEGMENT_CLASS[value] || "";
    return value ? `<span class="tag ${cls}">${escapeHtml(value)}</span>` : "-";
  }
  if (field.key === "acceleratorType") {
    const cls = ACCEL_TYPE_CLASS[value] || "";
    return value ? `<span class="tag ${cls}">${escapeHtml(value)}</span>` : "-";
  }
  if (field.key === "architecture") {
    const cls = archClass(value);
    return value ? `<span class="tag ${cls}">${escapeHtml(value)}</span>` : "-";
  }
  if (field.key === "priceUSD") return value ? `$${formatNumber(value)}` : "-";
  if (field.key === "xianyu_cny") return value ? `¥${formatNumber(value)}` : "-";
  if (field.key === "pricePerGb") return value ? `$${formatNumber(value)}` : "-";
  if (field.key === "priceUpdated") return formatPriceDate(value);
  if (field.type === "url" && value) {
    const safeUrl = sanitizeUrl(value);
    if (!safeUrl) return "-";
    return `<a class="source-link" href="${escapeAttr(safeUrl)}" target="_blank" rel="noreferrer">打开</a>`;
  }
  if (field.type === "number") return value === null || value === undefined ? "-" : formatNumber(value);
  return escapeHtml(value ?? "-");
}

function formatPriceDate(date) {
  if (!date) return "-";
  const ageDays = (Date.now() - new Date(date).getTime()) / 86400000;
  const className = ageDays > 30 ? "stale" : "fresh";
  return `<span class="${className}">${escapeHtml(date)}</span>`;
}

function sortMark(field) {
  if (field !== state.sortField) return "";
  return state.sortDirection === "asc" ? " ↑" : " ↓";
}

function formatHeaderLabel(label) {
  const parts = String(label).split(" ");
  if (parts.length < 2) return escapeHtml(label);
  return `${escapeHtml(parts.slice(0, -1).join(" "))}<span class="header-unit">${escapeHtml(parts.at(-1))}</span>`;
}

function computePricePerGb(gpu) {
  if (!gpu.priceUSD || !gpu.vramGB) return null;
  return Number((gpu.priceUSD / gpu.vramGB).toFixed(2));
}

function samplePricePayload() {
  return [
    {
      model: "NVIDIA GeForce RTX 4090",
      priceUSD: 1799,
      merchant: "manual quote",
      source: "local",
      available: true,
    },
    {
      id: "amd-rx-7900-xtx",
      priceUSD: 879,
      merchant: "manual quote",
      source: "local",
      available: true,
    },
  ];
}

async function loadLocalPrices() {
  try {
    const response = await fetch(`data/prices.json?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    elements.pricePayload.value = JSON.stringify(payload, null, 2);
    elements.priceResult.textContent = "已读取 data/prices.json，可点击应用更新。";
  } catch (error) {
    elements.priceResult.textContent = `读取失败：${error.message}\n如果通过 file:// 打开，浏览器可能阻止 fetch；可直接粘贴 JSON。`;
  }
}

function applyPriceUpdatesFromTextarea() {
  try {
    const updates = JSON.parse(elements.pricePayload.value);
    if (!Array.isArray(updates)) throw new Error("价格数据必须是数组。");
    const today = new Date().toISOString().slice(0, 10);
    let matched = 0;
    const missing = [];

    updates.forEach((update) => {
      const gpu = state.gpus.find(
        (item) => (update.id && item.id === update.id) || (update.model && item.model === update.model),
      );
      if (!gpu) {
        missing.push(update.id || update.model || "(unknown)");
        return;
      }
      matched += 1;
      gpu.priceUSD = normalizeNumber(update.priceUSD, gpu.priceUSD);
      gpu.priceUpdated = update.priceUpdated || today;
      gpu.merchant = update.merchant ?? gpu.merchant;
      gpu.priceSource = update.source ?? gpu.priceSource;
      gpu.source = update.url ?? gpu.source;
      gpu.available = update.available ?? gpu.available;
    });

    saveGpus();
    renderSelectOptions();
    render();
    elements.priceResult.textContent = `已更新 ${matched} 条价格。${missing.length ? `\n未匹配：${missing.join(", ")}` : ""}`;
  } catch (error) {
    elements.priceResult.textContent = `解析失败：${error.message}`;
  }
}

function importGpuData() {
  try {
    const incoming = JSON.parse(elements.importPayload.value);
    if (!Array.isArray(incoming)) throw new Error("导入数据必须是数组。");
    let changed = 0;
    incoming.map(normalizeGpu).forEach((gpu) => {
      const index = state.gpus.findIndex((item) => item.id === gpu.id);
      if (index >= 0) {
        state.gpus[index] = { ...state.gpus[index], ...gpu };
      } else {
        state.gpus.push(gpu);
      }
      changed += 1;
    });
    saveGpus();
    renderSelectOptions();
    render();
    elements.importResult.textContent = `已导入或更新 ${changed} 条 GPU 数据。`;
  } catch (error) {
    elements.importResult.textContent = `导入失败：${error.message}`;
  }
}

function exportCurrentData() {
  const payload = JSON.stringify(getFilteredRows(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `gpu-table-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const activeFields = fieldDefs.filter(f => state.visibleColumns.has(f.key));
  const rows = getFilteredRows();
  const escape = v => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = activeFields.map(f => escape(f.label)).join(",");
  const body = rows.map(r => activeFields.map(f => escape(r[f.key])).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gpu-table-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function min(values) {
  const clean = values.filter(isUsableNumber).map(Number);
  return clean.length ? Math.min(...clean) : null;
}

function max(values) {
  const clean = values.filter(isUsableNumber).map(Number);
  return clean.length ? Math.max(...clean) : null;
}

function isUsableNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function formatNumber(value) {
  return Number(value).toLocaleString("zh-CN", {
    maximumFractionDigits: Number(value) >= 100 ? 0 : 2,
  });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
