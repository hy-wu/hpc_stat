#!/usr/bin/env node
/**
 * prebuild hook: copy data/*.json → public/data/
 * so that Astro islands can fetch() them at runtime
 * with the same URLs as the legacy static site.
 */
import { cpSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "data");
const dest = resolve(root, "public", "data");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log(`synced data/*.json → public/data/`);
