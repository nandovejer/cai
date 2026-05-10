# CAI Design System Roadmap

## Vision

**CAI is a vanilla-first design system for teams that value simplicity, portability, and standards over framework abstraction.** We target designers and developers who want zero build steps, semantic HTML, and CSS custom properties they can understand and extend.

Target users:
- **Indie makers & small teams** building web products
- **Design system maintainers** needing a lightweight foundation
- **Educators** teaching HTML/CSS/a11y without framework overhead
- **Embedded use cases** (docs sites, component libraries, design tokens)

**We will NOT compete with Carbon/Foundation on features.** We compete on:
- ✓ Simplicity (2 files, 0 build step)
- ✓ Portability (works in any stack)
- ✓ Standards compliance (semantic HTML, WCAG 2.1 AA)
- ✓ Extensibility (CSS custom properties, not locked to API)

---

## Version Roadmap

### **v2.0.0** (Current — May 2026)
- ✓ Core token system (primitives + semantic)
- ✓ Base components (buttons, forms, cards, tables, alerts, etc.)
- ✓ Media players (video, audio, MIDI)
- ✓ Two custom themes (Minimalist, Ricardo & Mortimer)
- ✓ HTML5 semantic element styling (details, mark, kbd, figure, time, output, meter)
- ✓ Keyboard accessibility (Tab, Enter, Space, Escape)
- ✓ Landing page + GitHub Pages ready
- ✓ Semantic headings (h2, h3 throughout)
- ✓ Full English documentation

### **v1.3.0** (Q3 2026) — Accessibility, Platform, & Polish
- [x] **Extract app-shell patterns into `@cai-ds/platform`** (accelerated from v1.4)
  - [x] Define boundary between `core` and `platform`
  - [x] Move shared app-shell primitives (skip-link, page header, content shell, footer, feature grid, command block)
  - [x] Establish dependency hierarchy: `tokens` → `core` → `platform`
  - [x] Build script integration (`pnpm platform:build`)
- [ ] WCAG 2.1 AA audit + fixes
- [ ] Screen reader testing (VoiceOver, NVDA, JAWS)
- [ ] Keyboard navigation matrix for all components
- [ ] Color contrast audit (ensure ≥4.5:1 for text)
- [ ] Focus management in modals (trap + restore)
- [ ] Improved sidebar drawer on mobile (<768px)
- [ ] Documentation: a11y checklist for components
- [ ] Minimum unit testing baseline for core JS behaviors
- [ ] Minimum UI smoke suite for critical keyboard/a11y flows
- [ ] Changelog + migration guide

### **v1.4.0** (Q4 2026) — Theming, Editor & Platform Expansion
- [ ] Platform JS orchestration layer (reserved in v1.3, ready for first helpers)
  - [ ] Design the orchestration API (app-state, shell initialization)
  - [ ] First real Platform JS helper (e.g., shared app initialization)
  - [ ] Examples: workspace orchestration, shared navigation patterns
- [ ] Token editor tool (visual UI for custom tokens)
- [ ] CSS variable override guide
- [ ] Dark mode refinement (perceptual color matching)
- [ ] High contrast mode audit
- [ ] Performance audit (Lighthouse)
- [ ] Extended platform primitives (if justified by user demand)

### **v2.0.0** (2027) — Ecosystem Expansion
- [ ] `@cai-ds/react` — thin React wrapper (if demanded)
- [ ] `@cai-ds/vue` — thin Vue wrapper (if demanded)
- [ ] CLI: `npx create-cai-project` scaffolding
- [ ] Figma design tokens plugin
- [ ] Component Figma library
- [ ] Icon set formalization
- [ ] Typography scale generator

---

## Backlog (Not Committed)

### Nice-to-have Components
- [ ] Dialog (native `<dialog>` wrapper)
- [ ] Dropdown/Context menu
- [ ] Pagination
- [ ] File uploader
- [ ] Search autocomplete
- [ ] Date picker styling
- [ ] Toast notification queue
- [ ] Skeleton loader patterns

### Tooling
- [ ] Design tokens CLI
- [ ] VSCode extension (autocomplete)
- [ ] Storybook integration
- [ ] Component browser in docs

### Documentation
- [ ] "Build a theme in 30 minutes" tutorial
- [ ] "Extend CAI for your brand" guide
- [ ] Pattern library (common layouts)
- [ ] Migration guide from other systems
- [ ] Design decisions record (ADRs)

---

## Release Cycle

- **Minor releases**: Every 3–4 months (bug fixes, a11y, new components)
- **Patch releases**: As needed (critical bug fixes)
- **Major releases**: ~1 year (only if necessary breaking changes)

---

## Non-Goals

❌ **We will NOT:**
- Build a 1000-component library
- Add runtime dependencies (stay vanilla)
- Create framework-specific implementations first
- Compete on design trends
- Force adoption of naming conventions
- Build design-to-code generator
- Provide design templates

---

## Success Metrics (v1.x)

- [ ] 100 GitHub stars (community validation)
- [ ] Used in 3+ production projects
- [ ] WCAG 2.1 AA certification
- [ ] ≥95 Lighthouse score (performance + a11y)
- [ ] <100 open issues
- [ ] Documentation covers 100% of components + tokens
- [ ] Response time to issues: ≤1 week

---

## Contributing

We welcome contributions for:
- Bug fixes & a11y improvements
- Documentation & typo fixes
- Component refinements
- Theme contributions

See CONTRIBUTING.md (TBD) for guidelines.

---

## FAQ

**Q: Will CAI become a React component library?**  
A: Only if demand is clear. Wrappers will be thin (HTML → JSX), not a rewrite.

**Q: Can I extend CAI tokens?**  
A: Yes. CSS custom properties are designed to be overridden. Edit `--cai-*` tokens in your CSS.

**Q: Why not support older browsers?**  
A: CSS custom properties require modern browsers. If you need IE11, this isn't for you.

**Q: How do you monetize this?**  
A: We don't, yet. If Figma plugin + token editor sees adoption, that's where revenue could be.

**Q: Will there be paid add-ons?**  
A: Unlikely. CAI is intentionally non-exclusive and MIT-licensed. Community stays free.
