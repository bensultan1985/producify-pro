# MIDI Composer UI (Next.js + Postgres + OpenAI)

This is a Next.js app that provides a UI and API for:
- Uploading a MIDI file
- Optionally providing genre + subgenre
- Selecting additional instruments to be AI-composed (each instrument = track)
- Optionally defining song sections with timestamps and per-section instrument selection
- Pressing **Compose** to run an AI-powered composer and download the resulting MIDI

> ✅ The server-side composer uses OpenAI to generate musical arrangements that layer on top of your MIDI input.

## Tech
- Next.js App Router (React)
- Postgres via Prisma
- OpenAI API for AI music composition
- @tonejs/midi for MIDI parsing and generation

## Local setup

1) Install dependencies:
```bash
npm install
```

2) Create a Postgres DB and set environment variables:
```bash
cp .env.example .env
```
Edit `.env` and set:
- `DATABASE_URL` - your Postgres connection string
- `OPENAI_API_KEY` - your OpenAI API key for AI composition

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
- `POST /api/jobs/:jobId/compose` – runs the AI composer to generate musical arrangements
- `GET /api/jobs/:jobId` – job status + metadata
- `GET /api/jobs/:jobId/download` – streams the output MIDI

## Where files go
- Original uploads: `./uploads`
- Output files: `./outputs`

> In production/serverless, you'd likely move these to object storage (S3/R2/GCS) and store URLs in Postgres.

## Next iteration ideas
- Background job queue (BullMQ / pg-boss) + progress polling for long-running compositions
- Authentication + user libraries
- Fine-tune composition parameters (temperature, creativity level)
- Support for more AI models (Claude, custom music generation models)
- Real-time composition preview
