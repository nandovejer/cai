import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const docsRoot = resolve(__dirname, "apps/docs");
const landingRoot = resolve(__dirname, "apps/landing");
const platformDocsRoot = resolve(__dirname, "apps/platform-docs");
const distRoot = resolve(__dirname, "dist");

function normalizeAppEntryRoutes() {
  return {
    name: "normalize-app-entry-routes",
    closeBundle() {
      const builtLanding = resolve(distRoot, "apps/landing/index.html");
      const builtDocs = resolve(distRoot, "apps/docs/index.html");
      const builtPlatformDocs = resolve(distRoot, "apps/platform-docs/index.html");
      const publicLanding = resolve(distRoot, "index.html");
      const publicDocsDir = resolve(distRoot, "docs");
      const publicDocs = resolve(publicDocsDir, "index.html");
      const publicPlatformDir = resolve(distRoot, "platform");
      const publicPlatformDocs = resolve(publicPlatformDir, "index.html");

      if (!existsSync(builtLanding) || !existsSync(builtDocs) || !existsSync(builtPlatformDocs)) {
        return;
      }

      mkdirSync(publicDocsDir, { recursive: true });
      mkdirSync(publicPlatformDir, { recursive: true });
      copyFileSync(builtLanding, publicLanding);
      copyFileSync(builtDocs, publicDocs);
      copyFileSync(builtPlatformDocs, publicPlatformDocs);
      rmSync(resolve(distRoot, "apps"), { recursive: true, force: true });
    },
  };
}

function devRouteRewrite() {
  return {
    name: "dev-route-rewrite",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Strip query string for matching
        const url = (req.url ?? "/").split("?")[0];

        if (url === "/" || url === "/index.html") {
          req.url = "/apps/landing/index.html";
        } else if (url === "/docs" || url === "/docs/") {
          req.url = "/apps/docs/index.html";
        } else if (url === "/platform" || url === "/platform/") {
          req.url = "/apps/platform-docs/index.html";
        } else if (url === "/apps/landing" || url === "/apps/landing/") {
          req.url = "/apps/landing/index.html";
        } else if (url === "/apps/docs" || url === "/apps/docs/") {
          req.url = "/apps/docs/index.html";
        } else if (
          url === "/apps/platform" ||
          url === "/apps/platform/" ||
          url === "/apps/platform-docs" ||
          url === "/apps/platform-docs/"
        ) {
          req.url = "/apps/platform-docs/index.html";
        }

        next();
      });
    },
  };
}

export default defineConfig({
  root: __dirname,
  publicDir: false,
  plugins: [devRouteRewrite(), normalizeAppEntryRoutes()],
  server: {
    open: "/",
    fs: {
      allow: [__dirname],
    },
  },
  build: {
    outDir: distRoot,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(landingRoot, "index.html"),
        "docs/index": resolve(docsRoot, "index.html"),
        "platform/index": resolve(platformDocsRoot, "index.html"),
      },
    },
  },
});
