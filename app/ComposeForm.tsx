'use client';

import { useMemo, useState } from 'react';
import type { Instrument, SectionConfig, InstrumentSelectionMode, SectionName } from './types';
import MidiPlayer from './MidiPlayer';

const DEFAULT_INSTRUMENTS: Instrument[] = [
  { id: 'drums', label: 'Drums / Percussion' },
  { id: 'bass', label: 'Bass' },
  { id: 'piano', label: 'Piano' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'strings', label: 'Strings' },
  { id: 'brass', label: 'Brass' },
  { id: 'woodwinds', label: 'Woodwinds' },
  { id: 'synth', label: 'Synth' },
  { id: 'pads', label: 'Pads' },
  { id: 'lead', label: 'Lead' },
  { id: 'vocal', label: 'Vocal (MIDI)' },
  { id: 'fx', label: 'FX / Ear Candy' }
];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function defaultSections(): SectionConfig[] {
  return [
    { id: uid('sec'), name: 'Intro', mode: 'all', instruments: [] },
    { id: uid('sec'), name: 'Verse', mode: 'manual', instruments: [] },
    { id: uid('sec'), name: 'Chorus', mode: 'manual', instruments: [] },
    { id: uid('sec'), name: 'Bridge', mode: 'manual', instruments: [] },
    { id: uid('sec'), name: 'Outro', mode: 'all', instruments: [] }
  ];
}

function sectionLabel(s: SectionConfig) {
  if (s.name !== 'Other') return s.name;
  return (s.customName || 'Other').trim() || 'Other';
}

