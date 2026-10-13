---
"@cai-ds/core": minor
---

Avatar can hold a photo: an `<img>` inside `.cai-avatar` fills the box (`inline-size` and `block-size` 100 %, `object-fit: cover`) with the avatar's own corners (`border-radius: inherit`). The box does not clip (no `overflow: hidden`), so initials that outgrow a 24 px box at 200 % text stay readable. A photo alone is named by its `alt`, with the person's name (and the action, when it is all there is in a link or button); beside the name it has `alt=""`. For the portrait of a speaker, the docs point to a card with the image frame. Page: `/docs/components/avatar/`.
