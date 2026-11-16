# KhelSpot

Indoor sports court booking for Pakistan (padel, futsal, indoor cricket, badminton). E-Commerce semester project, The University of Lahore, Fall 2026.

## Repository layout

| Folder | What it holds | Status |
|---|---|---|
| `Frontend/` | Next.js + TypeScript web app, currently the landing page | In progress |
| `Server/` | Backend API | Not started |
| `Mobile App/` | Player mobile app | Not started |
| `brand/` | Brand brief: positioning, messaging, voice, visual identity | Done |
| `.agents/brand-context.md` | Brand context read by the brand-building skills | Done |
| `.claude/skills/` | Brand-building skills (`npx skills add arnabbagxd/brand-building-skills`) | Installed |

Logo design canvas (Claude Design): https://claude.ai/artifact/3esBZTKekF1yMA175Czrdr

## Run the frontend

```bash
cd Frontend && npm install && npm run dev
```

Then open http://localhost:3000. The booking widget uses sample data, and the waitlist form validates in the browser but does not send anywhere yet.
