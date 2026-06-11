# jantommy.dev — portfolio v2

Static site, no build step. Three files: `index.html`, `style.css`, `script.js`.

## Preview locally
```bash
python3 -m http.server 4173 --directory .
```

## Deploy
Upload the three files to any static host (GitHub Pages, Cloudflare Pages,
Azure Static Web Apps). No dependencies besides Google Fonts.

## Interactive bits
- Terraform lab (`#lab`): run init/plan/apply/destroy and watch the Azure
  architecture diagram deploy — mirrors the azure-ai-terraform-demo repo
- Filterable certifications grid (`#certs`) sourced from linkedin.md
- Contact is a plain mailto button (no form backend needed)

## Easter eggs
- Click the robot mascot ("Bit") for random quips
- All creature eyes follow the mouse; the teal peeker hides if you chase it
- Konami code (↑↑↓↓←→←→BA) activates party mode (unadvertised)
