# AGENTS.md — Guidance for AI coding agents

## Project overview
Static portfolio site: `index.html`, `styles.css`, `script.js`. No build step, package manager or test framework.

## Build / lint / test commands
- **Run locally**: open `index.html` in a browser (or use `npx serve .` / VS Code Live Server).
- **Lint CSS**: `npx stylelint "*.css"` (install stylelint first if needed).
- **Lint JS**: `npx eslint script.js` (install eslint first if needed).
- No automated tests exist; manual browser verification is the norm.

## Code style guidelines
- **HTML**: Use semantic elements; keep indentation at 4 spaces; place `<script>` before `</body>`.
- **CSS**: Follow BEM-ish naming (`section-header`, `hero-title`); use CSS custom properties defined in `:root`; mobile styles via `@media` at the end of `styles.css`.
- **JS**: ES6+ (const/let, arrow functions, template literals); no frameworks; event listeners via `addEventListener`; avoid `var`.
- **Formatting**: 4-space indentation across all files; single blank line between logical blocks.
- **Error handling**: Wrap optional DOM queries with `if (element)` checks to avoid null errors.
- **Naming**: camelCase for JS variables/functions; kebab-case for CSS classes and IDs.
