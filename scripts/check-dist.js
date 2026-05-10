import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sentinel = resolve(__dirname, "../packages/tokens/dist/cai-tokens.css");

if (!existsSync(sentinel)) {
  console.log("dist/ not found — running full build...");
  execSync("pnpm build", { stdio: "inherit" });
} else {
  console.log("dist/ exists — skipping build.");
}
