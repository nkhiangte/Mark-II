import { Note, Measure, Part } from '../types';

// prettier-ignore
const PITCH_TO_MIDI: { [key: string]: number } = {
    'C0': 12, 'C#0': 13, 'Db0': 13, 'D0': 14, 'D#0': 15, 'Eb0': 15, 'E0': 16, 'F0': 17, 'F#0': 18, 'Gb0': 18, 'G0': 19, 'G#0': 20, 'Ab0': 20, 'A0': 21, 'A#0': 22, 'Bb0': 22, 'B0': 23,
    'C1': 24, 'C#1': 25, 'Db1': 25, 'D1': 26, 'D#1': 27, 'Eb1': 27, 'E1': 28, 'F1': 29, 'F#1': 30, 'Gb1': 30, 'G1': 31, 'G#1': 32, 'Ab1': 32, 'A1': 33, 'A#1': 34, 'Bb1': 34, 'B1': 35,
    'C2': 36, 'C#2': 37, 'Db2': 37, 'D2': 38, 'D#2': 39, 'Eb2': 39, 'E2': 40, 'F2': 41, 'F#2': 42, 'Gb2': 42, 'G2': 43, 'G#2': 44, 'Ab2': 44, 'A2': 45, 'A#2': 46, 'Bb2': 46, 'B2': 47,
    'C3': 48, 'C#3': 49, 'Db3': 49, 'D3': 50, 'D#3': 51, 'Eb3': 51, 'E3': 52, 'F3': 53, 'F#3': 54, 'Gb3': 54, 'G3': 55, 'G#3': 56, 'Ab3': 56, 'A3': 57, 'A#3': 58, 'Bb3': 58, 'B3': 59,
    'C4': 60, 'C#4': 61, 'Db4': 61, 'D4': 62, 'D#4': 63, 'Eb4': 63, 'E4': 64, 'F4': 65, 'F#4': 66, 'Gb4': 66, 'G4': 67, 'G#4': 68, 'Ab4': 68, 'A4': 69, 'A#4': 70, 'Bb4': 70, 'B4': 71,
    'C5': 72, 'C#5': 73, 'Db5': 73, 'D5': 74, 'D#5': 75, 'Eb5': 75, 'E5': 76, 'F5': 77, 'F#5': 78, 'Gb5': 78, 'G5': 79, 'G#5': 80, 'Ab5': 80, 'A5': 81, 'A#5': 82, 'Bb5': 82, 'B5': 83,
    'C6': 84, 'C#6': 85, 'Db6': 85, 'D6': 86, 'D#6': 87, 'Eb6': 87, 'E6': 88, 'F6': 89, 'F#6': 90, 'Gb6': 90, 'G6': 91, 'G#6': 92, 'Ab6': 92, 'A6': 93, 'A#6': 94, 'Bb6': 94, 'B6': 95,
    'C7': 96, 'C#7': 97, 'Db7': 97, 'D7': 98, 'D#7': 99, 'Eb7': 99, 'E7': 100, 'F7': 101, 'F#7': 102, 'Gb7': 102, 'G7': 103, 'G#7': 104, 'Ab7': 104, 'A7': 105, 'A#7': 106, 'Bb7': 106, 'B7': 107,
    'C8': 108, 'C#8': 109, 'Db8': 109, 'D8': 110, 'D#8': 111, 'Eb8': 111, 'E8': 112, 'F8': 113, 'F#8': 114, 'Gb8': 114, 'G8': 115, 'G#8': 116, 'Ab8': 116, 'A8': 117, 'A#8': 118, 'Bb8': 118, 'B8': 119
};

const pitchToMidiNumber = (pitch: string): number | null => {
    return PITCH_TO_MIDI[pitch] || null;
};

