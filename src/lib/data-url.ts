/**
 * Resolve a data-file URL under the Astro base path so fetches work
 * no matter what page path (or trailing-slash state) the document is
 * served at (e.g. /hpc_stat vs /hpc_stat/ vs /hpc_stat/index.html).
 * In dev, BASE_URL is "/hpc_stat/"; in production builds it is the
 * configured base too, so absolute paths are always stable.
 */

export function dataUrl(path: string): string {
  const base = String(import.meta.env.BASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/data/${path}`;
}