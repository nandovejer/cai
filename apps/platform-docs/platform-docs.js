/**
 * CAI platform docs — page entry
 * Points the MIDI player at a URL that exists in the built site (the build
 * does not rewrite data-* attributes), then loads cai.js. The import is
 * dynamic on purpose: a static import would run cai.js, and mount the
 * players, before this module's body.
 */

const midiPlayer = document.querySelector('.cai-player[data-type="midi"]');
if (midiPlayer) {
  midiPlayer.dataset.src = new URL("./assets/sample.mid", import.meta.url).href;
}

import("../../packages/core/dist/cai.js");

/* Demo wiring, moved here from an inline script (PRINCIPLES.md §3) */
function bindRangeOutput(inputId, outputId) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  if (!input || !output) return;

  const sync = () => {
    output.value = input.value;
  };

  input.addEventListener("input", sync);
  sync();
}

bindRangeOutput("pf-range-a", "pf-range-a-out");
bindRangeOutput("pf-range-b", "pf-range-b-out");
bindRangeOutput("pf-ex-experience", "pf-ex-experience-out");

const demoForm = document.getElementById("pf-demo-form");
const formResult = document.getElementById("pf-form-result");

if (demoForm && formResult) {
  demoForm.addEventListener("submit", (event) => {
    // eslint-disable-next-line no-restricted-syntax -- RL-3: a demo form has no endpoint; the result is shown in place
    event.preventDefault();
    if (!demoForm.checkValidity()) {
      formResult.textContent = "Please complete required fields before submitting.";
      return;
    }
    formResult.textContent = "Form submitted successfully (demo only).";
  });

  demoForm.addEventListener("reset", () => {
    formResult.textContent = "";
  });
}

const motionReplayBtn = document.querySelector("[data-pdocs-motion-replay]");
const motionCards = Array.from(document.querySelectorAll("[data-pdocs-motion-card]"));

if (motionReplayBtn && motionCards.length) {
  const replayMotion = () => {
    motionCards.forEach((card, index) => {
      card.classList.remove("is-revealing");
      window.setTimeout(() => {
        card.classList.add("is-revealing");
      }, index * 90);
    });
  };

  motionReplayBtn.addEventListener("click", replayMotion);
  replayMotion();
}

