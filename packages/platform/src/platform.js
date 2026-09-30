// Platform is CSS-first: this entrypoint carries no behavior beyond a
// load-order check, and is reserved for future platform-level hooks.

// Core is a required peer: platform styles are built on its settings layer.
if (typeof document !== "undefined") {
  const probe = getComputedStyle(document.documentElement).getPropertyValue(
    "--cai-z-toast",
  );
  if (!probe.trim()) {
    console.warn(
      "[cai] @cai-ds/core is not loaded. Load cai-tokens.css and cai.css before platform.css.",
    );
  }
}

export {};
