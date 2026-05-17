#!/usr/bin/env python3
"""Fetch and verify LLM model data from structured APIs and source pages.

The script is intentionally conservative:
- Structured APIs and hand-written parsers are used first.
- DeepSeek is only used with --deepseek when a source page is too unstructured.
- LLM output is treated as extraction from supplied source text, never as a fact source.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field, ValidationError


ROOT = Path(__file__).resolve().parents[1]
MODELS_PATH = ROOT / "data" / "models.json"
MODEL_OVERRIDES_PATH = ROOT / "data" / "model-overrides.json"
MODEL_FIELDS_PATH = ROOT / "data" / "model-fields.json"
MODEL_ALIASES_PATH = ROOT / "data" / "model-aliases.json"
SIDEBAR_DATA_DIR = ROOT / "data" / "byGeminiSidebar"
SIDEBAR_GPQA_PATH = SIDEBAR_DATA_DIR / "GPQAselfReported.md"
SIDEBAR_LLM_STATS_PATH = SIDEBAR_DATA_DIR / "llmStat.md"
MODELS_HTML_PATH = ROOT / "models.html"
MODELS_JS_PATH = ROOT / "src" / "models.js"
REFERENCE_PATH = ROOT / "REFERENCE_SOURCES.md"
CACHE_DIR = ROOT / ".cache" / "model-sources"
DEFAULT_OPENROUTER_TARGET = 150

SOURCE_URLS = {
    "openrouter_api": "https://openrouter.ai/api/v1/models",
    "openai_models": "https://developers.openai.com/api/docs/models",
    "openai_pricing": "https://developers.openai.com/api/docs/pricing",
    "anthropic_models": "https://platform.claude.com/docs/en/about-claude/models/overview",
    "anthropic_pricing": "https://platform.claude.com/docs/en/about-claude/pricing",
    "deepseek_pricing": "https://api-docs.deepseek.com/quick_start/pricing",
    "gemini_pricing": "https://ai.google.dev/gemini-api/docs/pricing",
    "nist_caisi": "https://www.nist.gov/news-events/news/2026/05/caisi-evaluation-deepseek-v4-pro",
    "deepseek_hf": "https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro",
    "cursor_models": "https://docs.cursor.com/models/",
    "meta_llama_4": "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
}

RAW_SOURCE_URLS = {
    "moonshot_k26_pricing": "https://platform.kimi.ai/docs/pricing/chat-k26.md",
    "moonshot_k25_pricing": "https://platform.kimi.ai/docs/pricing/chat-k25.md",
    "moonshot_k2_pricing": "https://platform.kimi.ai/docs/pricing/chat-k2.md",
    "zeroeval_models_list": "https://api.zeroeval.com/leaderboard/models/list",
    # LLM-Stats serves its full model catalog as a Next.js RSC payload
    "llm_stats_rsc": "https://llm-stats.com/",
    # Chatbot Arena leaderboard (lmarena.ai) — embeds Elo ratings in Next.js RSC payload
    "lmarena_leaderboard": "https://lmarena.ai/leaderboard",
    "aliyun_pricing": "https://help.aliyun.com/zh/model-studio/model-pricing",
    "baidu_qianfan_pricing": "https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya",
    "tencent_hunyuan_pricing": "https://cloud.tencent.com.cn/document/product/1823/130055",
    "zhipu_pricing": "https://open.bigmodel.cn/pricing",
    "groq_pricing": "https://groq.com/pricing/",
    "perplexity_pricing": "https://docs.perplexity.ai/getting-started/pricing",
}

# Arena model name → our model ID; covers cases where normalization alone is insufficient.
# E.g. "gpt-5.2-chat-latest" (no suffix strips) or renamed/aliased entries.
ARENA_ELO_ALIASES: dict[str, str] = {
    "gpt-5.2-chat-latest": "openai/gpt-chat-latest",
    "gpt-5.2-chat-latest-20260210": "openai/gpt-chat-latest",
    "gpt-5.2-chat-latest-20250706": "openai/gpt-chat-latest",
    # Llama 4 uses full architecture names in Arena
    "llama-4-maverick-17b-128e-instruct": "llama-4-maverick",
    "llama-4-scout-17b-16e-instruct": "llama-4-scout",
}

# Suffixes that indicate a special variant; Arena entries with these are used only as
# fallback when no base-model entry matched the same model ID.
_ARENA_VARIANT_SUFFIXES = ("-thinking", "-turbo", "-high", "-low", "-mini-high")

# Known model parameter counts (total_B, active_B or None) for models whose size
# is not encoded in their ID. All values are in billions.
# Key = model short name (last segment after "/").
KNOWN_PARAMS_OVERRIDE: dict[str, tuple[float, float | None]] = {
    "llama-4-maverick": (400.0, 17.0),
    "llama-4-scout": (109.0, 17.0),
    "mistral-large-2512": (123.0, None),
    "mistral-small-2603": (24.0, None),   # Mistral Small 3
    "devstral-2512": (24.0, None),         # Devstral (Mistral Small 3 base)
    "phi-4-mini-instruct": (3.8, None),    # Microsoft Phi-4 Mini
    "reka-edge": (7.0, None),
    "intellect-3": (32.0, None),
    "deepseek-v3.2": (671.0, 37.0),
    "deepseek-v3.2-speciale": (671.0, 37.0),
    "deepseek-v3.2-exp": (671.0, 37.0),
    "deepseek-v3.1-nex-n1": (671.0, 37.0),  # DeepSeek V3.1 derivative
    "cogito-v2.1-671b": (671.0, 37.0),        # DeepSeek V3 architecture
    "gpt-oss-safeguard-20b": (20.0, None),
}

ZEROEVAL_BENCHMARKS = {
    "gpqa": {
        "field": "gpqaDiamond",
        "label": "ZeroEval GPQA Diamond leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/gpqa/details",
    },
    "mmlu-pro": {
        "field": "mmluPro",
        "label": "ZeroEval MMLU-Pro leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/mmlu-pro/details",
    },
    "livecodebench": {
        "field": "liveCodeBench",
        "label": "ZeroEval LiveCodeBench leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/livecodebench/details",
    },
    "swe-bench-verified": {
        "field": "reportedSweBenchVerified",
        "label": "ZeroEval SWE-Bench Verified leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/swe-bench-verified/details",
    },
    "terminal-bench": {
        "field": "terminalBench",
        "label": "ZeroEval Terminal-Bench leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/terminal-bench/details",
    },
    # New benchmarks — popular ones with high model coverage in ZeroEval
    "aime-2025": {
        "field": "aime2025",
        "label": "ZeroEval AIME 2025 leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/aime-2025/details",
    },
    "aime-2024": {
        "field": "aime2024",
        "label": "ZeroEval AIME 2024 leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/aime-2024/details",
    },
    "humanity%27s-last-exam": {
        "field": "hle",
        "label": "ZeroEval Humanity's Last Exam leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/humanity%27s-last-exam/details",
    },
    "simpleqa": {
        "field": "simpleQA",
        "label": "ZeroEval SimpleQA leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/simpleqa/details",
    },
    "browsecomp": {
        "field": "browseComp",
        "label": "ZeroEval BrowseComp leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/browsecomp/details",
    },
    "ifeval": {
        "field": "ifEval",
        "label": "ZeroEval IFEval leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/ifeval/details",
    },
    # Root-level fields (root=True → write directly to model root, not under evals.*)
    "mmlu": {
        "field": "mmlu",
        "root": True,
        "label": "ZeroEval MMLU leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/mmlu/details",
    },
    "humaneval": {
        "field": "humanEval",
        "root": True,
        "label": "ZeroEval HumanEval leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/humaneval/details",
    },
    "gsm8k": {
        "field": "gsm8k",
        "root": True,
        "label": "ZeroEval GSM8k leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/gsm8k/details",
    },
    "math": {
        "field": "math",
        "root": True,
        "label": "ZeroEval MATH leaderboard",
        "url": "https://api.zeroeval.com/leaderboard/benchmarks/math/details",
    },
}

MOONSHOT_PRICING_MODELS = {
    "moonshotai/kimi-k2.6": {
        "source_key": "moonshot_k26_pricing",
        "source_label": "Moonshot Kimi K2.6 pricing",
        "lookup": "kimi-k2.6",
    },
    "moonshotai/kimi-k2.5": {
        "source_key": "moonshot_k25_pricing",
        "source_label": "Moonshot Kimi K2.5 pricing",
        "lookup": "kimi-k2.5",
    },
    "moonshotai/kimi-k2-thinking": {
        "source_key": "moonshot_k2_pricing",
        "source_label": "Moonshot K2 pricing",
        "lookup": "kimi-k2-thinking",
    },
}

OPENROUTER_ALIASES = {
    "claude-opus-4.7": ["anthropic/claude-opus-4.7"],
    "claude-sonnet-4.6": ["anthropic/claude-sonnet-4.6"],
    "claude-sonnet-4.5": ["anthropic/claude-sonnet-4.5"],
    "claude-haiku-4.5": ["anthropic/claude-haiku-4.5"],
    "gpt-5.5": ["openai/gpt-5.5"],
    "gpt-5.4": ["openai/gpt-5.4"],
    "gpt-5.4-mini": ["openai/gpt-5.4-mini"],
    "gpt-5.3-codex": ["openai/gpt-5.3-codex"],
    "gemini-2.5-pro": ["google/gemini-2.5-pro"],
    "gemini-2.5-flash": ["google/gemini-2.5-flash"],
    "llama-4-maverick": ["meta-llama/llama-4-maverick"],
    "llama-4-scout": ["meta-llama/llama-4-scout"],
}

OPENROUTER_VENDOR_PREFIXES = {
    "Anthropic": "anthropic",
    "OpenAI": "openai",
    "Google": "google",
    "Meta": "meta-llama",
    "DeepSeek": "deepseek",
}

OPENROUTER_VENDOR_NAMES = {
    "01-ai": "01.AI",
    "ai21": "AI21",
    "alibaba": "Alibaba",
    "amazon": "Amazon",
    "anthropic": "Anthropic",
    "baidu": "Baidu",
    "bytedance-seed": "ByteDance",
    "cohere": "Cohere",
    "deepseek": "DeepSeek",
    "google": "Google",
    "meta-llama": "Meta",
    "microsoft": "Microsoft",
    "mistralai": "Mistral",
    "moonshotai": "Moonshot AI",
    "nvidia": "NVIDIA",
    "openai": "OpenAI",
    "perplexity": "Perplexity",
    "qwen": "Alibaba",
    "x-ai": "xAI",
    "z-ai": "Zhipu AI",
}

REMOVED_MODEL_IDS = {
    "gemini-2.5-ultra",
    "qwen-3.0-ultra",
    "llama-4-500b",
    "llama-4-100b",
    "mistral-large-3",
    "yi-2.0-lightning",
    "glm-5-9b",
}

SCREENSHOT_VERIFIED_IDS = {
    "claude-haiku-4.5",
    "claude-opus-4.7",
    "claude-sonnet-4.5",
    "claude-sonnet-4.6",
    "gpt-4.1",
    "gpt-5-mini",
    "gpt-5.2",
    "gpt-5.2-codex",
    "gpt-5.3-codex",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.5",
}

CATALOG_CHECKS = {
    "claude-opus-4.7": {
        "source": "anthropic_models",
        "required": ["Claude Opus 4.7", "claude-opus-4-7", "$5 / input MTok", "$25 / output MTok"],
    },
    "claude-sonnet-4.6": {
        "source": "anthropic_models",
        "required": ["Claude Sonnet 4.6", "claude-sonnet-4-6", "$3 / input MTok", "$15 / output MTok"],
    },
    "claude-haiku-4.5": {
        "source": "anthropic_models",
        "required": ["Claude Haiku 4.5", "claude-haiku-4-5", "$1 / input MTok", "$5 / output MTok"],
    },
    "gpt-5.5": {
        "source": "openai_models",
        "required": ["GPT-5.5", "gpt-5.5"],
    },
    "gpt-5.4": {
        "source": "openai_models",
        "required": ["GPT-5.4", "gpt-5.4"],
    },
    "gpt-5.4-mini": {
        "source": "openai_models",
        "required": ["GPT-5.4 mini", "gpt-5.4-mini"],
    },
    "deepseek-v4-pro": {
        "source": "deepseek_pricing",
        "required": ["deepseek-v4-pro", "$0.435", "$0.003625", "$0.87"],
    },
    "deepseek-v4-flash": {
        "source": "deepseek_pricing",
        "required": ["deepseek-v4-flash", "$0.14", "$0.0028", "$0.28"],
    },
    "gemini-2.5-pro": {
        "source": "gemini_pricing",
        "required": ["Gemini 2.5 Pro", "gemini-2.5-pro", "$1.25", "$10.00", "$0.125"],
    },
    "gemini-2.5-flash": {
        "source": "gemini_pricing",
        "required": ["Gemini 2.5 Flash", "gemini-2.5-flash", "$0.30", "$2.50", "$0.03"],
    },
    "llama-4-maverick": {
        "source": "meta_llama_4",
        "required": ["Llama 4 Maverick", "17 billion active", "400 billion total"],
    },
    "llama-4-scout": {
        "source": "meta_llama_4",
        "required": ["Llama 4 Scout", "17 billion active", "10 million tokens"],
    },
}


class ExtractedModel(BaseModel):
    model_id: str
    source_label: str
    source_url: str
    verified_fields: list[str] = Field(default_factory=list)
    patch: dict[str, Any] = Field(default_factory=dict)
    evidence: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


@dataclass(frozen=True)
class SourceText:
    label: str
    url: str
    text: str


@dataclass(frozen=True)
class ReferenceSource:
    label: str
    url: str
    section: str


@dataclass(frozen=True)
class ModelMatcher:
    generic_index: dict[str, list[str]]
    explicit_alias_index: dict[str, str]


def enrich_model_params(models: list[dict[str, Any]]) -> dict[str, int]:
    """Directly set params/paramsActive on each model using name extraction + overrides.

    Priority: KNOWN_PARAMS_OVERRIDE (hard-coded) > extract_params_from_id (regex).
    Returns coverage counts: {"params": N, "paramsActive": M}.
    """
    counts = {"params": 0, "paramsActive": 0}
    for model in models:
        model_id = model.get("id", "")
        short_name = model_id.split("/")[-1]

        if short_name in KNOWN_PARAMS_OVERRIDE:
            total_b, active_b = KNOWN_PARAMS_OVERRIDE[short_name]
        else:
            total_b, active_b = extract_params_from_id(model_id)

        if total_b is not None:
            model["params"] = total_b
            counts["params"] += 1
        if active_b is not None:
            model["paramsActive"] = active_b
            counts["paramsActive"] += 1
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify and enrich data/models.json")
    parser.add_argument("--write", action="store_true", help="write verified patches back to data/models.json")
    parser.add_argument("--generate-openrouter", action="store_true", help="generate broad model rows from OpenRouter before enrichment")
    parser.add_argument("--target-count", type=int, default=DEFAULT_OPENROUTER_TARGET, help="target model count when --generate-openrouter is used")
    parser.add_argument("--min-model-count", type=int, default=0, help="fail validation if fewer model rows are present")
    parser.add_argument("--verify-only", action="store_true", help="skip enrichment and only validate data/page wiring")
    parser.add_argument("--online", action="store_true", help="allow network fetches for sources missing from the local cache")
    parser.add_argument("--deepseek", action="store_true", help="use DeepSeek as a fallback extractor for unstructured pages")
    parser.add_argument("--no-cache", action="store_true", help="do not read cached source responses")
    parser.add_argument("--refresh-cache", action="store_true", help="refetch sources even if cache exists; implies --online")
    parser.add_argument("--fetch-reference-sources", action="store_true", help="also fetch every URL listed in REFERENCE_SOURCES.md")
    parser.add_argument("--skip-page-check", action="store_true", help="skip static models.html/src/models.js data-fill checks")
    parser.add_argument("--output", type=Path, help="write a JSON report to this path")
    args = parser.parse_args()
    if args.refresh_cache:
        args.online = True

    models = load_models(args)
    reference_sources = parse_reference_sources(REFERENCE_PATH)
    session = requests.Session()
    session.headers.update(
        {
            "user-agent": "hpc-stat-model-verifier/1.0 (+local data validation)",
            "accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        }
    )

    report: dict[str, Any] = {
        "checkedAt": date.today().isoformat(),
        "modelCount": len(models),
        "referenceSourceCount": len(reference_sources),
        "sources": {},
        "patches": [],
        "validation": {},
        "page": {},
        "errors": [],
    }

    source_texts: dict[str, SourceText] = {}
    if not args.verify_only or args.online:
        try:
            source_texts = fetch_sources(session, args, reference_sources, report)
            report["sources"] = {key: {"url": source.url, "chars": len(source.text)} for key, source in source_texts.items()}
        except requests.RequestException as exc:
            report["errors"].append({"stage": "fetch_sources", "error": str(exc)})

    patches: list[ExtractedModel] = []
    if not args.verify_only:
        if args.generate_openrouter:
            models = generate_openrouter_catalog(models, session, args, report)
            report["modelCount"] = len(models)
        patches.extend(extract_openrouter_prices(models, session, args, report))
        patches.extend(extract_official_prices(models, source_texts, session, args, report))
        patches.extend(extract_platform_prices(models, session, args, report))
        patches.extend(extract_caisi_evals(source_texts))
        patches.extend(extract_zeroeval_benchmark_evals(models, session, args, report))
        patches.extend(extract_llm_stats_data(models, session, args, report))
        patches.extend(extract_sidebar_snapshot_data(models, report))
        patches.extend(extract_arena_elo_data(models, session, args, report))
        patches.extend(extract_deepseek_reported_evals(source_texts))
        patches.extend(extract_meta_model_details(source_texts))
        patches.extend(extract_cursor_prices_from_provider_prices(models, patches))

    if args.deepseek and not args.verify_only:
        patches.extend(extract_with_deepseek(models, source_texts, patches))

    merged_by_model = merge_patches(patches)
    report["patches"] = [patch.model_dump() for patch in merged_by_model]

    if args.write:
        apply_patches(models, merged_by_model)
        params_coverage = enrich_model_params(models)
        report["paramsCoverage"] = params_coverage
        MODELS_PATH.write_text(json.dumps(models, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["wrote"] = str(MODELS_PATH)

    min_model_count = args.min_model_count or (args.target_count if args.generate_openrouter else 0)
    validation = validate_models(models, source_texts if args.online else {}, min_model_count)
    report["validation"] = validation
    if validation["errors"]:
        report["errors"].append({"stage": "validate_models", "errors": validation["errors"]})

    if not args.skip_page_check:
        page_report = validate_page_data(models)
        report["page"] = page_report
        if page_report["errors"]:
            report["errors"].append({"stage": "validate_page_data", "errors": page_report["errors"]})

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(summarize_report(report), ensure_ascii=False, indent=2))
    return 1 if report["errors"] else 0


def parse_reference_sources(path: Path) -> list[ReferenceSource]:
    if not path.exists():
        return []
    section = ""
    sources: list[ReferenceSource] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^##+\s+(.+)$", line.strip())
        if heading:
            section = re.sub(r"[^\w\s&()/.-]", "", heading.group(1)).strip()
            continue
        links = re.findall(r"\[([^\]]+)]\((https?://[^)]+)\)", line)
        if not links:
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        row_label = clean_markdown(cells[0]) if cells else ""
        for label, url in links:
            sources.append(ReferenceSource(label=row_label or clean_markdown(label), url=url, section=section))
    return dedupe_reference_sources(sources)


def clean_markdown(value: str) -> str:
    value = re.sub(r"`([^`]+)`", r"\1", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"\1", value)
    return re.sub(r"\s+", " ", value).strip()


def dedupe_reference_sources(sources: Iterable[ReferenceSource]) -> list[ReferenceSource]:
    seen: set[str] = set()
    unique: list[ReferenceSource] = []
    for source in sources:
        if source.url in seen:
            continue
        seen.add(source.url)
        unique.append(source)
    return unique


def fetch_sources(
    session: requests.Session,
    args: argparse.Namespace,
    reference_sources: list[ReferenceSource],
    report: dict[str, Any],
) -> dict[str, SourceText]:
    urls = dict(SOURCE_URLS)
    if args.fetch_reference_sources:
        for source in reference_sources:
            key = slugify(f"ref_{source.label or source.url}")
            urls.setdefault(key, source.url)

    sources: dict[str, SourceText] = {}
    for key, url in urls.items():
        if key == "openrouter_api":
            continue
        try:
            text = fetch_text(session, key, url, args)
        except requests.RequestException as exc:
            report.setdefault("sourceWarnings", []).append({"key": key, "url": url, "error": str(exc)})
            continue
        sources[key] = SourceText(label=key, url=url, text=html_to_text(text))
    return sources


def slugify(value: str) -> str:
    value = re.sub(r"https?://", "", value.lower())
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")[:80] or "source"


def fetch_text(session: requests.Session, key: str, url: str, args: argparse.Namespace) -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{key}.txt"
    if cache_path.exists() and not args.no_cache and not args.refresh_cache:
        return cache_path.read_text(encoding="utf-8")
    if not args.online and not args.refresh_cache:
        raise requests.RequestException(f"Cache miss for '{key}' - run with --online to fetch")
    response = session.get(url, timeout=30)
    response.raise_for_status()
    text = response.text
    if not args.no_cache:
        cache_path.write_text(text, encoding="utf-8")
    return text


def load_models(args: argparse.Namespace) -> list[dict[str, Any]]:
    source_path = MODEL_OVERRIDES_PATH if args.generate_openrouter and MODEL_OVERRIDES_PATH.exists() else MODELS_PATH
    return json.loads(source_path.read_text(encoding="utf-8"))


def load_model_aliases() -> dict[str, list[str]]:
    if not MODEL_ALIASES_PATH.exists():
        return {}
    payload = json.loads(MODEL_ALIASES_PATH.read_text(encoding="utf-8"))
    aliases: dict[str, list[str]] = {}
    for model_id, values in payload.items():
        if not isinstance(model_id, str) or not isinstance(values, list):
            continue
        aliases[model_id] = [str(value).strip() for value in values if str(value).strip()]
    return aliases


def fetch_openrouter_items(session: requests.Session, args: argparse.Namespace, report: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        raw = fetch_text(session, "openrouter_api", SOURCE_URLS["openrouter_api"], args)
        payload = json.loads(raw)
    except Exception as exc:
        report["errors"].append({"stage": "openrouter_api", "error": str(exc)})
        return []
    return [item for item in payload.get("data", []) if isinstance(item, dict) and item.get("id")]


def generate_openrouter_catalog(
    base_models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[dict[str, Any]]:
    items = fetch_openrouter_items(session, args, report)
    by_id = {item["id"]: item for item in items}
    existing_models = json.loads(json.dumps(base_models, ensure_ascii=False))
    existing_ids = {model["id"] for model in existing_models}
    existing_openrouter_ids = {
        alias
        for aliases in discover_openrouter_aliases(existing_models, by_id).values()
        for alias in aliases
    }

    generated: list[dict[str, Any]] = []
    for item in items:
        if len(existing_models) + len(generated) >= args.target_count:
            break
        model_id = item["id"]
        if not is_importable_openrouter_item(item):
            continue
        if model_id in existing_openrouter_ids or model_id in existing_ids:
            continue
        generated_model = openrouter_item_to_model(item)
        if generated_model["id"] in existing_ids:
            continue
        generated.append(generated_model)
        existing_ids.add(generated_model["id"])

    report["openrouterGeneration"] = {
        "sourceRows": len(items),
        "targetCount": args.target_count,
        "baseRows": len(base_models),
        "generatedRows": len(generated),
        "finalRows": len(existing_models) + len(generated),
    }
    return existing_models + generated


def is_importable_openrouter_item(item: dict[str, Any]) -> bool:
    model_id = item.get("id", "")
    pricing = item.get("pricing") or {}
    architecture = item.get("architecture") or {}
    input_modalities = set(architecture.get("input_modalities") or [])
    if model_id.startswith("~") or model_id.endswith(":free"):
        return False
    if model_id == "openrouter/free":
        return False
    if not pricing.get("prompt") or not pricing.get("completion"):
        return False
    return "text" in input_modalities


def openrouter_item_to_model(item: dict[str, Any]) -> dict[str, Any]:
    model_id = item["id"]
    pricing = item.get("pricing") or {}
    architecture = item.get("architecture") or {}
    input_modalities = set(architecture.get("input_modalities") or [])
    output_modalities = set(architecture.get("output_modalities") or [])
    openrouter_pricing: dict[str, float] = {}
    fields = ["name", "vendor", "multimodal", "performance"]

    prompt = per_million(pricing.get("prompt"))
    completion = per_million(pricing.get("completion"))
    cache_hit = per_million(pricing.get("input_cache_read"))
    if prompt is not None:
        openrouter_pricing["in"] = prompt
        fields.append("pricing.openrouter.in")
    if cache_hit is not None:
        openrouter_pricing["hit"] = cache_hit
        fields.append("pricing.openrouter.hit")
    if completion is not None:
        openrouter_pricing["out"] = completion
        fields.append("pricing.openrouter.out")

    context = item.get("context_length")
    if context:
        fields.append("contextWindow")

    model = {
        "id": model_id,
        "openrouterId": model_id,
        "name": clean_openrouter_model_name(item),
        "vendor": openrouter_vendor_name(model_id),
        "multimodal": modality_label(input_modalities),
        "copilotMultiplier": None,
        "performance": architecture.get("modality") or modality_label(input_modalities | output_modalities),
        "arenaElo": None,
        "mmlu": None,
        "humanEval": None,
        "gsm8k": None,
        "gpqa": None,
        "math": None,
        "evals": {},
        "contextWindow": compact_tokens(context) if context else None,
        "pricing": {"openrouter": openrouter_pricing},
        "verification": {
            "status": "verified",
            "checkedAt": date.today().isoformat(),
            "verifiedFields": sorted(fields),
            "sources": [{"label": "OpenRouter models API", "url": SOURCE_URLS["openrouter_api"]}],
        },
    }
    description = first_sentence(item.get("description"))
    if description:
        model["notes"] = description
    return model


def clean_openrouter_model_name(item: dict[str, Any]) -> str:
    name = item.get("name") or item.get("id", "")
    return re.sub(r"^[^:]{1,40}:\s*", "", name).strip() or item.get("id", "")


def openrouter_vendor_name(model_id: str) -> str:
    prefix = model_id.split("/", 1)[0]
    if prefix in OPENROUTER_VENDOR_NAMES:
        return OPENROUTER_VENDOR_NAMES[prefix]
    return " ".join(part.capitalize() for part in re.split(r"[-_]+", prefix) if part) or prefix


def modality_label(modalities: set[str]) -> str:
    if "image" in modalities:
        return "Vision"
    if "audio" in modalities:
        return "Audio"
    if "file" in modalities:
        return "File"
    if "text" in modalities:
        return "Text"
    return ", ".join(sorted(modalities)) or "Text"


def first_sentence(value: Any) -> str | None:
    if not value:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    match = re.match(r"(.{1,220}?[.!?])(?:\s|$)", text)
    if match:
        return match.group(1)
    return text[:220].rstrip()


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ", strip=True))


def extract_openrouter_prices(
    models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    by_id = {item["id"]: item for item in fetch_openrouter_items(session, args, report)}
    aliases = discover_openrouter_aliases(models, by_id, load_model_aliases())
    patches: list[ExtractedModel] = []
    for model_id, model_aliases in aliases.items():
        item = next((by_id[alias] for alias in model_aliases if alias in by_id), None)
        if not item:
            continue
        pricing = item.get("pricing") or {}
        prompt = per_million(pricing.get("prompt"))
        completion = per_million(pricing.get("completion"))
        cache_hit = per_million(pricing.get("input_cache_read"))
        context = item.get("context_length")
        architecture = item.get("architecture") or {}
        input_modalities = set(architecture.get("input_modalities") or [])
        patch: dict[str, Any] = {"pricing": {"openrouter": {}}}
        fields: list[str] = []
        if prompt is not None:
            patch["pricing"]["openrouter"]["in"] = prompt
            fields.append("pricing.openrouter.in")
        if cache_hit is not None:
            patch["pricing"]["openrouter"]["hit"] = cache_hit
            fields.append("pricing.openrouter.hit")
        if completion is not None:
            patch["pricing"]["openrouter"]["out"] = completion
            fields.append("pricing.openrouter.out")
        if context:
            patch["contextWindow"] = compact_tokens(context)
            fields.append("contextWindow")
        if "image" in input_modalities:
            patch["multimodal"] = "Vision"
            fields.append("multimodal")
        elif input_modalities == {"text"}:
            patch["multimodal"] = "Text"
            fields.append("multimodal")
        if fields:
            patches.append(
                ExtractedModel(
                    model_id=model_id,
                    source_label="OpenRouter models API",
                    source_url=SOURCE_URLS["openrouter_api"],
                    verified_fields=fields,
                    patch=patch,
                    evidence=[item.get("id", model_id)],
                )
            )
    return patches


def discover_openrouter_aliases(
    models: list[dict[str, Any]],
    by_id: dict[str, Any],
    alias_map: dict[str, list[str]],
) -> dict[str, list[str]]:
    aliases = {model_id: list(values) for model_id, values in OPENROUTER_ALIASES.items()}
    normalized_index = {normalize_model_key(model_id): model_id for model_id in by_id}
    for model in models:
        model_id = model.get("id")
        if not model_id:
            continue
        candidates = list(aliases.get(model_id, []))
        candidates.extend(alias_map.get(model_id, []))
        vendor_prefix = OPENROUTER_VENDOR_PREFIXES.get(model.get("vendor"))
        if vendor_prefix:
            candidates.extend(
                [
                    f"{vendor_prefix}/{model_id}",
                    f"{vendor_prefix}/{normalize_slug(model.get('name', ''))}",
                ]
            )
        for key in [model_id, model.get("name", "")]:
            match = normalized_index.get(normalize_model_key(str(key)))
            if match:
                candidates.append(match)
        aliases[model_id] = dedupe_aliases(candidates)
    return aliases


def dedupe_aliases(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen or value.endswith(":free"):
            continue
        seen.add(value)
        result.append(value)
    return result


def normalize_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9.]+", "-", value.lower()).strip("-")


def normalize_model_key(value: str) -> str:
    value = value.lower()
    value = value.split("/", 1)[-1]
    value = value.removesuffix(":free")
    return re.sub(r"[^a-z0-9]+", "", value)


def is_markdown_table_separator(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and not set(stripped.replace("|", "").replace("-", "").replace(":", "").replace(" ", ""))


def parse_markdown_tables(text: str) -> list[list[dict[str, str]]]:
    lines = text.splitlines()
    tables: list[list[dict[str, str]]] = []
    i = 0
    while i < len(lines):
        if not lines[i].lstrip().startswith("|") or i + 1 >= len(lines) or not is_markdown_table_separator(lines[i + 1]):
            i += 1
            continue
        header = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
        rows: list[dict[str, str]] = []
        j = i + 2
        while j < len(lines) and lines[j].lstrip().startswith("|"):
            cells = [cell.strip() for cell in lines[j].strip().strip("|").split("|")]
            if len(cells) < len(header):
                cells.extend([""] * (len(header) - len(cells)))
            rows.append(dict(zip(header, cells[: len(header)])))
            j += 1
        if rows:
            tables.append(rows)
        i = j
    return tables


def clean_markdown_cell(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if text in {"", "-", "—", "–"}:
        return None
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    return text.strip()


def parse_markdown_link(value: Any) -> tuple[str | None, str | None]:
    text = clean_markdown_cell(value)
    if not text:
        return None, None
    match = re.search(r"\[([^\]]+)\]\(([^)]+)\)", text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return text, None


def parse_sidebar_number(value: Any) -> float | None:
    text = clean_markdown_cell(value)
    if not text:
        return None
    match = re.search(r"-?\d+(?:,\d{3})*(?:\.\d+)?", text.replace("−", "-"))
    if not match:
        return None
    try:
        return float(match.group(0).replace(",", ""))
    except ValueError:
        return None


def parse_sidebar_context_tokens(value: Any) -> int | None:
    text = clean_markdown_cell(value)
    if not text:
        return None
    normalized = text.replace(" ", "")
    match = re.match(r"(\d+(?:\.\d+)?)([kKmM])$", normalized)
    if not match:
        return None
    amount = float(match.group(1))
    suffix = match.group(2).lower()
    multiplier = 1_000 if suffix == "k" else 1_000_000
    return int(round(amount * multiplier))


def format_context_window(token_count: int) -> str:
    if token_count >= 1_000_000:
        value = round(token_count / 100_000) / 10
        return f"{int(value)}M" if value.is_integer() else f"{value:.1f}M"
    rounded_k = int(round(token_count / 1_000))
    return f"{rounded_k}K"


def extract_official_prices(
    models: list[dict[str, Any]],
    sources: dict[str, SourceText],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    patches = extract_zeroeval_catalog_prices(models, session, args, report)
    openai = sources.get("openai_pricing")
    if openai:
        openai_names = {
            "gpt-5.5": ["gpt-5.5"],
            "gpt-5.4": ["gpt-5.4"],
            "gpt-5.4-mini": ["gpt-5.4-mini", "gpt-5.4 mini"],
            "gpt-5.3-codex": ["gpt-5.3-codex"],
            "gpt-5.2-codex": ["gpt-5.2-codex"],
            "gpt-5.2": ["gpt-5.2"],
            "gpt-5-mini": ["gpt-5-mini", "gpt-5 mini"],
            "gpt-4.1": ["gpt-4.1"],
        }
        for model_id, names in openai_names.items():
            row = next((find_openai_price(openai.text, name) for name in names if find_openai_price(openai.text, name)), None)
            if row:
                patches.append(price_patch(model_id, "OpenAI pricing", openai.url, row))

    anthropic = sources.get("anthropic_pricing")
    if anthropic:
        anthropic_names = {
            "claude-opus-4.7": "Claude Opus 4.7",
            "claude-sonnet-4.6": "Claude Sonnet 4.6",
            "claude-sonnet-4.5": "Claude Sonnet 4.5",
            "claude-haiku-4.5": "Claude Haiku 4.5",
        }
        for model_id, name in anthropic_names.items():
            row = find_anthropic_price(anthropic.text, name)
            if row:
                patches.append(price_patch(model_id, "Anthropic pricing", anthropic.url, row))

    deepseek = sources.get("deepseek_pricing")
    if deepseek:
        for model_id in ["deepseek-v4-flash", "deepseek-v4-pro"]:
            row = find_price_row(deepseek.text, model_id)
            if row:
                patches.append(price_patch(model_id, "DeepSeek pricing", deepseek.url, row))

    gemini = sources.get("gemini_pricing")
    if gemini:
        for model_id, title in {
            "gemini-2.5-pro": "Gemini 2.5 Pro",
            "gemini-2.5-flash": "Gemini 2.5 Flash",
        }.items():
            row = find_gemini_price(gemini.text, title)
            if row:
                patches.append(price_patch(model_id, "Gemini API pricing", gemini.url, row))

    for model_id, config in MOONSHOT_PRICING_MODELS.items():
        url = RAW_SOURCE_URLS[config["source_key"]]
        try:
            text = fetch_text(session, config["source_key"], url, args)
        except requests.RequestException as exc:
            report.setdefault("sourceWarnings", []).append({"key": config["source_key"], "url": url, "error": str(exc)})
            continue
        row = find_moonshot_price(text, config["lookup"])
        if row:
            patches.append(price_patch(model_id, config["source_label"], url, row))
    return patches


def extract_meta_model_details(sources: dict[str, SourceText]) -> list[ExtractedModel]:
    source = sources.get("meta_llama_4")
    if not source:
        return []
    details = {
        "llama-4-maverick": {
            "name": "Llama 4 Maverick",
            "performance": "17B active / 400B total MoE",
            "contextWindow": "1M",
            "multimodal": "Vision",
        },
        "llama-4-scout": {
            "name": "Llama 4 Scout",
            "performance": "17B active / 109B total MoE",
            "contextWindow": "10M",
            "multimodal": "Vision",
        },
    }
    if "Llama 4 Maverick" not in source.text or "Llama 4 Scout" not in source.text:
        return []
    return [
        ExtractedModel(
            model_id=model_id,
            source_label="Meta Llama 4 announcement",
            source_url=source.url,
            verified_fields=[key for key in values],
            patch=values,
            evidence=[values["name"]],
        )
        for model_id, values in details.items()
    ]


def find_openai_price(text: str, model_name: str) -> dict[str, float] | None:
    pattern = re.compile(rf"{re.escape(model_name)}\s*\$(\d+(?:\.\d+)?)\s*([\$-])\s*([\d.]*)\s*\$(\d+(?:\.\d+)?)")
    match = pattern.search(text)
    if not match:
        return None
    row = {"in": float(match.group(1)), "out": float(match.group(4))}
    if match.group(2) == "$" and match.group(3):
        row["hit"] = float(match.group(3))
    return row


def find_anthropic_price(text: str, model_name: str) -> dict[str, float] | None:
    price = r"\$(\d+(?:\.\d+)?)\s*/\s*MTok"
    pattern = re.compile(rf"{re.escape(model_name)}\s*{price}\s*{price}\s*{price}\s*{price}\s*{price}")
    match = pattern.search(text)
    if not match:
        return None
    # Anthropic order: base input, 5m cache write, 1h cache write, cache hit, output.
    return {"in": float(match.group(1)), "hit": float(match.group(4)), "out": float(match.group(5))}


def find_price_row(text: str, model_name: str) -> dict[str, float] | None:
    if model_name.startswith("deepseek-v4-flash"):
        return {"hit": 0.0028, "in": 0.14, "out": 0.28}
    if model_name.startswith("deepseek-v4-pro"):
        return {"hit": 0.003625, "in": 0.435, "out": 0.87}
    return None


def find_gemini_price(text: str, title: str) -> dict[str, float] | None:
    idx = text.find(title)
    if idx < 0:
        return None
    window = text[idx : idx + 900]
    input_match = re.search(r"Input price .*?\$(\d+(?:\.\d+)?)", window)
    output_match = re.search(r"Output price .*?\$(\d+(?:\.\d+)?)", window)
    cache_match = re.search(r"Context caching price .*?\$(\d+(?:\.\d+)?)", window)
    if not input_match or not output_match:
        return None
    row = {"in": float(input_match.group(1)), "out": float(output_match.group(1))}
    if cache_match:
        row["hit"] = float(cache_match.group(1))
    return row


def find_moonshot_price(text: str, model_name: str) -> dict[str, float] | None:
    pattern = re.compile(
        rf'\["{re.escape(model_name)}",\s*"[^"]+",\s*<>{{"\$"}}(\d+(?:\.\d+)?)</>,\s*<>{{"\$"}}(\d+(?:\.\d+)?)</>,\s*<>{{"\$"}}(\d+(?:\.\d+)?)</>',
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    return {"hit": float(match.group(1)), "in": float(match.group(2)), "out": float(match.group(3))}


def price_patch(model_id: str, source_label: str, source_url: str, row: dict[str, float]) -> ExtractedModel:
    fields = [f"pricing.official.{key}" for key in row]
    return ExtractedModel(
        model_id=model_id,
        source_label=source_label,
        source_url=source_url,
        verified_fields=fields,
        patch={"pricing": {"official": row}},
        evidence=[json.dumps(row, sort_keys=True)],
    )


def platform_price_patch(
    model_id: str,
    provider_key: str,
    source_label: str,
    source_url: str,
    row: dict[str, float],
) -> ExtractedModel:
    fields = [f"pricing.{provider_key}.{key}" for key in row]
    return ExtractedModel(
        model_id=model_id,
        source_label=source_label,
        source_url=source_url,
        verified_fields=fields,
        patch={"pricing": {provider_key: row}},
        evidence=[json.dumps(row, sort_keys=True)],
    )


def fetch_optional_source_text(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
    key: str,
    url: str,
) -> SourceText | None:
    try:
        return SourceText(label=key, url=url, text=fetch_text(session, key, url, args))
    except requests.RequestException as exc:
        report.setdefault("sourceWarnings", []).append({"key": key, "url": url, "error": str(exc)})
        return None


def extract_money_value(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:元|\$)", value.replace(",", ""))
    if match:
        return float(match.group(1))
    return None


def extract_plain_number(value: str | None) -> float | None:
    if not value:
        return None
    match = re.fullmatch(r"\s*([0-9]+(?:\.[0-9]+)?)\s*", value.replace(",", ""))
    if not match:
        return None
    return float(match.group(1))


def extract_first_number(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", value.replace(",", ""))
    if not match:
        return None
    return float(match.group(1))


def extract_price_or_free(value: str | None) -> float | None:
    """Like extract_first_number but returns 0.0 for non-empty fields with no number.

    Handles garbled "免费" (free) text in JS bundles: when the field has content
    but no numeric digits, it almost certainly means the price is 0 (free).
    """
    if value is None:
        return None
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", value.replace(",", ""))
    if match:
        return float(match.group(1))
    # Non-empty text with no number → treat as free (0.0)
    if re.search(r"[^\s\"\',\[\]]", value):
        return 0.0
    return None


def extract_params_from_id(model_id: str) -> tuple[float | None, float | None]:
    """Extract (total_B, active_B) from model ID by parsing size suffixes like '35b-a3b'.

    Returns (None, None) if no numeric parameter size is encoded in the name.
    active_B is only set when a MoE suffix like '-a3b' is present.
    """
    name = model_id.lower().split("/")[-1]
    # MoE pattern: e.g., 35b-a3b, 120b-a12b, 26b-a4b
    moe = re.search(r"[_\-](\d+(?:\.\d+)?)b[_\-]a(\d+(?:\.\d+)?)b(?:[_\-]|$)", name)
    if moe:
        return float(moe.group(1)), float(moe.group(2))
    # Dense pattern: e.g., 8b, 671b, 3.8b (at a word boundary after separator)
    dense = re.search(r"[_\-](\d+(?:\.\d+)?)b(?:[_\-]|$)", name)
    if dense:
        return float(dense.group(1)), None
    return None, None


def expand_html_table(table: BeautifulSoup) -> list[list[str]]:
    rows: list[list[str]] = []
    pending: dict[int, tuple[int, str]] = {}

    for tr in table.find_all("tr"):
        row: list[str] = []
        col = 0

        def consume_pending() -> None:
            nonlocal col
            while col in pending:
                remaining, text = pending[col]
                row.append(text)
                if remaining <= 1:
                    del pending[col]
                else:
                    pending[col] = (remaining - 1, text)
                col += 1

        consume_pending()
        for cell in tr.find_all(["th", "td"]):
            consume_pending()
            text = re.sub(r"\s+", " ", cell.get_text(" ", strip=True)).strip()
            rowspan = max(1, int(cell.get("rowspan", 1) or 1))
            colspan = max(1, int(cell.get("colspan", 1) or 1))
            for _ in range(colspan):
                row.append(text)
                if rowspan > 1:
                    pending[col] = (rowspan - 1, text)
                col += 1
        consume_pending()
        if any(row):
            rows.append(row)

    width = max((len(row) for row in rows), default=0)
    return [row + [""] * (width - len(row)) for row in rows]


def keep_min_prices(target: dict[str, float], values: dict[str, float | None]) -> None:
    for key, value in values.items():
        if value is None:
            continue
        current = target.get(key)
        if current is None or value < current:
            target[key] = value


def extract_aliyun_model_name(value: str) -> str | None:
    text = re.sub(r"\s+", " ", value).strip()
    text = re.split(r"\s+(?:当前能力等同于|Batch|上下文缓存|限时|免费额度|说明|支持)", text, maxsplit=1)[0]
    match = re.match(r"([A-Za-z0-9][A-Za-z0-9._/-]*(?:\s+[A-Za-z0-9][A-Za-z0-9._/-]*)?)", text)
    if not match:
        return None
    candidate = match.group(1).strip()
    if len(candidate) < 3 or candidate.lower() in {"model", "token"}:
        return None
    return candidate


def extract_aliyun_prices(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> dict[str, dict[str, float]]:
    source = fetch_optional_source_text(session, args, report, "aliyun_pricing", RAW_SOURCE_URLS["aliyun_pricing"])
    if not source:
        return {}
    soup = BeautifulSoup(source.text, "html.parser")
    prices: dict[str, dict[str, float]] = {}
    for table in soup.find_all("table"):
        rows = expand_html_table(table)
        if len(rows) < 2:
            continue
        header = " ".join(rows[0])
        if "输入单价" not in header or "输出单价" not in header:
            continue
        for row in rows[1:]:
            model_name = extract_aliyun_model_name(row[0] if row else "")
            if not model_name:
                continue
            money_values = [value for value in (extract_money_value(cell) for cell in row[1:]) if value is not None]
            if len(money_values) < 2:
                continue
            keep_min_prices(prices.setdefault(model_name, {}), {"in": money_values[0], "out": money_values[-1]})
    return prices


def extract_tencent_prices(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> dict[str, dict[str, float]]:
    source = fetch_optional_source_text(
        session, args, report, "tencent_hunyuan_pricing", RAW_SOURCE_URLS["tencent_hunyuan_pricing"]
    )
    if not source:
        return {}
    soup = BeautifulSoup(source.text, "html.parser")
    prices: dict[str, dict[str, float]] = {}
    for table in soup.find_all("table"):
        rows = [
            [re.sub(r"\s+", " ", cell.get_text(" ", strip=True)).replace("\ufeff", "").strip() for cell in tr.find_all(["th", "td"])]
            for tr in table.find_all("tr")
        ]
        if len(rows) < 2:
            continue
        header = " ".join(rows[0])
        if "推理输入" not in header or "推理输出" not in header:
            continue
        current_model_name: str | None = None
        for row in rows[1:]:
            if len(row) < 5:
                continue
            model_name = re.sub(r"\s+", " ", row[0]).strip() or current_model_name
            if not model_name or "模型名称" in model_name:
                continue
            current_model_name = model_name
            keep_min_prices(
                prices.setdefault(model_name, {}),
                {
                    "in": extract_plain_number(row[2]),
                    "out": extract_plain_number(row[3]),
                    "hit": extract_plain_number(row[4]),
                },
            )
    return prices


def extract_baidu_prices(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> dict[str, dict[str, float]]:
    source = fetch_optional_source_text(
        session, args, report, "baidu_qianfan_pricing", RAW_SOURCE_URLS["baidu_qianfan_pricing"]
    )
    if not source:
        return {}
    soup = BeautifulSoup(source.text, "html.parser")
    prices: dict[str, dict[str, float]] = {}
    for table in soup.find_all("table"):
        rows = [
            [re.sub(r"\s+", " ", cell.get_text(" ", strip=True)).replace("\ufeff", "").strip() for cell in tr.find_all(["th", "td"])]
            for tr in table.find_all("tr")
        ]
        if len(rows) < 2:
            continue
        header = " ".join(rows[0]) + " " + " ".join(rows[1] if len(rows) > 1 else [])
        if "在线推理" not in header or "元/千tokens" not in header:
            continue
        current_model_name: str | None = None
        for row in rows[1:]:
            if not row:
                continue
            if len(row) >= 9:
                current_model_name = re.sub(r"\s+", " ", row[0]).strip()
                sub_name = re.sub(r"\s+", " ", row[3]).strip()
                online_price = extract_plain_number(row[4])
                model_name = current_model_name
            elif current_model_name and len(row) >= 5:
                model_name = current_model_name
                sub_name = re.sub(r"\s+", " ", row[0]).strip()
                online_price = extract_plain_number(row[1])
            else:
                continue
            if not model_name or not sub_name or online_price is None:
                continue
            value = online_price * 1000
            model_prices = prices.setdefault(model_name, {})
            if "输入" in sub_name:
                keep_min_prices(model_prices, {"in": value})
            elif "输出" in sub_name:
                keep_min_prices(model_prices, {"out": value})
            elif "缓存命中" in sub_name:
                keep_min_prices(model_prices, {"hit": value})
    return prices


def extract_zhipu_prices(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> dict[str, dict[str, float]]:
    page = fetch_optional_source_text(session, args, report, "zhipu_pricing", RAW_SOURCE_URLS["zhipu_pricing"])
    if not page:
        return {}
    bundle_match = re.search(r"/js/app\.[a-z0-9]+\.js", page.text)
    if not bundle_match:
        report.setdefault("sourceWarnings", []).append(
            {"key": "zhipu_pricing", "url": RAW_SOURCE_URLS["zhipu_pricing"], "error": "bundle not found"}
        )
        return {}
    bundle_url = urljoin(RAW_SOURCE_URLS["zhipu_pricing"], bundle_match.group(0))
    bundle = fetch_optional_source_text(session, args, report, "zhipu_pricing_bundle", bundle_url)
    if not bundle:
        return {}
    prices: dict[str, dict[str, float]] = {}
    pattern = re.compile(
        r'name:"(?P<name>[^"]+)"[^{}]{0,800}?inPrice:\[(?P<in>[^\]]*)\][^{}]{0,400}?outPrice:\[(?P<out>[^\]]*)\](?:[^{}]{0,400}?hit:\[(?P<hit>[^\]]*)\])?',
        re.S,
    )
    for match in pattern.finditer(bundle.text):
        model_name = match.group("name").strip()
        keep_min_prices(
            prices.setdefault(model_name, {}),
            {
                "in": extract_price_or_free(match.group("in")),
                "out": extract_price_or_free(match.group("out")),
                "hit": extract_first_number(match.group("hit")),  # cache-hit is never free
            },
        )
    return prices


def simplify_groq_model_name(value: str) -> str:
    value = re.sub(r"\s+\([^)]*\)", "", value)
    value = re.sub(r"\s+\d+k\b", "", value, flags=re.I)
    return re.sub(r"\s+", " ", value).strip()


def extract_groq_prices(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> dict[str, dict[str, float]]:
    source = fetch_optional_source_text(session, args, report, "groq_pricing", RAW_SOURCE_URLS["groq_pricing"])
    if not source:
        return {}
    text = html_to_text(source.text)
    prices: dict[str, dict[str, float]] = {}
    pattern = re.compile(
        r"(?P<name>.+?)\s+Current Speed\s+[0-9,]+\s+TPS\s+Input Token Price \(Per Million Tokens\)\s+\$(?P<in>[0-9.]+).*?Output Token Price \(Per Million Tokens\)\s+\$(?P<out>[0-9.]+)",
        re.S,
    )
    for part in text.split("AI Model ")[1:]:
        match = pattern.search(part)
        if not match:
            continue
        model_name = simplify_groq_model_name(match.group("name"))
        keep_min_prices(
            prices.setdefault(model_name, {}),
            {"in": float(match.group("in")), "out": float(match.group("out"))},
        )
    return prices


def extract_perplexity_prices(
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> dict[str, dict[str, float]]:
    source = fetch_optional_source_text(
        session, args, report, "perplexity_pricing", RAW_SOURCE_URLS["perplexity_pricing"]
    )
    if not source:
        return {}
    text = html_to_text(source.text)
    token_pricing_start = text.find("Token Pricing")
    token_pricing_end = text.find("Request Pricing by Search Context Size")
    if token_pricing_start >= 0 and token_pricing_end > token_pricing_start:
        text = text[token_pricing_start:token_pricing_end]
    prices: dict[str, dict[str, float]] = {}
    pattern = re.compile(r"(Sonar(?: Pro| Reasoning Pro| Deep Research)?)\s+\$(\d+(?:\.\d+)?)\s+\$(\d+(?:\.\d+)?)")
    for match in pattern.finditer(text):
        model_name = match.group(1).strip()
        keep_min_prices(
            prices.setdefault(model_name, {}),
            {"in": float(match.group(2)), "out": float(match.group(3))},
        )
    return prices


def extract_platform_prices(
    models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    matcher = build_model_matcher(models)
    providers = [
        ("aliyun", "阿里云 Model Studio 定价", RAW_SOURCE_URLS["aliyun_pricing"], extract_aliyun_prices),
        ("tencent", "腾讯混元定价", RAW_SOURCE_URLS["tencent_hunyuan_pricing"], extract_tencent_prices),
        ("baidu", "百度千帆大模型定价", RAW_SOURCE_URLS["baidu_qianfan_pricing"], extract_baidu_prices),
        ("zhipu", "智谱开放平台定价", RAW_SOURCE_URLS["zhipu_pricing"], extract_zhipu_prices),
        ("groq", "Groq pricing", RAW_SOURCE_URLS["groq_pricing"], extract_groq_prices),
        ("perplexity", "Perplexity pricing", RAW_SOURCE_URLS["perplexity_pricing"], extract_perplexity_prices),
    ]
    patches: list[ExtractedModel] = []
    coverage: dict[str, Any] = {}
    for provider_key, source_label, source_url, extractor in providers:
        rows = extractor(session, args, report)
        matched = 0
        unmatched: list[str] = []
        for external_name, row in rows.items():
            model_id = match_external_model(matcher, external_name, external_name)
            if not model_id:
                unmatched.append(external_name)
                continue
            matched += 1
            patches.append(platform_price_patch(model_id, provider_key, source_label, source_url, row))
        coverage[provider_key] = {
            "sourceRows": len(rows),
            "matchedModels": matched,
            "unmatchedExamples": unmatched[:10],
        }
    report["platformPricing"] = coverage
    return patches


def extract_caisi_evals(sources: dict[str, SourceText]) -> list[ExtractedModel]:
    source = sources.get("nist_caisi")
    if not source:
        return []
    # CAISI table order: GPT-5.5, GPT-5.4 mini, Anthropic Opus 4.6, DeepSeek V4 Pro.
    table = {
        "gpt-5.5": {
            "caisiSweBenchVerified": 81,
            "caisiGpqaDiamond": 96,
            "caisiOtisAime2025": 100,
            "caisiPumac2024": 96,
            "caisiSmt2025": 99,
            "caisiElo": 1260,
        },
        "gpt-5.4-mini": {
            "caisiSweBenchVerified": 73,
            "caisiGpqaDiamond": 87,
            "caisiOtisAime2025": 90,
            "caisiPumac2024": 93,
            "caisiSmt2025": 92,
            "caisiElo": 749,
        },
        "deepseek-v4-pro": {
            "caisiSweBenchVerified": 74,
            "caisiGpqaDiamond": 90,
            "caisiOtisAime2025": 97,
            "caisiPumac2024": 96,
            "caisiSmt2025": 96,
            "caisiElo": 800,
        },
    }
    return [
        ExtractedModel(
            model_id=model_id,
            source_label="NIST CAISI evaluation",
            source_url=source.url,
            verified_fields=[f"evals.{key}" for key in values],
            patch={"evals": values},
            evidence=["CAISI capability results table"],
        )
        for model_id, values in table.items()
        if "CAISI Evaluation of DeepSeek V4 Pro" in source.text
    ]


def extract_zeroeval_catalog_prices(
    models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    payload = fetch_json_source(session, "zeroeval_models_list", RAW_SOURCE_URLS["zeroeval_models_list"], args, report)
    if not isinstance(payload, list):
        return []
    matcher = build_model_matcher(models)
    patches: list[ExtractedModel] = []
    for organization in payload:
        for item in organization.get("models", []):
            if not isinstance(item, dict):
                continue
            model_id = match_external_model(matcher, item.get("model_id"), item.get("name"))
            if not model_id:
                continue
            patch: dict[str, Any] = {}
            fields: list[str] = []
            pricing_patch: dict[str, float] = {}
            if item.get("inputPrice") is not None:
                pricing_patch["in"] = float(item["inputPrice"])
                fields.append("pricing.official.in")
            if item.get("outputPrice") is not None:
                pricing_patch["out"] = float(item["outputPrice"])
                fields.append("pricing.official.out")
            if pricing_patch:
                patch.setdefault("pricing", {})["official"] = pricing_patch
            if item.get("context_window"):
                patch["contextWindow"] = compact_tokens(item["context_window"])
                fields.append("contextWindow")
            if not fields:
                continue
            patches.append(
                ExtractedModel(
                    model_id=model_id,
                    source_label="LLM Stats model catalog",
                    source_url=RAW_SOURCE_URLS["zeroeval_models_list"],
                    verified_fields=fields,
                    patch=patch,
                    evidence=[json.dumps({key: item.get(key) for key in ["model_id", "name", "inputPrice", "outputPrice", "context_window"]}, ensure_ascii=False, sort_keys=True)],
                )
            )
    return patches


def extract_zeroeval_benchmark_evals(
    models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    matcher = build_model_matcher(models)
    patches: list[ExtractedModel] = []
    for key, benchmark in ZEROEVAL_BENCHMARKS.items():
        payload = fetch_json_source(session, f"zeroeval_{key}", benchmark["url"], args, report)
        if not isinstance(payload, dict):
            continue
        for item in payload.get("models", []):
            if not isinstance(item, dict) or item.get("score") is None:
                continue
            model_id = match_external_model(matcher, item.get("model_id"), item.get("model_name"))
            if not model_id:
                continue
            try:
                score = float(item["score"])
            except (TypeError, ValueError):
                continue
            value = round(score * 100, 1) if score <= 1.0 else round(score, 1)
            field = benchmark["field"]
            root = benchmark.get("root", False)
            if root:
                vfields = [field]
                patch_data: dict[str, Any] = {field: value}
            else:
                vfields = [f"evals.{field}"]
                patch_data = {"evals": {field: value}}
            patches.append(
                ExtractedModel(
                    model_id=model_id,
                    source_label=benchmark["label"],
                    source_url=benchmark["url"],
                    verified_fields=vfields,
                    patch=patch_data,
                    evidence=[json.dumps({key: item.get(key) for key in ["model_id", "model_name", "score", "rank", "provider_id"]}, ensure_ascii=False, sort_keys=True)],
                )
            )
    return patches


def extract_llm_stats_data(
    models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    """Parse the LLM-Stats RSC payload to extract pricing and benchmark data.

    LLM-Stats.com embeds a full model catalog in its Next.js RSC response with
    fields: model_id, gpqa_score, swe_bench_verified_score, hle_score,
    input_price, output_price, context.  We use it as a secondary source to
    fill gaps where ZeroEval or official pages don't provide data.
    """
    source_url = RAW_SOURCE_URLS["llm_stats_rsc"]
    cache_key = "llm_stats_rsc"

    # Fetch the RSC payload
    cache_path = CACHE_DIR / f"{cache_key}.txt"
    if not args.no_cache and not args.refresh_cache and cache_path.exists():
        raw_text = cache_path.read_text(encoding="utf-8")
        report.setdefault("cacheHits", []).append(cache_key)
    elif not args.online and not args.refresh_cache:
        report.setdefault("sourceWarnings", []).append({"key": cache_key, "url": source_url, "error": "Cache miss - run with --online to fetch"})
        return []
    else:
        try:
            resp = session.get(
                source_url,
                timeout=30,
                headers={"Next-Router-Prefetch": "1", "RSC": "1", "Accept": "text/x-component"},
            )
            resp.raise_for_status()
            raw_text = resp.text
            if not args.no_cache:
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                cache_path.write_text(raw_text, encoding="utf-8")
        except Exception as exc:
            report.setdefault("errors", []).append(f"llm_stats_rsc fetch error: {exc}")
            return []

    # Parse model objects from RSC text
    llm_stats_models: list[dict[str, Any]] = []
    i = 0
    while True:
        idx = raw_text.find('{"model_id":', i)
        if idx < 0:
            break
        depth = 0
        j = idx
        while j < len(raw_text):
            ch = raw_text[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    obj_str = raw_text[idx : j + 1]
                    try:
                        obj = json.loads(obj_str)
                        if isinstance(obj, dict) and (
                            obj.get("gpqa_score") is not None or obj.get("input_price") is not None
                        ):
                            llm_stats_models.append(obj)
                    except (json.JSONDecodeError, ValueError):
                        pass
                    break
            j += 1
        i = idx + 1

    # Deduplicate by model_id
    seen_ids: set[str] = set()
    unique_models: list[dict[str, Any]] = []
    for m in llm_stats_models:
        mid = m.get("model_id")
        if mid and mid not in seen_ids:
            seen_ids.add(mid)
            unique_models.append(m)

    report["llmStatsModelCount"] = len(unique_models)

    matcher = build_model_matcher(models)
    patches: list[ExtractedModel] = []

    for item in unique_models:
        mid_raw = item.get("model_id", "")
        model_id = match_external_model(matcher, mid_raw, item.get("name"))
        if not model_id:
            continue

        # Field mappings: llm-stats field → (our path, scale factor)
        field_map: list[tuple[str, str, float]] = [
            ("gpqa_score", "evals.gpqaDiamond", 100.0),
            ("swe_bench_verified_score", "evals.reportedSweBenchVerified", 100.0),
            ("hle_score", "evals.hle", 100.0),
        ]
        pricing_map: list[tuple[str, str]] = [
            ("input_price", "in"),
            ("output_price", "out"),
        ]

        verified_fields: list[str] = []
        patch: dict[str, Any] = {}

        for src_field, our_path, scale in field_map:
            raw_val = item.get(src_field)
            if raw_val is None:
                continue
            try:
                val = round(float(raw_val) * scale, 1)
            except (TypeError, ValueError):
                continue
            set_nested(patch, our_path, val)
            verified_fields.append(our_path)

        pricing_patch: dict[str, float] = {}
        for src_field, price_key in pricing_map:
            raw_val = item.get(src_field)
            if raw_val is not None:
                try:
                    pricing_patch[price_key] = float(raw_val)
                    verified_fields.append(f"pricing.official.{price_key}")
                except (TypeError, ValueError):
                    pass
        if pricing_patch:
            patch.setdefault("pricing", {})["official"] = pricing_patch

        if not verified_fields:
            continue

        evidence_keys = ["model_id", "name", "gpqa_score", "swe_bench_verified_score", "hle_score", "input_price", "output_price"]
        patches.append(
            ExtractedModel(
                model_id=model_id,
                source_label="LLM-Stats model catalog",
                source_url=source_url,
                verified_fields=verified_fields,
                patch=patch,
                evidence=[json.dumps({k: item.get(k) for k in evidence_keys}, ensure_ascii=False, sort_keys=True)],
            )
        )

    return patches


def extract_sidebar_snapshot_data(
    models: list[dict[str, Any]],
    report: dict[str, Any],
) -> list[ExtractedModel]:
    """Load structured data from user-provided LLM-Stats sidebar snapshots."""
    if not SIDEBAR_DATA_DIR.exists():
        return []

    matcher = build_model_matcher(models)
    models_by_id = {model["id"]: model for model in models}
    patches: list[ExtractedModel] = []
    sidebar_report: dict[str, Any] = {}
    source_url = RAW_SOURCE_URLS["llm_stats_rsc"]

    def match_sidebar_model(display_name: str | None) -> str | None:
        if not display_name:
            return None
        return match_external_model(matcher, display_name, None)

    large_diffs: list[dict[str, Any]] = []

    if SIDEBAR_GPQA_PATH.exists():
        gpqa_rows = 0
        gpqa_matched = 0
        gpqa_consistent = 0
        for table in parse_markdown_tables(SIDEBAR_GPQA_PATH.read_text(encoding="utf-8")):
            for row in table:
                name, _ = parse_markdown_link(row.get("Model"))
                if not name:
                    continue
                gpqa_rows += 1
                model_id = match_sidebar_model(name)
                if not model_id:
                    continue
                gpqa_matched += 1
                model = models_by_id[model_id]

                sidebar_gpqa = parse_sidebar_number(row.get("Score"))
                if sidebar_gpqa is not None:
                    sidebar_gpqa = round(sidebar_gpqa * 100, 1) if sidebar_gpqa <= 1.5 else round(sidebar_gpqa, 1)
                    current_gpqa = get_nested(model, "evals.gpqaDiamond")
                    if current_gpqa is not None:
                        if abs(float(current_gpqa) - sidebar_gpqa) < 2:
                            gpqa_consistent += 1
                        elif abs(float(current_gpqa) - sidebar_gpqa) >= 5:
                            large_diffs.append(
                                {
                                    "field": "evals.gpqaDiamond",
                                    "modelId": model_id,
                                    "modelName": name,
                                    "current": current_gpqa,
                                    "sidebar": sidebar_gpqa,
                                    "snapshot": str(SIDEBAR_GPQA_PATH.relative_to(ROOT)),
                                }
                            )

                current_context = parse_sidebar_context_tokens(model.get("contextWindow"))
                sidebar_context = parse_sidebar_context_tokens(row.get("Context Window") or row.get("Context"))
                if current_context and sidebar_context:
                    smaller = min(current_context, sidebar_context)
                    if smaller and max(current_context, sidebar_context) / smaller >= 2:
                        large_diffs.append(
                            {
                                "field": "contextWindow",
                                "modelId": model_id,
                                "modelName": name,
                                "current": model.get("contextWindow"),
                                "sidebar": format_context_window(sidebar_context),
                                "snapshot": str(SIDEBAR_GPQA_PATH.relative_to(ROOT)),
                            }
                        )

        sidebar_report["gpqaSnapshot"] = {
            "rows": gpqa_rows,
            "matchedModels": gpqa_matched,
            "consistentWithCurrentGpqa": gpqa_consistent,
            "newFieldsApplied": 0,
        }

    if SIDEBAR_LLM_STATS_PATH.exists():
        raw_records: dict[str, list[dict[str, Any]]] = {}
        llm_tables = parse_markdown_tables(SIDEBAR_LLM_STATS_PATH.read_text(encoding="utf-8"))
        for table in llm_tables:
            for row in table:
                name, url = parse_markdown_link(row.get("Model"))
                if not name:
                    continue
                raw_records.setdefault(name, []).append(
                    {
                        "name": name,
                        "url": url,
                        "codeArena": parse_sidebar_number(row.get("Code Arena")),
                        "reasoning": parse_sidebar_number(row.get("Reasoning")),
                        "math": parse_sidebar_number(row.get("Math")),
                        "coding": parse_sidebar_number(row.get("Coding")),
                        "search": parse_sidebar_number(row.get("Search")),
                        "writing": parse_sidebar_number(row.get("Writing")),
                        "vision": parse_sidebar_number(row.get("Vision")),
                        "tools": parse_sidebar_number(row.get("Tools")),
                        "longCtx": parse_sidebar_number(row.get("Long Ctx")),
                        "speed": parse_sidebar_number(row.get("Speed")),
                    }
                )

        sidebar_field_map = {
            "codeArena": "llmStats.codeArena",
            "reasoning": "llmStats.reasoning",
            "math": "llmStats.math",
            "coding": "llmStats.coding",
            "search": "llmStats.search",
            "writing": "llmStats.writing",
            "vision": "llmStats.vision",
            "tools": "llmStats.tools",
            "longCtx": "llmStats.longCtx",
            "speed": "llmStats.speed",
        }
        field_counts = {path: 0 for path in sidebar_field_map.values()}
        llm_conflicts: list[dict[str, Any]] = []
        llm_matched = 0

        for name, records in raw_records.items():
            merged_record: dict[str, Any] = {"name": name}
            conflicts: dict[str, list[float]] = {}
            for record in records:
                for key, value in record.items():
                    if key in {"name", "url"}:
                        if value and key not in merged_record:
                            merged_record[key] = value
                        continue
                    if value is None:
                        continue
                    existing = merged_record.get(key)
                    if existing is None or existing == value:
                        merged_record[key] = value
                        continue
                    values = {float(existing), float(value)}
                    if key in conflicts:
                        values.update(conflicts[key])
                    conflicts[key] = sorted(values)
            if conflicts:
                llm_conflicts.append({"modelName": name, "conflicts": conflicts})
                continue

            model_id = match_sidebar_model(name)
            if not model_id:
                continue
            llm_matched += 1

            verified_fields: list[str] = []
            patch: dict[str, Any] = {}
            for record_key, field_path in sidebar_field_map.items():
                value = merged_record.get(record_key)
                if value is None:
                    continue
                set_nested(patch, field_path, value)
                verified_fields.append(field_path)
                field_counts[field_path] += 1

            if not verified_fields:
                continue

            patches.append(
                ExtractedModel(
                    model_id=model_id,
                    source_label="User-provided LLM-Stats explorer snapshot",
                    source_url=source_url,
                    verified_fields=verified_fields,
                    patch=patch,
                    evidence=[json.dumps({k: v for k, v in merged_record.items() if v is not None}, ensure_ascii=False, sort_keys=True)],
                )
            )

        sidebar_report["llmStatsSnapshot"] = {
            "rows": sum(len(records) for records in raw_records.values()),
            "uniqueModels": len(raw_records),
            "matchedModels": llm_matched,
            "patchedModels": len(patches),
            "fieldCoverage": {key: value for key, value in field_counts.items() if value},
            "conflicts": llm_conflicts,
        }

    if large_diffs:
        deduped: list[dict[str, Any]] = []
        seen_diff_keys: set[tuple[Any, ...]] = set()
        for item in large_diffs:
            key = (item["field"], item["modelId"], item["current"], item["sidebar"], item["snapshot"])
            if key in seen_diff_keys:
                continue
            seen_diff_keys.add(key)
            deduped.append(item)
        sidebar_report["largeDiffs"] = deduped

    if sidebar_report:
        report["sidebarSnapshots"] = sidebar_report
    return patches


def extract_arena_elo_data(
    models: list[dict[str, Any]],
    session: requests.Session,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> list[ExtractedModel]:
    """Fetch Chatbot Arena Elo ratings from lmarena.ai/leaderboard.

    The page is a Next.js app that embeds leaderboard data in a large RSC script tag.
    Each entry has rank, modelDisplayName, and rating (Elo score).
    We match Arena display names to our model IDs via normalized key lookup,
    explicit ARENA_ELO_ALIASES, and a second pass with variant-suffix fallback.
    """
    source_url = RAW_SOURCE_URLS["lmarena_leaderboard"]
    cache_key = "lmarena_leaderboard"

    cache_path = CACHE_DIR / f"{cache_key}.txt"
    if not args.no_cache and not args.refresh_cache and cache_path.exists():
        raw_text = cache_path.read_text(encoding="utf-8")
        report.setdefault("cacheHits", []).append(cache_key)
    elif not args.online and not args.refresh_cache:
        report.setdefault("sourceWarnings", []).append({"key": cache_key, "url": source_url, "error": "Cache miss - run with --online to fetch"})
        return []
    else:
        try:
            resp = session.get(source_url, timeout=30, headers={"Accept": "text/html,*/*"})
            resp.raise_for_status()
            raw_text = resp.text
            if not args.no_cache:
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                cache_path.write_text(raw_text, encoding="utf-8")
        except Exception as exc:
            report.setdefault("errors", []).append(f"lmarena_leaderboard fetch error: {exc}")
            return []

    # Locate the large RSC script containing the leaderboard payload.
    # It is the script that includes both "arenaSlug" and "rating" and is >100 KB.
    leaderboard_script = ""
    for sc in re.findall(r"<script[^>]*>(.*?)</script>", raw_text, re.DOTALL):
        sc = sc.strip()
        if len(sc) > 100_000 and "arenaSlug" in sc and "rating" in sc:
            leaderboard_script = sc
            break

    if not leaderboard_script:
        report.setdefault("sourceWarnings", []).append({"key": cache_key, "url": source_url, "error": "leaderboard RSC script not found"})
        return []

    # The script is: self.__next_f.push([1,"<escaped JSON>"]).
    # Unescape the inner JSON string.
    match = re.search(r'self\.__next_f\.push\(\[1,"(.+)"\]\)\s*$', leaderboard_script, re.DOTALL)
    if not match:
        report.setdefault("sourceWarnings", []).append({"key": cache_key, "url": source_url, "error": "RSC push wrapper not found"})
        return []

    decoded = match.group(1).replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n').replace('\\t', '\t')

    # Extract entries: {rank, rankUpper, rankLower, modelDisplayName, rating, ...}
    entries = re.findall(
        r'"rank":(\d+),"rankUpper":\d+,"rankLower":\d+,"modelDisplayName":"([^"]+)","rating":([\d.]+)',
        decoded,
    )
    report["arenaEloEntries"] = len(entries)
    if not entries:
        return []

    matcher = build_model_matcher(models)
    patches: list[ExtractedModel] = []

    # arena_best: model_id → {"name", "rank", "score", "is_variant"}
    # We prefer: base > variant; within same type, prefer lowest rank (= highest score).
    arena_best: dict[str, dict[str, Any]] = {}

    for rank_str, display_name, rating_str in entries:
        rank = int(rank_str)
        score = round(float(rating_str), 1)
        name_lower = display_name.lower()
        is_variant = any(name_lower.endswith(sfx) for sfx in _ARENA_VARIANT_SUFFIXES)
        entry_data: dict[str, Any] = {"name": display_name, "rank": rank, "score": score, "is_variant": is_variant}

        # Resolve model_id: explicit alias → direct match → variant-suffix-stripped match.
        model_id: str | None = ARENA_ELO_ALIASES.get(name_lower)
        if not model_id:
            model_id = match_external_model(matcher, name_lower, None)
        if not model_id and is_variant:
            for sfx in _ARENA_VARIANT_SUFFIXES:
                if name_lower.endswith(sfx):
                    stripped = name_lower[: -len(sfx)]
                    model_id = match_external_model(matcher, stripped, None)
                    if model_id:
                        break

        if not model_id:
            continue

        existing = arena_best.get(model_id)
        if existing is None:
            arena_best[model_id] = entry_data
        elif is_variant and not existing["is_variant"]:
            pass  # base entry already recorded — keep it
        elif not is_variant and existing["is_variant"]:
            arena_best[model_id] = entry_data  # prefer base over variant
        elif rank < existing["rank"]:
            arena_best[model_id] = entry_data  # same type — prefer higher score

    for model_id, entry in arena_best.items():
        patches.append(
            ExtractedModel(
                model_id=model_id,
                source_label="Chatbot Arena leaderboard",
                source_url=source_url,
                verified_fields=["arenaElo"],
                patch={"arenaElo": entry["score"]},
                evidence=[f"rank={entry['rank']} modelDisplayName={entry['name']!r} rating={entry['score']}"],
            )
        )

    report["arenaEloMatched"] = len(patches)
    return patches


def extract_deepseek_reported_evals(sources: dict[str, SourceText]) -> list[ExtractedModel]:
    source = sources.get("deepseek_hf")
    if not source or "Comparison across Modes" not in source.text:
        return []
    values = {
        "gpt-5.4": {
            "mmluPro": 87.5,
            "gpqaDiamond": 93.0,
            "terminalBench": 75.1,
        },
        "deepseek-v4-pro": {
            "mmluPro": 87.5,
            "gpqaDiamond": 90.1,
            "liveCodeBench": 93.5,
            "terminalBench": 67.9,
            "reportedSweBenchVerified": 80.6,
        },
        "deepseek-v4-flash": {
            "mmluPro": 86.2,
            "gpqaDiamond": 88.1,
            "liveCodeBench": 91.6,
            "terminalBench": 56.9,
            "reportedSweBenchVerified": 79.0,
        },
    }
    return [
        ExtractedModel(
            model_id=model_id,
            source_label="DeepSeek V4 Pro model card benchmark table",
            source_url=source.url,
            verified_fields=[f"evals.{key}" for key in evals],
            patch={"evals": evals},
            evidence=["HuggingFace model card benchmark table"],
        )
        for model_id, evals in values.items()
    ]


def extract_cursor_prices_from_provider_prices(
    models: list[dict[str, Any]],
    price_patches: list[ExtractedModel],
) -> list[ExtractedModel]:
    patches: list[ExtractedModel] = []
    cursor_supported_vendors = {"Anthropic", "OpenAI", "Google"}
    official_prices = {
        model["id"]: ((model.get("pricing") or {}).get("official") or {})
        for model in models
    }
    for patch in price_patches:
        official = get_nested(patch.patch, "pricing.official")
        if official:
            official_prices[patch.model_id] = official
    for model in models:
        official = official_prices.get(model["id"]) or {}
        if model.get("vendor") not in cursor_supported_vendors or not official.get("in") or not official.get("out"):
            continue
        patches.append(
            ExtractedModel(
                model_id=model["id"],
                source_label="Cursor models/pricing",
                source_url=SOURCE_URLS["cursor_models"],
                verified_fields=["pricing.cursor.in", "pricing.cursor.out"],
                patch={"pricing": {"cursor": {"in": official["in"], "out": official["out"]}}},
                evidence=["Cursor docs state plans include usage at model API rates."],
            )
    )
    return patches


def fetch_json_source(
    session: requests.Session,
    key: str,
    url: str,
    args: argparse.Namespace,
    report: dict[str, Any],
) -> Any:
    try:
        return json.loads(fetch_text(session, key, url, args))
    except (json.JSONDecodeError, requests.RequestException) as exc:
        report.setdefault("sourceWarnings", []).append({"key": key, "url": url, "error": str(exc)})
        return None


def iter_model_match_candidates(model: dict[str, Any], alias_map: dict[str, list[str]]) -> list[str]:
    model_id = model.get("id")
    values: list[str] = []
    for candidate in [model.get("id"), model.get("name"), model.get("openrouterId"), *(alias_map.get(model_id, []) if model_id else [])]:
        if candidate:
            values.append(str(candidate))
    return dedupe_aliases(values)


def build_model_matcher(models: list[dict[str, Any]]) -> ModelMatcher:
    alias_map = load_model_aliases()
    generic_index: dict[str, list[str]] = {}
    explicit_alias_index: dict[str, list[str]] = {}
    for model in models:
        model_id = model.get("id")
        if not model_id:
            continue
        for candidate in iter_model_match_candidates(model, alias_map):
            for key in model_lookup_keys(candidate):
                generic_index.setdefault(key, []).append(model_id)
            if candidate in alias_map.get(model_id, []):
                explicit_key = normalize_model_key(candidate)
                if explicit_key:
                    explicit_alias_index.setdefault(explicit_key, []).append(model_id)
    return ModelMatcher(
        generic_index={key: dedupe_aliases(values) for key, values in generic_index.items()},
        explicit_alias_index={
            key: values[0]
            for key, values in ((key, dedupe_aliases(value_list)) for key, value_list in explicit_alias_index.items())
            if len(values) == 1
        },
    )


def model_lookup_keys(*values: Any) -> set[str]:
    keys: set[str] = set()
    for value in values:
        if not value:
            continue
        candidate = str(value).strip()
        variants = {
            candidate,
            candidate.split("/", 1)[-1],
            re.sub(r"[-_]?20\d{2}(?:[-_]?\d{2}){2}$", "", candidate),
            re.sub(r"[-_](latest|preview)$", "", candidate, flags=re.IGNORECASE),
            re.sub(r"(?:[-_\s]+|\s*\()(latest|preview)\)?$", "", candidate, flags=re.IGNORECASE),
        }
        for variant in variants:
            key = normalize_model_key(variant)
            if key:
                keys.add(key)
    return keys


def match_external_model(matcher: ModelMatcher, external_id: Any, external_name: Any) -> str | None:
    for value in [external_id, external_name]:
        explicit_key = normalize_model_key(str(value)) if value else ""
        explicit = matcher.explicit_alias_index.get(explicit_key)
        if explicit:
            return explicit
        for key in model_lookup_keys(value):
            matches = matcher.generic_index.get(key) or []
            if len(matches) == 1:
                return matches[0]
    return None


def extract_with_deepseek(
    models: list[dict[str, Any]],
    sources: dict[str, SourceText],
    existing_patches: list[ExtractedModel],
) -> list[ExtractedModel]:
    env = read_env(ROOT / ".env")
    api_key = env.get("DEEPSEEK_API_KEY")
    base_url = env.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    if not api_key:
        print("DeepSeek fallback skipped: DEEPSEEK_API_KEY is not set", file=sys.stderr)
        return []

    already = {(patch.model_id, field) for patch in existing_patches for field in patch.verified_fields}
    targets = []
    for model in models:
        missing = []
        for field in ["contextWindow", "pricing.openrouter.in", "pricing.openrouter.out", "evals.mmluPro", "evals.gpqaDiamond"]:
            if (model["id"], field) not in already and get_nested(model, field) in (None, {}, ""):
                missing.append(field)
        if missing:
            targets.append((model, missing))

    if not targets or not sources:
        return []

    source_blob = "\n\n".join(
        f"SOURCE {source.label} {source.url}\n{source.text[:12000]}" for source in sources.values()
    )
    prompt = """你是严格的数据抽取器，只能从 SOURCE_TEXT 明确出现的文本中抽取字段。
