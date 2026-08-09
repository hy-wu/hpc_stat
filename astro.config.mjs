import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hy-wu.github.io",
  base: "/hpc_stat",
  output: "static",
  build: { format: "file" },
});
