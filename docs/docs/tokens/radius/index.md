# Radius

The corner radius scale: square, 2px, 4px at most, and round.

Every box has the same corner, `--luz-radius-md` (4px): buttons, fields with a full border, cards, alerts, menus, dialogs. It is the ceiling: no rectangle is rounder. `--luz-radius-sm` is for small marks (inline code, `kbd`, a checkbox, a thin bar) and for a row inside a rounded box, so the two corners stay concentric. `--luz-radius-none` is for a box that joins a neighbour, or a field drawn by its bottom edge only, such as the select and the text field.

`--luz-radius-full` is not a corner: it makes a pill or a circle, for shapes that are round by nature, such as the switch track and the count badge. A dot, a radio button or a slider thumb is a circle with `50%`.

The values are not repeated here: the primitives are in `tokens.json` of @luz-ds/tokens, and every custom property of a package, with the file that declares it, is in the `properties` of its `classes.json`.
