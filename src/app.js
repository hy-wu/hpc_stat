const fieldDefs = [
  { key: "model", label: "型号", type: "text", visible: true },
  { key: "vendor", label: "厂商", type: "text", visible: true },
  { key: "segment", label: "场景", type: "text", visible: true },
  { key: "architecture", label: "架构", type: "text", visible: true },
  { key: "releaseDate", label: "发布", type: "date", visible: true },
  { key: "vramGB", label: "显存 GB", type: "number", visible: true },
  { key: "memoryType", label: "显存类型", type: "text", visible: true },
  { key: "bandwidthGBs", label: "带宽 GB/s", type: "number", visible: true },
  { key: "fp32TFLOPS", label: "FP32 TFLOPS", type: "number", visible: true },
  { key: "fp16TFLOPS", label: "FP16 TFLOPS", type: "number", visible: true },
  { key: "bf16TFLOPS", label: "BF16 TFLOPS", type: "number", visible: true },
  { key: "fp8TFLOPS", label: "FP8 TFLOPS", type: "number", visible: true },
  { key: "int8TOPS", label: "INT8 TOPS", type: "number", visible: true },
  { key: "powerW", label: "功耗 W", type: "number", visible: true },
  { key: "priceUSD", label: "价格 USD", type: "number", visible: true },
  { key: "pricePerGb", label: "$/GB", type: "number", visible: true, derived: true },
  { key: "priceUpdated", label: "价格日期", type: "date", visible: true },
  { key: "cudaCores", label: "CUDA/SP", type: "number", visible: false },
  { key: "tensorCores", label: "Tensor/XMX", type: "number", visible: false },
  { key: "rtCores", label: "RT Core", type: "number", visible: false },
  { key: "computeUnits", label: "CU/SM/Xe", type: "number", visible: false },
  { key: "processNode", label: "制程", type: "text", visible: false },
  { key: "memoryBusBit", label: "位宽 bit", type: "number", visible: false },
  { key: "pcie", label: "PCIe", type: "text", visible: false },
  { key: "nvlinkGBs", label: "互联 GB/s", type: "number", visible: false },
  { key: "msrpUSD", label: "MSRP USD", type: "number", visible: false },
  { key: "merchant", label: "价格商家", type: "text", visible: false },
  { key: "source", label: "来源", type: "url", visible: false },
  { key: "notes", label: "备注", type: "text", visible: false },
];

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
];

const state = {
  gpus: loadStoredGpus(),
  visibleColumns: new Set(fieldDefs.filter((field) => field.visible).map((field) => field.key)),
  sortField: "vramGB",
  sortDirection: "desc",
  globalSearch: "",
  vendor: "all",
  segment: "all",
  rules: [],
  compact: false,
};

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  segmentFilter: document.querySelector("#segmentFilter"),
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
};

init();

function init() {
  renderSelectOptions();
  renderColumnPicker();
  bindEvents();
  render();
}

function loadStoredGpus() {
  const stored = localStorage.getItem("unified-gpu-table-data");
  if (!stored) return seedGpus.map(normalizeGpu);
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeGpu) : seedGpus.map(normalizeGpu);
  } catch {
    return seedGpus.map(normalizeGpu);
  }
}

function saveGpus() {
  localStorage.setItem("unified-gpu-table-data", JSON.stringify(state.gpus));
}

function normalizeGpu(gpu) {
  const normalized = { ...gpu };
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
  fillSelect(elements.vendorFilter, ["all", ...uniqueValues("vendor")], "全部厂商");
  elements.sortField.innerHTML = fieldDefs
    .map((field) => `<option value="${field.key}">${field.label}</option>`)
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
    state.rules = [];
    elements.globalSearch.value = "";
    elements.vendorFilter.value = "all";
    elements.segmentFilter.value = "all";
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
}

function render() {
  const rows = getFilteredRows();
  renderSummary(rows);
  renderTable(rows);
}

function getFilteredRows() {
  const filtered = state.gpus
    .map((gpu) => ({ ...gpu, pricePerGb: computePricePerGb(gpu) }))
    .filter(matchesGlobalSearch)
    .filter((gpu) => state.vendor === "all" || gpu.vendor === state.vendor)
    .filter((gpu) => state.segment === "all" || gpu.segment === state.segment)
    .filter(matchesRules);

  const field = fieldDefs.find((item) => item.key === state.sortField);
  return filtered.sort((a, b) => compareValues(a[state.sortField], b[state.sortField], field?.type));
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
  elements.tableHead.innerHTML = `<tr>${columns
    .map(
      (field) =>
        `<th><button type="button" data-sort="${field.key}">${field.label}${sortMark(field.key)}</button></th>`,
    )
    .join("")}</tr>`;

  elements.tableBody.innerHTML = rows
    .map(
      (gpu) =>
        `<tr>${columns
          .map((field) => `<td>${formatCell(gpu, field)}</td>`)
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
  elements.columnPicker.innerHTML = fieldDefs
    .map(
      (field) => `
        <label>
          <input type="checkbox" value="${field.key}" ${state.visibleColumns.has(field.key) ? "checked" : ""} />
          ${field.label}
        </label>
      `,
    )
    .join("");

  elements.columnPicker.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.visibleColumns.add(input.value);
      } else {
        state.visibleColumns.delete(input.value);
      }
      render();
    });
  });
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

function formatCell(gpu, field) {
  const value = gpu[field.key];
  if (field.key === "model") return `<span class="model-cell">${escapeHtml(value)}</span>`;
  if (field.key === "segment") return `<span class="tag">${escapeHtml(value)}</span>`;
  if (field.key === "priceUSD") return value ? `$${formatNumber(value)}` : "-";
  if (field.key === "pricePerGb") return value ? `$${formatNumber(value)}` : "-";
  if (field.key === "priceUpdated") return formatPriceDate(value);
  if (field.type === "url" && value) {
    return `<a class="source-link" href="${escapeAttr(value)}" target="_blank" rel="noreferrer">打开</a>`;
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
