'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

type TrackType = 'original' | 'enhanced';

interface MidiPlayerProps {
  jobId: string;
  onClose?: () => void;
}

export default function MidiPlayer({ jobId, onClose }: MidiPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [trackType, setTrackType] = useState<TrackType>('original');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasOriginal, setHasOriginal] = useState(false);
  const [hasEnhanced, setHasEnhanced] = useState(false);

  const synthsRef = useRef<Tone.PolySynth[]>([]);
  const midiDataRef = useRef<Midi | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  useEffect(() => {
    loadMidiFile();
    return () => {
      cleanup();
    };
  }, [jobId, trackType]);

  async function loadMidiFile() {
    setIsLoading(true);
    setError(null);
    cleanup();

    try {
      // Check job status to determine available tracks
      const jobRes = await fetch(`/api/jobs/${jobId}`);
      if (!jobRes.ok) throw new Error('Failed to load job info');
      const jobData = await jobRes.json();
      
      // Original is available if job exists, enhanced is available if status is COMPLETE
      setHasOriginal(true);
      setHasEnhanced(jobData.status === 'COMPLETE' && jobData.outputPath);

      // Load MIDI file based on track type
      const url = trackType === 'original' 
        ? `/api/jobs/${jobId}/midi/original`
        : `/api/jobs/${jobId}/midi/enhanced`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${trackType} MIDI file`);
      
      const arrayBuffer = await res.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      midiDataRef.current = midi;
      setDuration(midi.duration);
      setCurrentTime(0);
      pausedAtRef.current = 0;
      
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load MIDI file');
      setIsLoading(false);
    }
  }

  function cleanup() {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    synthsRef.current.forEach(synth => synth.dispose());
    synthsRef.current = [];
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
  }

  async function play() {
    if (!midiDataRef.current) return;

    await Tone.start();
    cleanup();

    const midi = midiDataRef.current;
    const now = Tone.now();
    startTimeRef.current = now - pausedAtRef.current;

    // Create synths for each track
    midi.tracks.forEach(track => {
      const synth = new Tone.PolySynth(Tone.Synth, {
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();
      
      synth.volume.value = Tone.gainToDb(volume);
      synthsRef.current.push(synth);

      track.notes.forEach(note => {
        const noteStartTime = note.time - pausedAtRef.current;
        if (noteStartTime >= 0) {
          synth.triggerAttackRelease(
            note.name,
            note.duration,
            now + noteStartTime,
            note.velocity
          );
        }
      });
    });

    setIsPlaying(true);

    // Update current time display
    timeIntervalRef.current = setInterval(() => {
      const elapsed = Tone.now() - startTimeRef.current;
      setCurrentTime(elapsed);
      
      if (elapsed >= midi.duration) {
        stop();
      }
    }, 50);
  }

  function stop() {
    cleanup();
    setIsPlaying(false);
    pausedAtRef.current = 0;
    setCurrentTime(0);
  }

  function pause() {
    cleanup();
    setIsPlaying(false);
    pausedAtRef.current = currentTime;
  }

  function seek(time: number) {
    const wasPlaying = isPlaying;
    if (wasPlaying) pause();
    
    pausedAtRef.current = time;
    setCurrentTime(time);
    
    if (wasPlaying) {
      setTimeout(() => play(), 50);
    }
  }

  function skipForward() {
    const newTime = Math.min(currentTime + 10, duration);
    seek(newTime);
  }

  function skipBackward() {
    const newTime = Math.max(currentTime - 10, 0);
    seek(newTime);
  }

  function handleVolumeChange(newVolume: number) {
    setVolume(newVolume);
    synthsRef.current.forEach(synth => {
      synth.volume.value = Tone.gainToDb(newVolume);
    });
  }

  function switchTrack(type: TrackType) {
    const wasPlaying = isPlaying;
    if (wasPlaying) pause();
    setTrackType(type);
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="playerContainer">
      <div className="playerHeader">
        <div className="playerTitle">MIDI Player</div>
        {onClose && (
          <button onClick={onClose} className="closeBtn">×</button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div className="playerLoading">Loading MIDI file...</div>
      ) : (
        <>
          <div className="trackSelector">
            <div className="small">Track type:</div>
            <div className="inline" style={{ marginTop: 8 }}>
              <label className={`tag ${!hasOriginal ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  checked={trackType === 'original'}
                  onChange={() => switchTrack('original')}
                  disabled={!hasOriginal}
                />
                Original
              </label>
              <label className={`tag ${!hasEnhanced ? 'disabled' : ''}`}>
                <input
                  type="radio"
                  checked={trackType === 'enhanced'}
                  onChange={() => switchTrack('enhanced')}
                  disabled={!hasEnhanced}
                />
                Enhanced
              </label>
            </div>
            {!hasEnhanced && (
              <div className="small" style={{ marginTop: 4 }}>
                Enhanced track not available. Complete composition first.
              </div>
            )}
          </div>

          <div className="timeDisplay">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="progressContainer">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="progressBar"
            />
          </div>

          <div className="controls">
            <button onClick={skipBackward} title="Skip backward 10s">
              ⏮ 10s
            </button>
            <button
              onClick={isPlaying ? pause : play}
              className="primary playBtn"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={skipForward} title="Skip forward 10s">
              10s ⏭
            </button>
            <button onClick={stop}>⏹ Stop</button>
          </div>

          <div className="volumeContainer">
            <div className="small">Volume</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="volumeSlider"
            />
            <div className="small">{Math.round(volume * 100)}%</div>
          </div>
        </>
      )}

      <style jsx>{`
        .playerContainer {
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          margin-top: 16px;
        }

        .playerHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .playerTitle {
          font-weight: 700;
          font-size: 16px;
        }

        .closeBtn {
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .playerLoading {
          text-align: center;
          padding: 20px;
          color: var(--muted);
        }

        .trackSelector {
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }

        .tag.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .timeDisplay {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .progressContainer {
          margin-bottom: 16px;
        }

        .progressBar {
          width: 100%;
          height: 8px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          outline: none;
        }

        .progressBar::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--primary);
          cursor: pointer;
          border-radius: 50%;
        }

        .progressBar::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--primary);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .controls {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 16px;
        }

        .playBtn {
          min-width: 100px;
        }

        .volumeContainer {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .volumeSlider {
          flex: 1;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          outline: none;
        }

        .volumeSlider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: var(--primary);
          cursor: pointer;
          border-radius: 50%;
        }

        .volumeSlider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: var(--primary);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
}
