import OpenAI from 'openai';
import { Midi } from '@tonejs/midi';
import { promises as fs } from 'fs';

/**
 * AI Composer Service
 * 
 * This module handles the interaction with OpenAI to compose musical arrangements
 * that layer on top of provided MIDI sections.
 */

export interface CompositionRequest {
  midiPath: string;
  genre?: string;
  subgenre?: string;
  instruments: string[];
  sections: SectionConfig[];
}

export interface SectionConfig {
  id: string;
  name: string;
  label: string;
  startTime: string;
  endTime: string;
  mode: 'all' | 'none' | 'manual';
  instruments: string[];
}

interface MidiAnalysis {
  duration: number;
  tempo: number;
  timeSignature: string;
  keySignature: string;
  trackCount: number;
  noteRange: { lowest: number; highest: number };
}

/**
 * Analyzes a MIDI file and extracts musical information
 */
async function analyzeMidi(midiPath: string): Promise<MidiAnalysis> {
  const buffer = await fs.readFile(midiPath);
  const midi = new Midi(buffer);

  let lowestNote = 127;
  let highestNote = 0;

  midi.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      if (note.midi < lowestNote) lowestNote = note.midi;
      if (note.midi > highestNote) highestNote = note.midi;
    });
  });

  return {
    duration: midi.duration,
    tempo: midi.header.tempos[0]?.bpm || 120,
    timeSignature: `${midi.header.timeSignatures[0]?.timeSignature[0] || 4}/${midi.header.timeSignatures[0]?.timeSignature[1] || 4}`,
    keySignature: midi.header.keySignatures[0]?.key || 'C',
    trackCount: midi.tracks.length,
    noteRange: { lowest: lowestNote, highest: highestNote }
  };
}

/**
 * Parses time string (e.g., "1:30" or "90") into seconds
 */
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  
  const colonIndex = timeStr.indexOf(':');
  if (colonIndex >= 0) {
    const parts = timeStr.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  
  return parseFloat(timeStr) || 0;
}

/**
 * Extracts MIDI sections based on time ranges
 */
async function extractMidiSections(
  midiPath: string,
  sections: SectionConfig[]
): Promise<Array<{ section: SectionConfig; midi: Midi; startTime: number; endTime: number }>> {
  const buffer = await fs.readFile(midiPath);
  const originalMidi = new Midi(buffer);
  const duration = originalMidi.duration;

  const result: Array<{ section: SectionConfig; midi: Midi; startTime: number; endTime: number }> = [];

  for (const section of sections) {
    const startTime = parseTimeToSeconds(section.startTime);
    const endTime = section.endTime ? parseTimeToSeconds(section.endTime) : duration;

    // Create a new MIDI object for this section
    const sectionMidi = new Midi();
    sectionMidi.header.setTempo(originalMidi.header.tempos[0]?.bpm || 120);
    
    if (originalMidi.header.timeSignatures.length > 0) {
      const ts = originalMidi.header.timeSignatures[0];
      sectionMidi.header.timeSignatures.push({
        ticks: 0,
        timeSignature: ts.timeSignature,
        measures: ts.measures
      });
    }

    // Copy notes that fall within the time range
    originalMidi.tracks.forEach((track) => {
      const newTrack = sectionMidi.addTrack();
      newTrack.instrument = track.instrument;
      newTrack.name = track.name;
      
      track.notes.forEach((note) => {
        if (note.time >= startTime && note.time < endTime) {
          newTrack.addNote({
            midi: note.midi,
            time: note.time - startTime, // Offset to start at 0
            duration: note.duration,
            velocity: note.velocity
          });
        }
      });
    });

    result.push({
      section,
      midi: sectionMidi,
      startTime,
      endTime
    });
  }

  return result;
}

/**
 * Converts MIDI data to a textual representation for the AI
 */