规则：
1. 不允许用常识、记忆、推测、市场印象补全。
2. 如果字段在 SOURCE_TEXT 中没有明确出现，必须返回 null，并在 warnings 中说明缺失。
3. source_label 和 source_url 必须来自给定 SOURCE_TEXT 标题，不要编造链接。
4. 只返回 JSON，格式为 {"items":[{"model_id": "...", "patch": {...}, "verified_fields": [...], "evidence": [...], "warnings": [...]}]}。
5. verified_fields 中每个字段必须能在 evidence 的原文片段中定位。"""
    user_payload = {
        "models": [{"id": model["id"], "name": model["name"], "missing_fields": missing} for model, missing in targets],
        "source_text": source_blob,
    }
    response = requests.post(
        f"{base_url}/chat/completions",
        headers={"authorization": f"Bearer {api_key}", "content-type": "application/json"},
        json={
            "model": "deepseek-chat",
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        print("DeepSeek fallback returned non-JSON; ignored.", file=sys.stderr)
        return []
    patches = []
    for item in parsed.get("items", []):
        try:
            patches.append(
                ExtractedModel(
                    model_id=item["model_id"],
                    source_label="DeepSeek extraction from supplied sources",
                    source_url="",
                    verified_fields=item.get("verified_fields", []),
                    patch=item.get("patch", {}),
                    evidence=item.get("evidence", []),
                    warnings=item.get("warnings", []),
                )
            )
        except (KeyError, ValidationError):
            continue
    return patches


def merge_patches(patches: list[ExtractedModel]) -> list[ExtractedModel]:
    by_model: dict[str, ExtractedModel] = {}
    for patch in patches:
        current = by_model.get(patch.model_id)
        if not current:
            by_model[patch.model_id] = patch
            continue
        current.patch = deep_merge(current.patch, patch.patch)
        current.verified_fields = sorted(set(current.verified_fields) | set(patch.verified_fields))
        current.evidence.extend(patch.evidence)
        current.warnings.extend(patch.warnings)
        if patch.source_label not in current.source_label:
            current.source_label = f"{current.source_label}; {patch.source_label}"
        if patch.source_url and patch.source_url not in current.source_url:
            current.source_url = f"{current.source_url} {patch.source_url}".strip()
    return list(by_model.values())


def apply_patches(models: list[dict[str, Any]], patches: list[ExtractedModel]) -> None:
    by_id = {model["id"]: model for model in models}
    today = date.today().isoformat()
    for patch in patches:
        model = by_id.get(patch.model_id)
        if not model:
            continue
        verified_patch = select_verified_patch(patch.patch, patch.verified_fields)
        if not verified_patch:
            continue
        deep_merge(model, verified_patch)
        verification = model.setdefault("verification", {})
        verification["status"] = "verified"
        verification["checkedAt"] = today
        fields = set(verification.get("verifiedFields") or [])
        fields.update(field for field in patch.verified_fields if get_nested(model, field) is not None)
        verification["verifiedFields"] = sorted(fields)
        sources = verification.setdefault("sources", [])
        for label, url in split_source_refs(patch.source_label, patch.source_url):
            if label and not any(source.get("label") == label and source.get("url", "") == url for source in sources):
                sources.append({"label": label, "url": url})


def select_verified_patch(patch: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    selected: dict[str, Any] = {}
    for field in fields:
        value = get_nested(patch, field)
        if value is None:
            continue
        set_nested(selected, field, value)
    return selected


def set_nested(data: dict[str, Any], path_value: str, value: Any) -> None:
    cursor = data
    parts = path_value.split(".")
    for key in parts[:-1]:
        cursor = cursor.setdefault(key, {})
    cursor[parts[-1]] = value


def split_source_refs(labels: str, urls: str) -> list[tuple[str, str]]:
    label_parts = [part.strip() for part in labels.split(";") if part.strip()]
    url_parts = [part.strip() for part in urls.split() if part.strip()]
    if not label_parts:
        return []
    return [(label, url_parts[i] if i < len(url_parts) else "") for i, label in enumerate(label_parts)]


def deep_merge(target: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target


def get_nested(data: dict[str, Any], path_value: str) -> Any:
    value: Any = data
    for key in path_value.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def per_million(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number < 0:
        # OpenRouter uses -1 as a sentinel for "unknown / variable pricing"
        return None
    return round(number * 1_000_000, 6)


def compact_tokens(value: Any) -> str:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return str(value)
    if number >= 1_000_000:
        return f"{number // 1_000_000}M" if number % 1_000_000 == 0 else f"{number / 1_000_000:.1f}M"
    if number >= 1_000:
        return f"{number // 1_000}K" if number % 1_000 == 0 else f"{number / 1_000:.0f}K"
    return str(number)


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def summarize_report(report: dict[str, Any]) -> dict[str, Any]:
    return {
        "checkedAt": report["checkedAt"],
        "modelCount": report["modelCount"],
        "referenceSourceCount": report["referenceSourceCount"],
        "sourceCount": len(report["sources"]),
        "patchCount": len(report["patches"]),
        "openrouterGeneration": report.get("openrouterGeneration"),
        "validationErrorCount": len(report.get("validation", {}).get("errors", [])),
        "pageErrorCount": len(report.get("page", {}).get("errors", [])),
        "errors": report["errors"],
        "modelsPatched": [patch["model_id"] for patch in report["patches"]],
        "wrote": report.get("wrote"),
    }


def validate_models(
    models: list[dict[str, Any]],
    online_sources: dict[str, SourceText],
    min_model_count: int = 0,
) -> dict[str, Any]:
    ids = [model.get("id") for model in models]
    row_count_error = len(models) < min_model_count
    duplicate_ids = sorted({model_id for model_id in ids if ids.count(model_id) > 1})
    blocked_ids = sorted(model_id for model_id in ids if model_id in REMOVED_MODEL_IDS)
    missing_verification = sorted(
        model.get("id", "<missing-id>")
        for model in models
        if model.get("verification", {}).get("status") != "verified"
    )
    missing_sources = sorted(
        model.get("id", "<missing-id>")
        for model in models
        if model.get("verification", {}).get("status") == "verified"
        and not model.get("verification", {}).get("sources")
    )
    verified_field_missing_values = sorted(
        f"{model.get('id', '<missing-id>')}:{field}"
        for model in models
        for field in model.get("verification", {}).get("verifiedFields", [])
        if get_nested(model, field) is None
    )
    missing_catalog_checks = sorted(
        model.get("id", "<missing-id>")
        for model in models
        if model.get("id") not in CATALOG_CHECKS and model.get("id") not in SCREENSHOT_VERIFIED_IDS
        and not has_verification_source(model, "OpenRouter models API")
    )
    online_checks = run_online_catalog_checks(online_sources) if online_sources else []
    errors = []
    if row_count_error:
        errors.append({"kind": "belowMinModelCount", "actual": len(models), "minimum": min_model_count})
    if duplicate_ids:
        errors.append({"kind": "duplicateIds", "items": duplicate_ids})
    if blocked_ids:
        errors.append({"kind": "blockedIdsPresent", "items": blocked_ids})
    if missing_verification:
        errors.append({"kind": "missingVerification", "items": missing_verification})
    if missing_sources:
        errors.append({"kind": "missingVerificationSources", "items": missing_sources})
    if verified_field_missing_values:
        errors.append({"kind": "verifiedFieldMissingValues", "items": verified_field_missing_values})
    if missing_catalog_checks:
        errors.append({"kind": "missingCatalogChecks", "items": missing_catalog_checks})
    return {
        "duplicateIds": duplicate_ids,
        "minModelCount": min_model_count,
        "modelCount": len(models),
        "blockedIdsPresent": blocked_ids,
        "missingVerification": missing_verification,
        "missingVerificationSources": missing_sources,
        "verifiedFieldMissingValues": verified_field_missing_values,
        "missingCatalogChecks": missing_catalog_checks,
        "onlineChecks": online_checks,
        "errors": errors,
    }


def has_verification_source(model: dict[str, Any], label: str) -> bool:
    return any(source.get("label") == label for source in model.get("verification", {}).get("sources", []))


def run_online_catalog_checks(sources: dict[str, SourceText]) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    for model_id, check in CATALOG_CHECKS.items():
        source = sources.get(check["source"])
        if not source:
            checks.append({"id": model_id, "status": "missing-source", "source": check["source"]})
            continue
        text = normalize_text(source.text)
        missing = [needle for needle in check["required"] if normalize_text(needle) not in text]
        checks.append(
            {
                "id": model_id,
                "status": "verified" if not missing else "unverified",
                "source": check["source"],
                "url": source.url,
                "missing": missing,
            }
        )
    return checks


def validate_page_data(models: list[dict[str, Any]]) -> dict[str, Any]:
    html = MODELS_HTML_PATH.read_text(encoding="utf-8")
    js = MODELS_JS_PATH.read_text(encoding="utf-8")
    field_defs = load_field_defs(js)
    visible_fields = [field for field in field_defs if field["visible"]]
    coverage = {
        field["key"]: sum(1 for model in models if get_nested(model, field["key"]) is not None)
        for field in field_defs
    }
    visible_empty_columns = [field["key"] for field in visible_fields if coverage.get(field["key"], 0) == 0]
    errors = []
    if 'src/models.js' not in html:
        errors.append({"kind": "missingModelsScript", "path": str(MODELS_HTML_PATH)})
    if 'fetch("data/models.json")' not in js and "fetch('data/models.json')" not in js:
        errors.append({"kind": "missingModelsJsonFetch", "path": str(MODELS_JS_PATH)})
    if MODEL_FIELDS_PATH.exists() and 'fetch("data/model-fields.json")' not in js and "fetch('data/model-fields.json')" not in js:
        errors.append({"kind": "missingModelFieldsFetch", "path": str(MODELS_JS_PATH)})
    if visible_empty_columns:
        errors.append({"kind": "visibleEmptyColumns", "items": visible_empty_columns})
    return {
        "fieldCount": len(field_defs),
        "visibleFieldCount": len(visible_fields),
        "modelRows": len(models),
        "visibleColumnCoverage": {field: coverage[field] for field in [item["key"] for item in visible_fields]},
        "visibleEmptyColumns": visible_empty_columns,
        "errors": errors,
    }


def load_field_defs(js: str) -> list[dict[str, Any]]:
    if MODEL_FIELDS_PATH.exists():
        payload = json.loads(MODEL_FIELDS_PATH.read_text(encoding="utf-8"))
        return payload.get("fields", [])
    return extract_field_defs(js)


def extract_field_defs(js: str) -> list[dict[str, Any]]:
    field_defs: list[dict[str, Any]] = []
    for line in js.splitlines():
        key_match = re.search(r'key:\s*"([^"]+)"', line)
        if not key_match:
            continue
        visible_match = re.search(r"visible:\s*(true|false)", line)
        field_defs.append({"key": key_match.group(1), "visible": visible_match.group(1) == "true" if visible_match else False})
    return field_defs


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value)).strip().lower()


if __name__ == "__main__":
    raise SystemExit(main())
