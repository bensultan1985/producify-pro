import ComposeForm from './ComposeForm';

export default function Page() {
  return (
    <main className="container">
      <header className="header">
        <div className="h1">MIDI Composer UI</div>
        <div className="sub">
          Upload a MIDI file, optionally set genre/subgenre, choose additional instrument tracks, and (optionally) define song sections
          with timestamps and per-section instrument selection. Then press <b>Compose</b> to request an AI arrangement.
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <div className="cardTitle">Composition Request</div>
          <ComposeForm />
        </div>

        <div className="card">
          <div className="cardTitle">How it works (current stub)</div>
          <div className="notice">
            <p style={{ marginTop: 0 }}>
              This starter app includes:
            </p>
            <ul style={{ marginTop: 0 }}>
              <li>Postgres schema (Prisma) for jobs + metadata</li>
              <li>Upload + store original MIDI on disk (./uploads) and job record in Postgres</li>
              <li>&quot;Compose&quot; API endpoint that currently returns a copy of the original MIDI</li>
              <li>Download endpoint that streams the produced MIDI</li>
            </ul>
            <div className="hr" />
            <p style={{ marginBottom: 0 }}>
              Next iteration: we can plug in a real arranger (LLM/tooling), parse the original MIDI, and generate new tracks.
            </p>
          </div>

          <div style={{ marginTop: 12 }} className="pill">
            Tip: use a local Postgres like Docker, then run <code>npm run prisma:migrate</code>.
          </div>
        </div>
      </div>
    </main>
  );
}
