# Scott Mann Landing Page V1

Approved Take the Mic landing page for Scott Mann.

## Project structure

- `dist/` — production-ready static landing page and application form
- `server/application-worker.mjs` — Resend-compatible application submission handler
- `.env.example` — required environment variable names
- `HANDOFF.md` — implementation, Resend, testing, and launch instructions
- `.openai/hosting.json` — current Sites deployment configuration

## Current behavior

The three-step application runs in preview mode. Entries remain on the applicant's device and are not transmitted until the production endpoint is connected and preview mode is disabled in `dist/form-config.js`.

## Live approved preview

https://take-the-mic-scott-mann.mimiferr92.chatgpt.site

See [HANDOFF.md](./HANDOFF.md) before enabling production submissions.