export class MIDIGenerator {
    generateMIDI(parts: Part[], tempo: number = 120, targetPartName?: string): Uint8Array {
        const partsToProcess = targetPartName && targetPartName.toLowerCase() !== 'all'
            ? parts.filter(p => p.partName.toLowerCase() === targetPartName.toLowerCase())
            : parts;
            
        if (partsToProcess.length === 0) {
            console.warn("No parts to process for MIDI generation.");
            return new Uint8Array();
        }

        const header = this.createMidiHeader(partsToProcess.length);
        
        const trackChunks = partsToProcess.map((part, index) => {
            // Tempo event should only be in the first track of a Format 1 MIDI file.
            const includeTempo = index === 0;
            return this.createTrackChunk(part.measures, includeTempo ? tempo : undefined);
        });
        
        const allTrackBytes = trackChunks.flat();

        return new Uint8Array([...header, ...allTrackBytes]);
    }

    private createMidiHeader(numTracks: number): Uint8Array {
        return new Uint8Array([
            0x4D, 0x54, 0x68, 0x64, // "MThd"
            0x00, 0x00, 0x00, 0x06, // Header length
            0x00, 0x01,             // Format 1 (multi-track)
            (numTracks >> 8) & 0xFF, numTracks & 0xFF, // Number of tracks
            0x00, 0x60              // 96 ticks per quarter note
        ]);
    }

    private createTrackChunk(measures: Measure[], tempo?: number): number[] {
        const notes = measures.flatMap(m => m.notes);
        const eventData: number[] = [];
        
        if (tempo) {
            const microsecondsPerBeat = Math.floor(60000000 / tempo);
            eventData.push(...this.writeVariableLength(0)); // delta time
            eventData.push(0xFF, 0x51, 0x03); // set tempo
            eventData.push(...this.writeTempo(microsecondsPerBeat));
        }
        
        let accumulatedDeltaTicks = 0;
        
        notes.forEach(note => {
            const durationTicks = this.durationToTicks(note.duration);
            
            if (note.pitch === 'rest') {
                accumulatedDeltaTicks += durationTicks;
                return;
            }
            
            const midiNumber = pitchToMidiNumber(note.pitch);
            if (midiNumber === null) {
                console.warn(`Could not find MIDI number for pitch: ${note.pitch}, treating as rest.`);
                accumulatedDeltaTicks += durationTicks;
                return;
            }
            
            // Note On event
            eventData.push(...this.writeVariableLength(accumulatedDeltaTicks));
            eventData.push(0x90, midiNumber, 0x64); // Channel 1, Note On, velocity 100
            accumulatedDeltaTicks = 0; // Reset delta time for simultaneous notes if any (not handled here)

            // Note Off event
            eventData.push(...this.writeVariableLength(durationTicks));
            eventData.push(0x80, midiNumber, 0x00); // Channel 1, Note Off, velocity 0
        });
        
        // End of track meta-event
        eventData.push(...this.writeVariableLength(0));
        eventData.push(0xFF, 0x2F, 0x00);
        
        const trackHeader: number[] = [
            0x4D, 0x54, 0x72, 0x6B, // "MTrk"
            ...this.write32Bit(eventData.length)
        ];
        
        return [...trackHeader, ...eventData];
    }

    private durationToTicks(duration: Note['duration']): number {
        const ticksPerQuarter = 96;
        switch(duration) {
            case 'whole': return ticksPerQuarter * 4;
            case 'half': return ticksPerQuarter * 2;
            case 'quarter': return ticksPerQuarter;
            case 'eighth': return ticksPerQuarter / 2;
            case 'sixteenth': return ticksPerQuarter / 4;
            default: return ticksPerQuarter;
        }
    }

    private writeVariableLength(value: number): number[] {
        let buffer = [];
        let v = value;

        if (v === 0) return [0];

        while (v > 0) {
            let byte = v & 0x7F;
            v >>= 7;
            if (buffer.length > 0) {
                byte |= 0x80;
            }
            buffer.push(byte);
        }

        return buffer.reverse();
    }

    private writeTempo(microsecondsPerBeat: number): number[] {
        return [
            (microsecondsPerBeat >> 16) & 0xFF,
            (microsecondsPerBeat >> 8) & 0xFF,
            microsecondsPerBeat & 0xFF
        ];
    }

    private write32Bit(value: number): number[] {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }
}
