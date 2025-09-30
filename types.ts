
export interface Note {
  pitch: string; // e.g., "C4", "G#5", "rest"
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
}

export interface Measure {
  notes: Note[];
}

export interface ParsedMusic {
  tempo: number;
  timeSignature: string;
  measures: Measure[];
  midiBase64: string;
}

// FIX: Add missing SavedScore interface required by MyScores.tsx.
export interface SavedScore extends ParsedMusic {
  id: string;
  name: string;
  savedAt: {
    seconds: number;
  };
}
