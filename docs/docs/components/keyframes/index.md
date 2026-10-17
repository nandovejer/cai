# Keyframes

Five shared animations for your own components, which stop when the reader asks for reduced motion.

A fifth keyframe, `luz-fade-in`, opens the modal.

### Use a keyframe

Name the keyframe in your own `animation`, and take its duration from a [motion token](https://nandovejer.github.io/luz/docs/tokens/motion/).

Panel that slides in code
```css
.panel[open] {
  animation: luz-slide-up var(--luz-duration-base) var(--luz-easing-enter);
}
```

- Under reduced motion every `--luz-duration-*` token is `0s`, so the animation does not run and the element shows in its final state.
- A hard-coded duration ignores reduced motion: never write one.
- Do not loop an animation for ever: stop it when the task ends.

- `luz-spin`: One full turn, for a loading indicator
- `luz-shimmer`: Moves a background gradient across, for a loading placeholder
- `luz-pulse`: Grows and fades out, then back, to draw the eye once
- `luz-slide-up`: Fades in while rising 8 px, for something that appears
- `luz-fade-in`: Fades in, used by the modal and its backdrop
