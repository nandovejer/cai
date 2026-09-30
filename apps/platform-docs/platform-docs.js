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
