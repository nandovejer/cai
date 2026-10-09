---
"@cai-ds/core": major
---

**Breaking:** `.cai-nav-toggle` is no longer fixed to the top start corner. It sits in the flow, so you put it first in your header row and the focus order follows what is on screen (WCAG 2.4.3). It is now a bordered 40px button on the page surface, like the other header controls, instead of a dark square in the sidebar colours.

To keep the old position, add `.cai-nav-toggle--fixed`.
