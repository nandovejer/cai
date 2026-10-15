import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// One sentinel per package: a missing dist in ANY of them triggers a build
const sentinels = [
  "../packages/tokens/dist/luz-tokens.css",
  "../packages/core/dist/luz.css",
  "../packages/site/dist/site.css",
  "../packages/landing/dist/landing.css",
  "../packages/cms/dist/cms.css",
  "../packages/app/dist/app.css",
].map((p) => resolve(__dirname, p));

const missing = sentinels.filter((p) => !existsSync(p));

if (missing.length > 0) {
  console.log("dist/ incomplete — running full build...");
  execSync("pnpm build", { stdio: "inherit" });
} else {
  console.log("dist/ exists — skipping build.");
}
