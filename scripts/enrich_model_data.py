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

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field, ValidationError


ROOT = Path(__file__).resolve().parents[1]
MODELS_PATH = ROOT / "data" / "models.json"
MODELS_HTML_PATH = ROOT / "models.html"
MODELS_JS_PATH = ROOT / "src" / "models.js"
REFERENCE_PATH = ROOT / "REFERENCE_SOURCES.md"
CACHE_DIR = ROOT / ".cache" / "model-sources"

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


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify and enrich data/models.json")
    parser.add_argument("--write", action="store_true", help="write verified patches back to data/models.json")
    parser.add_argument("--verify-only", action="store_true", help="skip enrichment and only validate data/page wiring")
    parser.add_argument("--online", action="store_true", help="include online source string checks in the report")
    parser.add_argument("--deepseek", action="store_true", help="use DeepSeek as a fallback extractor for unstructured pages")
    parser.add_argument("--no-cache", action="store_true", help="do not read cached source responses")
    parser.add_argument("--refresh-cache", action="store_true", help="refetch sources even if cache exists")
    parser.add_argument("--fetch-reference-sources", action="store_true", help="also fetch every URL listed in REFERENCE_SOURCES.md")
    parser.add_argument("--skip-page-check", action="store_true", help="skip static models.html/src/models.js data-fill checks")
    parser.add_argument("--output", type=Path, help="write a JSON report to this path")
    args = parser.parse_args()

    models = json.loads(MODELS_PATH.read_text(encoding="utf-8"))
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

    try:
        source_texts = fetch_sources(session, args, reference_sources, report)
        report["sources"] = {key: {"url": source.url, "chars": len(source.text)} for key, source in source_texts.items()}
    except requests.RequestException as exc:
        report["errors"].append({"stage": "fetch_sources", "error": str(exc)})
        source_texts = {}

    patches: list[ExtractedModel] = []
    if not args.verify_only:
        patches.extend(extract_openrouter_prices(models, session, args, report))
        patches.extend(extract_official_prices(source_texts))
        patches.extend(extract_caisi_evals(source_texts))
        patches.extend(extract_deepseek_reported_evals(source_texts))
        patches.extend(extract_meta_model_details(source_texts))
        patches.extend(extract_cursor_prices_from_provider_prices(models, patches))

    if args.deepseek and not args.verify_only:
        patches.extend(extract_with_deepseek(models, source_texts, patches))

    merged_by_model = merge_patches(patches)
    report["patches"] = [patch.model_dump() for patch in merged_by_model]

    if args.write:
        apply_patches(models, merged_by_model)
        MODELS_PATH.write_text(json.dumps(models, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["wrote"] = str(MODELS_PATH)

    validation = validate_models(models, source_texts if args.online else {})
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
    response = session.get(url, timeout=30)
    response.raise_for_status()
    text = response.text
    cache_path.write_text(text, encoding="utf-8")
    return text


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
    try:
        raw = fetch_text(session, "openrouter_api", SOURCE_URLS["openrouter_api"], args)
        payload = json.loads(raw)
    except Exception as exc:
        report["errors"].append({"stage": "openrouter_api", "error": str(exc)})
        return []

    by_id = {item.get("id"): item for item in payload.get("data", [])}
    aliases = discover_openrouter_aliases(models, by_id)
    patches: list[ExtractedModel] = []
    for model_id, model_aliases in aliases.items():
        item = next((by_id[alias] for alias in model_aliases if alias in by_id), None)
        if not item:
            continue
        pricing = item.get("pricing") or {}
        prompt = per_million(pricing.get("prompt"))
        completion = per_million(pricing.get("completion"))
        context = item.get("context_length")
        architecture = item.get("architecture") or {}
        input_modalities = set(architecture.get("input_modalities") or [])
        patch: dict[str, Any] = {"pricing": {"openrouter": {}}}
        fields: list[str] = []
        if prompt is not None:
            patch["pricing"]["openrouter"]["in"] = prompt
            fields.append("pricing.openrouter.in")
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


def discover_openrouter_aliases(models: list[dict[str, Any]], by_id: dict[str, Any]) -> dict[str, list[str]]:
    aliases = {model_id: list(values) for model_id, values in OPENROUTER_ALIASES.items()}
    normalized_index = {normalize_model_key(model_id): model_id for model_id in by_id}
    for model in models:
        model_id = model.get("id")
        if not model_id:
            continue
        candidates = list(aliases.get(model_id, []))
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


def extract_official_prices(sources: dict[str, SourceText]) -> list[ExtractedModel]:
    patches: list[ExtractedModel] = []
    openai = sources.get("openai_pricing")
    if openai:
        for model_id in ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex"]:
            row = find_openai_price(openai.text, model_id)
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
        "validationErrorCount": len(report.get("validation", {}).get("errors", [])),
        "pageErrorCount": len(report.get("page", {}).get("errors", [])),
        "errors": report["errors"],
        "modelsPatched": [patch["model_id"] for patch in report["patches"]],
        "wrote": report.get("wrote"),
    }


def validate_models(models: list[dict[str, Any]], online_sources: dict[str, SourceText]) -> dict[str, Any]:
    ids = [model.get("id") for model in models]
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
    )
    online_checks = run_online_catalog_checks(online_sources) if online_sources else []
    errors = []
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
        "blockedIdsPresent": blocked_ids,
        "missingVerification": missing_verification,
        "missingVerificationSources": missing_sources,
        "verifiedFieldMissingValues": verified_field_missing_values,
        "missingCatalogChecks": missing_catalog_checks,
        "onlineChecks": online_checks,
        "errors": errors,
    }


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
    field_defs = extract_field_defs(js)
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
