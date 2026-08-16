import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";
import {
  injectSeoIntoHtml,
  llmsFullTxt,
  llmsTxt,
  prerenderPages,
  robotsTxt,
  sitemapXml,
} from "./src/lib/seo";

function writePublicSeoFiles(dir: string) {
  writeFileSync(resolve(dir, "robots.txt"), robotsTxt());
  writeFileSync(resolve(dir, "sitemap.xml"), sitemapXml());
  writeFileSync(resolve(dir, "llms.txt"), llmsTxt());
  writeFileSync(resolve(dir, "llms-full.txt"), llmsFullTxt());
}

/**
 * Writes crawl files and unique HTML shells for public strain/terpene
 * routes so non-JS crawlers get titles, JSON-LD, and noscript copy.
 */
export function seoPlugin(): Plugin {
  let outDir = "dist";
  let publicDir = "public";

  return {
    name: "StrainEase-seo",
    configResolved(config) {
      outDir = config.build.outDir;
      publicDir = config.publicDir;
    },
    buildStart() {
      writePublicSeoFiles(publicDir);
    },
    closeBundle() {
      writePublicSeoFiles(outDir);
      const indexPath = resolve(outDir, "index.html");
      const indexHtml = readFileSync(indexPath, "utf8");
      for (const page of prerenderPages()) {
        const html = injectSeoIntoHtml(indexHtml, page);
        const dest = resolve(outDir, page.filePath);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, html);
      }
    },
  };
}