function midiToTextRepresentation(midi: Midi, maxNotes: number = 100): string {
  let representation = `Duration: ${midi.duration.toFixed(2)}s\n`;
  representation += `Tracks: ${midi.tracks.length}\n\n`;

  midi.tracks.forEach((track, idx) => {
    if (track.notes.length === 0) return;
    
    representation += `Track ${idx + 1} (${track.name || 'Unnamed'}):\n`;
    representation += `  Instrument: ${track.instrument?.name || 'Unknown'}\n`;
    representation += `  Notes: ${track.notes.length}\n`;
    
    // Include a sample of notes
    const notesToShow = Math.min(track.notes.length, maxNotes);
    representation += `  Sample (first ${notesToShow} notes):\n`;
    
    for (let i = 0; i < notesToShow; i++) {
      const note = track.notes[i];
      representation += `    ${note.name} @ ${note.time.toFixed(2)}s, duration: ${note.duration.toFixed(2)}s, velocity: ${note.velocity.toFixed(2)}\n`;
    }
    
    representation += '\n';
  });

  return representation;
}

/**
 * Builds the system prompt for the AI composer
 */
function buildSystemPrompt(): string {
  return `You are an AI music producer and composer with expert knowledge of music theory, composition, and arrangement.

Your role:
- Compose musical arrangements that layer on top of provided MIDI sections
- Follow common patterns and principles of the specified music genre
- Make decisions that a human composer would make to create pleasing music
- Produce harmonies, rhythms, and accompaniment that avoid dissonance
- Create arrangements that complement the existing musical material

Guidelines:
- Consider the key, tempo, and time signature of the existing music
- Ensure new parts harmonize well with existing melodies
- Use appropriate rhythmic patterns for the genre
- Balance the arrangement so new parts support rather than overpower the original
- Apply standard music production techniques (e.g., call-and-response, countermelody, rhythmic variation)
- Consider the role of each instrument in the overall arrangement

Your output should be musical notation data that can be converted to MIDI format.`;
}

/**
 * Builds the user prompt for a specific composition request
 */
function buildUserPrompt(
  analysis: MidiAnalysis,
  midiRepresentation: string,
  genre: string | undefined,
  subgenre: string | undefined,
  instruments: string[],
  sectionName: string
): string {
  let prompt = `Please compose musical arrangements for the following MIDI section.\n\n`;

  if (genre || subgenre) {
    prompt += `Genre: ${[genre, subgenre].filter(Boolean).join(' - ')}\n`;
  }

  prompt += `Section: ${sectionName}\n\n`;

  prompt += `Musical Analysis:\n`;
  prompt += `- Duration: ${analysis.duration.toFixed(2)} seconds\n`;
  prompt += `- Tempo: ${analysis.tempo} BPM\n`;
  prompt += `- Time Signature: ${analysis.timeSignature}\n`;
  prompt += `- Key: ${analysis.keySignature}\n`;
  prompt += `- Existing Tracks: ${analysis.trackCount}\n`;
  prompt += `- Note Range: ${analysis.noteRange.lowest} to ${analysis.noteRange.highest}\n\n`;

  prompt += `Requested Instruments to Add:\n`;
  instruments.forEach((inst) => {
    prompt += `- ${inst}\n`;
  });
  prompt += `\n`;

  prompt += `Existing MIDI Content:\n`;
  prompt += midiRepresentation;
  prompt += `\n`;

  prompt += `Please provide composition suggestions for each requested instrument. `;
  prompt += `For each instrument, describe:\n`;
  prompt += `1. The melodic/harmonic content (specific notes and rhythms)\n`;
  prompt += `2. How it complements the existing material\n`;
  prompt += `3. Any production techniques or articulations to apply\n\n`;
  
  prompt += `Format your response as structured data with note information (pitch, timing, duration, velocity) `;
  prompt += `that can be programmatically converted to MIDI. Use this JSON structure:\n\n`;
  prompt += `{\n`;
  prompt += `  "instruments": [\n`;
  prompt += `    {\n`;
  prompt += `      "name": "instrument name",\n`;
  prompt += `      "notes": [\n`;
  prompt += `        { "midi": 60, "time": 0.0, "duration": 0.5, "velocity": 0.8 },\n`;
  prompt += `        ...\n`;
  prompt += `      ]\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n\n`;
  prompt += `Where 'midi' is the MIDI note number (0-127), 'time' is in seconds, 'duration' is in seconds, and 'velocity' is 0.0-1.0.`;

  return prompt;
}

