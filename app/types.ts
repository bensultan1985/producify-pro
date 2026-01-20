export type Instrument = {
  id: string;
  label: string;
};

export type SectionName =
  | 'Intro'
  | 'Verse'
  | 'Chorus'
  | 'Bridge'
  | 'Outro'
  | 'Other';

export type InstrumentSelectionMode = 'all' | 'none' | 'manual';

export type SectionConfig = {
  id: string;
  name: SectionName;
  customName?: string;
  startTime?: string; // free-form, e.g. "0:15" or "15" seconds
  endTime?: string;
  mode: InstrumentSelectionMode;
  instruments: string[]; // instrument ids, used when mode=manual
};