export default function ComposeForm() {
  const [file, setFile] = useState<File | null>(null);
  const [genre, setGenre] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [customInstrumentLabel, setCustomInstrumentLabel] = useState('');
  const [customInstruments, setCustomInstruments] = useState<Instrument[]>([]);
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionConfig[]>(defaultSections());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const instrumentOptions = useMemo(() => {
    const map = new Map<string, Instrument>();
    for (const inst of [...DEFAULT_INSTRUMENTS, ...customInstruments]) map.set(inst.id, inst);
    return Array.from(map.values());
  }, [customInstruments]);
  function addCustomInstrument() {
    const label = customInstrumentLabel.trim();
    if (!label) return;
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Math.random().toString(36).slice(2, 6)}`;
    const inst: Instrument = { id, label };
    setCustomInstruments((prev) => [...prev, inst]);
    setCustomInstrumentLabel('');
    // auto-select it
    setSelectedInstrumentIds((prev) => [...prev, id]);
  }

  function updateSection(sectionId: string, patch: Partial<SectionConfig>) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, { id: uid('sec'), name: 'Other', customName: '', mode: 'manual', instruments: [] }]);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  // keep per-section manual selection consistent when instrument list changes
  function normalizeSectionsForInstruments(ids: string[]) {
    setSections((prev) =>
      prev.map((s) =>
        s.mode === 'manual'
          ? { ...s, instruments: s.instruments.filter((id) => ids.includes(id)) }
          : s
      )
    );
  }

  async function onCompose() {
    setError(null);
    setDownloadUrl(null);
    setJobId(null);

    if (!file) {
      setError('Please choose a .mid/.midi file to upload.');
      return;
    }

    if (selectedInstrumentIds.length === 0) {
      setError('Select at least one additional instrument track to compose.');
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('midiFile', file);
      fd.append('genre', genre.trim());
      fd.append('subgenre', subgenre.trim());
      fd.append('instruments', JSON.stringify(selectedInstrumentIds));

      const normalizedSections = sections.map((s) => {
        const label = sectionLabel(s);
        const mode: InstrumentSelectionMode = s.mode;
        let instruments: string[] = [];
        if (mode === 'all') instruments = [...selectedInstrumentIds];
        if (mode === 'manual') instruments = s.instruments;
        if (mode === 'none') instruments = [];
        return {
          id: s.id,
          name: s.name,
          label,
          startTime: s.startTime?.trim() || '',
          endTime: s.endTime?.trim() || '',
          mode,
          instruments
        };
      });
      fd.append('sections', JSON.stringify(normalizedSections));

      const createRes = await fetch('/api/jobs', { method: 'POST', body: fd });
      if (!createRes.ok) {
        const txt = await createRes.text();
        throw new Error(`Create job failed: ${txt || createRes.status}`);
      }
      const { jobId: newJobId } = (await createRes.json()) as { jobId: string };
      setJobId(newJobId);

      const composeRes = await fetch(`/api/jobs/${newJobId}/compose`, { method: 'POST' });
      if (!composeRes.ok) {
        const txt = await composeRes.text();
        throw new Error(`Compose failed: ${txt || composeRes.status}`);
      }
      const { downloadUrl } = (await composeRes.json()) as { downloadUrl: string };
      setDownloadUrl(downloadUrl);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="row">
        <div className="label">MIDI file</div>
        <div>
          <input
            type="file"
            accept=".mid,.midi"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
            }}
          />
          <div className="small">Accepted: .mid / .midi</div>
        </div>
      </div>

      <div className="row">
        <div className="label">Genre (optional)</div>
        <input type="text" placeholder="e.g. House" value={genre} onChange={(e) => setGenre(e.target.value)} />
      </div>

      <div className="row">
        <div className="label">Subgenre (optional)</div>
        <input type="text" placeholder="e.g. Deep House" value={subgenre} onChange={(e) => setSubgenre(e.target.value)} />
      </div>

      <div className="row">
        <div>
          <div className="label">Additional instruments</div>
          <div className="small">Each selected instrument will be composed as its own track.</div>
        </div>
        <div>
          <div className="inline">
            {instrumentOptions.map((inst) => (
              <label key={inst.id} className="tag" title={inst.id}>
                <input
                  type="checkbox"
                  checked={selectedInstrumentIds.includes(inst.id)}
                  onChange={() => {
                    const next = selectedInstrumentIds.includes(inst.id)
                      ? selectedInstrumentIds.filter((x) => x !== inst.id)
                      : [...selectedInstrumentIds, inst.id];
                    setSelectedInstrumentIds(next);
                    normalizeSectionsForInstruments(next);
                  }}
                />
                {inst.label}
              </label>
            ))}
          </div>

          <div className="kv">
            <div>
              <div className="small">Add custom instrument</div>
              <input
                type="text"
                value={customInstrumentLabel}
                placeholder="e.g. Marimba"
                onChange={(e) => setCustomInstrumentLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomInstrument();
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'flex-end' }}>
              <button type="button" onClick={addCustomInstrument} disabled={!customInstrumentLabel.trim()}>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div>
          <div className="label">Sections (optional)</div>
          <div className="small">
            Define timestamps and choose which instrument tracks should be composed per section.
          </div>
        </div>
        <div className="sectionList">
          {sections.map((s) => (
            <div key={s.id} className="sectionCard">
              <div className="sectionTop">
                <div>
                  <div className="sectionName">{sectionLabel(s)}</div>
                  <div className="small">
                    Mode: <b>{s.mode}</b>
                    {s.startTime || s.endTime ? (
                      <> • Times: {s.startTime || '—'} → {s.endTime || '—'}</>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => removeSection(s.id)}
                    disabled={sections.length <= 1}
                    title="Remove section"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="kv">
                <div>
                  <div className="small">Section type</div>
                  <select
                    value={s.name}
                    onChange={(e) => {
                      updateSection(s.id, { name: e.target.value as SectionName });
                    }}
                  >
                    {(['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro', 'Other'] as SectionName[]).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="small">Custom name (if Other)</div>
                  <input
                    type="text"
                    value={s.customName || ''}
                    disabled={s.name !== 'Other'}
                    placeholder="e.g. Breakdown"
                    onChange={(e) => updateSection(s.id, { customName: e.target.value })}
                  />
                </div>
              </div>

              <div className="kv">
                <div>
                  <div className="small">Start time (optional)</div>
                  <input
                    type="text"
                    placeholder="e.g. 0:15"
                    value={s.startTime || ''}
                    onChange={(e) => updateSection(s.id, { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <div className="small">End time (optional)</div>
                  <input
                    type="text"
                    placeholder="e.g. 0:45"
                    value={s.endTime || ''}
                    onChange={(e) => updateSection(s.id, { endTime: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="small">Which instrument tracks should be composed in this section?</div>
                <div className="inline" style={{ marginTop: 8 }}>
                  {(['all', 'none', 'manual'] as InstrumentSelectionMode[]).map((mode) => (
                    <label key={mode} className="tag">
                      <input
                        type="radio"
                        name={`mode_${s.id}`}
                        checked={s.mode === mode}
                        onChange={() => updateSection(s.id, { mode })}
                      />
                      {mode}
                    </label>
                  ))}
                </div>

                {s.mode === 'manual' ? (
                  <div className="inline" style={{ marginTop: 10 }}>
                    {selectedInstrumentIds.length === 0 ? (
                      <div className="small">Select instruments above to enable manual section selection.</div>
                    ) : (
                      selectedInstrumentIds.map((id) => {
                        const label = instrumentOptions.find((x) => x.id === id)?.label || id;
                        const checked = s.instruments.includes(id);
                        return (
                          <label key={`${s.id}_${id}`} className="tag">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked ? s.instruments.filter((x) => x !== id) : [...s.instruments, id];
                                updateSection(s.id, { instruments: next });
                              }}
                            />
                            {label}
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : null}

                {s.mode === 'manual' && selectedInstrumentIds.length > 0 ? (
                  <div className="small" style={{ marginTop: 8 }}>
                    Selected in this section: {s.instruments.length === 0 ? 'None' : s.instruments.join(', ')}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          <div>
            <button type="button" onClick={addSection}>Add section</button>
            <div className="small">If you don&apos;t care about sections, set all section modes to <b>all</b>.</div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="row">
          <div className="label">Status</div>
          <div className="error">{error}</div>
        </div>
      ) : null}

      {jobId ? (
        <div className="row">
          <div className="label">Job</div>
          <div className="small">{jobId}</div>
        </div>
      ) : null}

      {downloadUrl ? (
        <div className="row">
          <div className="label">Download</div>
          <div>
            <div className="success">Your MIDI is ready.</div>
            <div style={{ marginTop: 8 }} className="btnRow">
              <a href={downloadUrl}>
                <button type="button" className="primary">Download MIDI</button>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {jobId ? <MidiPlayer jobId={jobId} /> : null}

      <div className="btnRow" style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setGenre('');
            setSubgenre('');
            setCustomInstrumentLabel('');
            setCustomInstruments([]);
            setSelectedInstrumentIds([]);
            setSections(defaultSections());
            setError(null);
            setJobId(null);
            setDownloadUrl(null);
          }}
          disabled={busy}
        >
          Reset
        </button>
        <button type="button" className="primary" onClick={onCompose} disabled={busy}>
          {busy ? 'Composing…' : 'Compose'}
        </button>
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        Note: the current server implementation is a stub and returns the original file. We&apos;ll plug in real arranging next.
      </div>
    </div>
  );
}