/**
 * Calls OpenAI API to get composition suggestions
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  });

  return response.choices[0]?.message?.content || '{}';
}

/**
 * Parses AI response and converts to MIDI tracks
 */
function parseAIResponseToMidi(responseText: string, baseMidi: Midi): Midi {
  try {
    const response = JSON.parse(responseText);
    
    if (response.instruments && Array.isArray(response.instruments)) {
      response.instruments.forEach((inst: any) => {
        if (inst.notes && Array.isArray(inst.notes)) {
          const track = baseMidi.addTrack();
          track.name = inst.name || 'AI Generated';
          
          inst.notes.forEach((note: any) => {
            if (typeof note.midi === 'number' && typeof note.time === 'number') {
              track.addNote({
                midi: note.midi,
                time: note.time,
                duration: note.duration || 0.5,
                velocity: note.velocity || 0.8
              });
            }
          });
        }
      });
    }
  } catch (err) {
    console.error('Failed to parse AI response:', err);
  }

  return baseMidi;
}

/**
 * Main composition function
 */
export async function composeWithAI(
  request: CompositionRequest,
  outputPath: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  // Analyze the original MIDI
  const analysis = await analyzeMidi(request.midiPath);

  // Load the original MIDI as the base
  const originalBuffer = await fs.readFile(request.midiPath);
  const outputMidi = new Midi(originalBuffer);

  // If sections are defined and have time ranges, process them individually
  const sectionsWithTimes = request.sections.filter(
    (s) => s.startTime || s.endTime
  );

  if (sectionsWithTimes.length > 0) {
    // Process each section with specified instruments
    const sectionMidis = await extractMidiSections(request.midiPath, sectionsWithTimes);

    for (const { section, midi, startTime } of sectionMidis) {
      // Skip sections with no instruments
      if (section.mode === 'none' || section.instruments.length === 0) {
        continue;
      }

      const instrumentsForSection = section.mode === 'all' 
        ? request.instruments 
        : section.instruments;

      if (instrumentsForSection.length === 0) continue;

      const midiText = midiToTextRepresentation(midi);
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(
        analysis,
        midiText,
        request.genre,
        request.subgenre,
        instrumentsForSection,
        section.label
      );

      const aiResponse = await callOpenAI(systemPrompt, userPrompt, apiKey);
      
      // Parse the AI response and add tracks to the output MIDI
      // We need to offset the timing by the section's start time
      const sectionResult = parseAIResponseToMidi(aiResponse, new Midi());
      
      sectionResult.tracks.forEach((track) => {
        const newTrack = outputMidi.addTrack();
        newTrack.name = track.name;
        newTrack.instrument = track.instrument;
        
        track.notes.forEach((note) => {
          newTrack.addNote({
            midi: note.midi,
            time: note.time + startTime, // Offset by section start
            duration: note.duration,
            velocity: note.velocity
          });
        });
      });
    }
  } else {
    // No specific sections, process the entire piece
    const midiText = midiToTextRepresentation(outputMidi);
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      analysis,
      midiText,
      request.genre,
      request.subgenre,
      request.instruments,
      'Full Composition'
    );

    const aiResponse = await callOpenAI(systemPrompt, userPrompt, apiKey);
    parseAIResponseToMidi(aiResponse, outputMidi);
  }

  // Write the output MIDI file
  await fs.writeFile(outputPath, Buffer.from(outputMidi.toArray()));
}
