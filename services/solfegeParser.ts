/**
 * A utility class to parse Tonic Sol-fa (solfege) notation.
 * It detects and pre-processes solfege text, especially for SATB (Soprano, Alto, Tenor, Bass) arrangements, to improve AI parsing accuracy.
 */
export class SolfegeParser {
    // prettier-ignore
    private static keyMap: Record<string, Record<string, string>> = {
        'C':  { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', ti: 'B' },
        'G':  { do: 'G', re: 'A', mi: 'B', fa: 'C', sol: 'D', la: 'E', ti: 'F#' },
        'D':  { do: 'D', re: 'E', mi: 'F#', fa: 'G', sol: 'A', la: 'B', ti: 'C#' },
        'A':  { do: 'A', re: 'B', mi: 'C#', fa: 'D', sol: 'E', la: 'F#', ti: 'G#' },
        'E':  { do: 'E', re: 'F#', mi: 'G#', fa: 'A', sol: 'B', la: 'C#', ti: 'D#' },
        'B':  { do: 'B', re: 'C#', mi: 'D#', fa: 'E', sol: 'F#', la: 'G#', ti: 'A#' },
        'F#': { do: 'F#', re: 'G#', mi: 'A#', fa: 'B', sol: 'C#', la: 'D#', ti: 'E#' },
        'Gb': { do: 'Gb', re: 'Ab', mi: 'Bb', fa: 'Cb', sol: 'Db', la: 'Eb', ti: 'F' },
        'Db': { do: 'Db', re: 'Eb', mi: 'F', fa: 'Gb', sol: 'Ab', la: 'Bb', ti: 'C' },
        'Ab': { do: 'Ab', re: 'Bb', mi: 'C', fa: 'Db', sol: 'Eb', la: 'F', ti: 'G' },
        'Eb': { do: 'Eb', re: 'F', mi: 'G', fa: 'Ab', sol: 'Bb', la: 'C', ti: 'D' },
        'Bb': { do: 'Bb', re: 'C', mi: 'D', fa: 'Eb', sol: 'F', la: 'G', ti: 'A' },
        'F':  { do: 'F', re: 'G', mi: 'A', fa: 'Bb', sol: 'C', la: 'D', ti: 'E' }
    };
    
    // prettier-ignore
    private static syllableToNoteName: Record<string, string> = {
        'd': 'do', 'r': 're', 'm': 'mi', 'f': 'fa', 's': 'sol', 'l': 'la', 't': 'ti',
        'do': 'do', 're': 're', 'mi': 'mi', 'fa': 'fa', 'sol': 'sol', 'so': 'sol', 'la': 'la', 'ti': 'ti'
    };
    
    // prettier-ignore
    private static pitchClassToMidiOffset: Record<string, number> = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    // Intervals from 'do' in semitones for an ascending major scale
    private static solfegeIntervals: Record<string, number> = {
        'do': 0, 're': 2, 'mi': 4, 'fa': 5, 'sol': 7, 'la': 9, 'ti': 11
    };
    
    // Default octave for the tonic ('do') of each part
    private static partBaseOctaves: Record<string, number> = {
        'S': 5, // Soprano 'do' defaults to C5 range
        'A': 4, // Alto 'do' defaults to C4 range
        'T': 4, // Tenor 'do' defaults to C4 range
        'B': 3, // Bass 'do' defaults to C3 range
    };
    
    public static isSolfege(text: string): boolean {
        const lowerText = text.toLowerCase();
        const syllables = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'd', 'r', 'm', 'f', 's', 'l', 't'];
        const words = lowerText.split(/\s+/).map(w => w.replace(/[.,;!?'-]/g, ''));
        
        if (words.length < 4) return false;

        let solfegeCount = 0;
        words.forEach(word => {
            if (syllables.includes(word.replace(/[,']/g, ''))) {
                solfegeCount++;
            }
        });
        
        return (solfegeCount / words.length) > 0.4;
    }

    private static detectKey(text: string): { key: string; cleanedText: string } {
        const keyMatch = text.match(/(?:Doh is|Key:)\s*([A-G][b#]?)/i);
        if (keyMatch && keyMatch[1]) {
            const key = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1).toLowerCase();
            const cleanedText = text.replace(keyMatch[0], '').trim();
            // Ensure key exists in map
            if (this.keyMap[key as keyof typeof this.keyMap]) {
                return { key, cleanedText };
            }
        }
        return { key: 'C', cleanedText: text };
    }

    private static parseSyllable(syllable: string, part: 'S' | 'A' | 'T' | 'B', key: string): string {
        const keyNotes = this.keyMap[key] || this.keyMap['C'];
        
        let octaveShift = 0;
        let cleanSyllable = syllable;

        while (cleanSyllable.endsWith("'")) {
            octaveShift++;
            cleanSyllable = cleanSyllable.slice(0, -1);
        }
        while (cleanSyllable.endsWith(",")) {
            octaveShift--;
            cleanSyllable = cleanSyllable.slice(0, -1);
        }

        const noteFullName = this.syllableToNoteName[cleanSyllable.toLowerCase()];
        if (!noteFullName) return '';
        
        const tonicPitchClass = keyNotes['do'];
        const baseOctave = this.partBaseOctaves[part];
        
        const tonicMidiOffset = this.pitchClassToMidiOffset[tonicPitchClass];
        // The formula for MIDI number is 12 * (octave + 1) + note_index (where C4=60)
        const tonicMidiNumber = 12 * (baseOctave + 1) + tonicMidiOffset;
        
        const interval = this.solfegeIntervals[noteFullName];
        
        let noteMidiNumber = tonicMidiNumber + interval;
        
        // 'la' and 'ti' are relative to the tonic, but belong to the octave below it.
        if (['la', 'ti'].includes(noteFullName)) {
            noteMidiNumber -= 12;
        }
        
        noteMidiNumber += octaveShift * 12;

        const finalOctave = Math.floor(noteMidiNumber / 12) - 1;
        // Use the correct enharmonic spelling from the key signature
        const finalPitchClass = keyNotes[noteFullName as keyof typeof keyNotes]; 
        
        return `${finalPitchClass}${finalOctave}`;
    }

    public static preProcessForAI(solfegeText: string): string {
        const { key, cleanedText } = this.detectKey(solfegeText);
        
        const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && /[d-t]/.test(l.toLowerCase()));

        // Assume SATB if there are 4 or more lines of notation
        if (lines.length < 4) {
            const header = `This is Tonic Sol-fa notation in the key of ${key} Major. Please parse it.`;
            return `${header}\n\nOriginal Text: "${solfegeText}"`;
        }
        
        const parts: { S: string[], A: string[], T: string[], B: string[] } = { S: [], A: [], T: [], B: [] };
        const partKeys: ('S' | 'A' | 'T' | 'B')[] = ['S', 'A', 'T', 'B'];
        
        for (let i = 0; i < lines.length; i++) {
            const partIndex = i % 4;
            const partName = partKeys[partIndex];
            const line = lines[i];

            const syllables = line.split(/[|\s.:]+/).filter(s => s);
            const notes = syllables.map(s => this.parseSyllable(s, partName, key)).filter(n => n);
            parts[partName].push(notes.join(' '));
        }

        const processedSoprano = parts.S.join(' | ');
        const processedAlto = parts.A.join(' | ');
        const processedTenor = parts.T.join(' | ');
        const processedBass = parts.B.join(' | ');

        const prompt = `
This is pre-processed SATB (Soprano, Alto, Tenor, Bass) Tonic Sol-fa notation.
Key: ${key} Major.
The syllables have been converted to scientific pitch notation to assist you.
Please combine these parts into chords and infer rhythm from the original text provided below.

Pre-processed Pitches:
Soprano: ${processedSoprano}
Alto: ${processedAlto}
Tenor: ${processedTenor}
Bass: ${processedBass}

---
Original notation for rhythm reference:
\`\`\`
${solfegeText}
\`\`\`
`;
        return prompt;
    }
}
