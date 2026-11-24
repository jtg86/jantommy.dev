# jantommy.dev — UPTIME, an arcade CV

The site is a single arcade game: **UPTIME**, an original vertical shooter where
each stage is a chapter of Jan Tommy's career. Below the cabinet, the full CV
is laid out as the game's "operator's manual" for anyone who'd rather read than play.

Static site, no build step: `index.html`, `styles.css`, `script.js`
(plus the separate Arendal Museum demo in `museum/`).

## Preview locally
```bash
python3 -m http.server 4173 --directory .
```

## The game
| Stage | Career chapter | Boss |
|---|---|---|
| 1 · Helpdesk | IT apprentice, UECC (2004–2006) | The Queue |
| 2 · Sales & Service | PS.no, Telehuset, Terjesen, Power (2008–2019) | Quarterly Target |
| 3 · Fiber | Fiber technician, New Connection (2019–2021) | Cable Kraken |
| 4 · Fagskole | IT operations degree, TISIP (class of 2024) | The Final Exam |
| 5 · Cloud & AI | IKT Agder (now) | Legacy Monolith |

- **Skill chips** are real CV items. Each one is a power-up (rapid fire, spread,
  automation drone, shield, AI-guided missiles, +1 life) or a cert/repo bonus,
  and it is added to the *Loot log*.
- **Stage clear cards** show the CV entries for that stage, cloned straight from
  the manual's `#career .stage[data-stage="n"]` markup, so the CV text lives in one place.
- Controls: arrows/WASD or drag on touch to move, fire is automatic,
  `X` = `terraform destroy` (bomb), `P` pause, `M` sound. Gamepads work too.
- High scores and the sound setting are stored in `localStorage`, and the game
  still works when storage is blocked.
- The game pauses itself when the tab is hidden or the screen scrolls out of view.
- The manual prints as a clean CV (⎙ Print / PDF).
- Without JavaScript, only the CV is shown.

## Editing the CV
- Text: edit the manual section in `index.html` (career, stats, certs, projects).
- In-game content: `STAGES` in `script.js` (stage names, chips, bosses).

## Debugging
Open `/?debug` to get `window.UPTIME` in the console:
`UPTIME.startGame(4)`, `UPTIME.toBoss()`, `UPTIME.killBoss()`, `UPTIME.god(true)`,
`UPTIME.step(n)` (advance n frames).

## Deploy
Upload the files to any static host (GitHub Pages, Cloudflare Pages, Azure Static
Web Apps). The only external dependency is Google Fonts.
