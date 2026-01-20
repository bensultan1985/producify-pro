# MIDI Composer UI (Next.js + Postgres)

This is a starter Next.js app that provides a UI and API scaffolding for:
- Uploading a MIDI file
- Optionally providing genre + subgenre
- Selecting additional instruments to be AI-composed (each instrument = track)
- Optionally defining song sections with timestamps and per-section instrument selection
- Pressing **Compose** to run a server-side composer and download the resulting MIDI

> ⚠️ Current status: the server-side "compose" is a **stub** that simply returns a copy of the uploaded MIDI. It's wired for us to plug in a real arranger in the next iteration.

## Tech
- Next.js App Router (React)
- Postgres via Prisma

## Local setup

1) Install dependencies:
```bash
npm install
```

2) Create a Postgres DB and set `DATABASE_URL`:
```bash
cp .env.example .env
```

3) Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4) Start the dev server:
```bash
npm run dev
```

Open http://localhost:3000

## API endpoints
- `POST /api/jobs` – accepts `multipart/form-data` with:
  - `midiFile` (File)
  - `genre` (string)
  - `subgenre` (string)
  - `instruments` (JSON array of instrument ids)
  - `sections` (JSON array of section configs)
- `POST /api/jobs/:jobId/compose` – runs the composer (stub)
- `GET /api/jobs/:jobId` – job status + metadata
- `GET /api/jobs/:jobId/download` – streams the output MIDI

## Where files go
- Original uploads: `./uploads`
- Output files: `./outputs`

> In production/serverless, you'd likely move these to object storage (S3/R2/GCS) and store URLs in Postgres.

## Next iteration ideas
- MIDI parsing + track manipulation (e.g., `@tonejs/midi` or similar)
- Real composition pipeline (LLM + rules, or symbolic music model)
- Background job queue (BullMQ / pg-boss) + progress polling
- Authentication + user libraries
