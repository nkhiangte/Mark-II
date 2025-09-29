
import { Timestamp } from 'firebase/firestore';

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

export interface SavedScore extends ParsedMusic {
    id: string;
    userId: string;
    savedAt: Timestamp;
    name: string;
}
