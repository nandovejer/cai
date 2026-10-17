# Shadows

The elevation scale: how far a surface seems to float above the page.

The higher the surface, the larger the shadow. Never use a shadow as the only edge of a surface: pair it with a border, because shadows disappear in forced colors.

The values below are the light ones. In dark mode the small, medium and large shadows are redrawn heavier, with a black of 40, 50 and 60 percent, because a pale shadow does not show on a dark surface. In high contrast they are replaced by outlines: the small shadow is none, the medium one is a 1px black line and the large one a 2px black line, since a blur is invisible there. `--luz-shadow-icon` is written once, so every mode reads the same value.

- `--luz-shadow-sm`: a card under the pointer.
- `--luz-shadow-md`: tooltips and toasts.
- `--luz-shadow-lg`: dialogs and the drawer.
- `--luz-shadow-icon`: an icon over a picture, such as the play button on a video.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
