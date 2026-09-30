/**
 * CAI Design System — Toggle switch
 * Click + keyboard support for .cai-toggle__track[role="switch"].
 *
 * Importing this module has no side effects; call initToggles() to wire up
 * delegation, or use setToggleState() directly.
 */

export function setToggleState(track, checked) {
  track.classList.toggle("is-on", checked);
  track.setAttribute("aria-checked", String(checked));
}

function toggleSwitch(track) {
  setToggleState(track, !track.classList.contains("is-on"));
}

/**
 * Wire up delegated click + Space/Enter handling for switch toggles.
 */
export function initToggles() {
  document.body.addEventListener("click", (e) => {
    const toggleTrack = e.target.closest('.cai-toggle__track[role="switch"]');
    if (toggleTrack) toggleSwitch(toggleTrack);
  });

  document.addEventListener("keydown", (e) => {
    const toggleTrack = e.target.closest?.('.cai-toggle__track[role="switch"]');
    if (!toggleTrack) return;

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleSwitch(toggleTrack);
    }
  });
}
