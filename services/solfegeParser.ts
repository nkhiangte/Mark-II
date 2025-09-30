/**
 * A utility class to parse Tonic Sol-fa (solfege) notation, specifically for SATB arrangements.
 * This class translates solfege text into a structured format with precise MIDI note information,
 * which can then be used for further processing or display.
 * This implementation is based on the advanced SATBSolfegeParser logic.
 */
export class SolfegeParser {
    private keyMaps: Record<string, Record<string, string>>;
    private vocalRanges: Record<string, { min: number; max: number; defaultOctave: number }>;
    private solfegeVariations: Record<string, string>;

    constructor() {
        // prettier-ignore
        this.keyMaps = {
            'C':  { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', ti: 'B' },
            'G':  { do: 'G', re: 'A', mi: 'B', fa: 'C', sol: 'D', la: 'E', ti: 'F#' },
            'D':  { do: 'D', re: 'E', mi: 'F#', fa: 'G', sol: 'A', la: 'B', ti: 'C#' },
            'A':  { do: 'A', re: 'B', mi: 'C#', fa: 'D', sol: 'E', la: 'F#', ti: 'G#' },
            'F':  { do: 'F', re: 'G', mi: 'A', fa: 'Bb', sol: 'C', la: 'D', ti: 'E' },
            'Bb': { do: 'Bb', re: 'C', mi: 'D', fa: 'Eb', sol: 'F', la: 'G', ti: 'A' },
            'Eb': { do: 'Eb', re: 'F', mi: 'G', fa: 'Ab', sol: 'Bb', la: 'C', ti: 'D' }
        };

        this.vocalRanges = {
            'soprano': { min: 60, max: 81, defaultOctave: 5 }, // C4 - A5
            'alto':    { min: 55, max: 76, defaultOctave: 4 }, // G3 - E5
            'tenor':   { min: 48, max: 69, defaultOctave: 4 }, // C3 - A4
            'bass':    { min: 36, max: 60, defaultOctave: 3 }  // C2 - C4
        };

        this.solfegeVariations = {
            'd': 'do', 'r': 're', 'm': 'mi', 'f': 'fa', 's': 'sol', 'l': 'la', 't': 'ti',
            'do': 'do', 're': 're', 'mi': 'mi', 'fa': 'fa', 'sol': 'sol', 'so': 'sol', 'la': 'la', 'ti': 'ti', 'si': 'ti'
        };
    }
    
    public static isSolfege(text: string): boolean {
        const lowerText = text.toLowerCase();
        const syllables = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'd', 'r', 'm', 'f', 's', 'l', 't'];
        const words = lowerText.split(/\s+/).map(w => w.replace(/[.,;!?'-]/g, ''));
        
        if (words.length < 3) return false;

        let solfegeCount = 0;
        words.forEach(word => {
            if (syllables.includes(word.replace(/[,']/g, ''))) {
                solfegeCount++;
            }
        });
        
        return (solfegeCount / words.length) > 0.4;
    }

    private detectKey(text: string): { key: string; cleanedText: string } {
        const keyMatch = text.match(/(?:Doh is|Key:)\s*([A-G][b#]?)/i);
        if (keyMatch && keyMatch[1]) {
            const key = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1).toLowerCase().replace('s', '#');
            const cleanedText = text.replace(keyMatch[0], '').trim();
            if (this.keyMaps[key as keyof typeof this.keyMaps]) {
                return { key, cleanedText };
            }
        }
        return { key: 'C', cleanedText: text };
    }


    parse(solfegeText: string, key = 'C') {
        const { key: detectedKey, cleanedText } = this.detectKey(solfegeText);
        const effectiveKey = key || detectedKey;
        
        const lines = cleanedText.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
        
        const parts: any = { soprano: [], alto: [], tenor: [], bass: [] };
        let currentPart: string | null = null;
        const partOrder = ['soprano', 'alto', 'tenor', 'bass'];
        let partIndex = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();
            const partMatch = this.detectPartIndicator(trimmedLine);
            
            let musicLine = trimmedLine;
            if (partMatch) {
                currentPart = partMatch;
                musicLine = trimmedLine.replace(/^(soprano|sop|s|alto|alt|a|tenor|ten|t|bass|bas|b)[\.\s]*:?/i, '').trim();
            } else {
                currentPart = partOrder[partIndex % 4];
                partIndex++;
            }
            
            if (currentPart) {
                const measures = this.parseMeasures(musicLine, effectiveKey, currentPart);
                parts[currentPart].push(...measures);
            }
        }

        const measureCount = Math.max(...Object.values(parts).map((p: any) => p.length));
        return this.alignMeasures(parts, measureCount);
    }

    private detectPartIndicator(line: string) {
        // FIX: The values in `partPatterns` are regular expressions, so the type should be `Record<string, RegExp>`.
        const partPatterns: Record<string, RegExp> = {
            'soprano': /^(soprano|sop|s\.?)\s*[:=-]/i,
            'alto': /^(alto|alt|a\.?)\s*[:=-]/i,
            'tenor': /^(tenor|ten|t\.?)\s*[:=-]/i,
            'bass': /^(bass|bas|b\.?)\s*[:=-]/i
        };

        for (const [part, pattern] of Object.entries(partPatterns)) {
            if (pattern.test(line.toLowerCase())) {
                return part;
            }
        }
        return null;
    }

    private parseMeasures(line: string, key: string, part: string) {
        const measureStrings = line.split('|').filter(m => m.trim());
        const measures = [];

        for (const measureStr of measureStrings) {
            const notes = this.parseMeasure(measureStr.trim(), key, part);
            if (notes.length > 0) {
                measures.push(notes);
            }
        }
        return measures;
    }

    private parseMeasure(measureStr: string, key: string, part: string) {
        const tokens = measureStr.split(/[\s.:]+/).filter(token => token.trim());
        const notes = [];
        const keyMapping = this.keyMaps[key] || this.keyMaps['C'];

        for (const token of tokens) {
            const noteData = this.parseNoteToken(token, keyMapping, part);
            if (noteData) {
                notes.push(noteData);
            }
        }
        return notes;
    }

    private parseNoteToken(token: string, keyMapping: Record<string, string>, part: string) {
        if (!token) return null;
        let cleanToken = token.toLowerCase();
        let octaveShift = 0;

        while (cleanToken.endsWith("'") || cleanToken.endsWith("’")) {
            octaveShift++;
            cleanToken = cleanToken.slice(0, -1);
        }
        while (cleanToken.endsWith(",") || cleanToken.endsWith("_")) {
            octaveShift--;
            cleanToken = cleanToken.slice(0, -1);
        }
        
        const normalizedSolfege = this.solfegeVariations[cleanToken];
        if (!keyMapping[normalizedSolfege]) {
            return null;
        }

        const noteName = keyMapping[normalizedSolfege];
        const midiNote = this.solfegeToMidiNote(normalizedSolfege, keyMapping, part, octaveShift);

        return {
            solfege: normalizedSolfege,
            noteName: noteName,
            midiNumber: midiNote,
            part: part,
            octave: Math.floor(midiNote / 12) - 1
        };
    }

    private solfegeToMidiNote(solfege: string, keyMapping: Record<string, string>, part: string, octaveShift: number) {
        const noteName = keyMapping[solfege];
        const range = this.vocalRanges[part] || this.vocalRanges.soprano;
        const baseMidi = this.findOptimalMidi(noteName, range);
        return baseMidi + (octaveShift * 12);
    }
    
    private findOptimalMidi(noteName: string, range: { min: number; max: number; defaultOctave: number }): number {
        const pitchClassToMidiOffset: Record<string, number> = { 'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11 };
        const noteIndex = pitchClassToMidiOffset[noteName];

        for (let octave = 2; octave <= 6; octave++) {
            const midiNote = 12 * (octave + 1) + noteIndex;
            if (midiNote >= range.min && midiNote <= range.max) {
                return midiNote;
            }
        }
        
        return 12 * (range.defaultOctave + 1) + noteIndex;
    }

    private alignMeasures(parts: any, measureCount: number) {
        const alignedParts: any = { soprano: [], alto: [], tenor: [], bass: [] };

        for (const [partName, measures] of Object.entries(parts)) {
            for (let i = 0; i < measureCount; i++) {
                if (i < (measures as any[]).length) {
                    alignedParts[partName].push((measures as any[])[i]);
                } else {
                    alignedParts[partName].push([{ solfege: 'rest', noteName: 'R', midiNumber: null, part: partName, isRest: true }]);
                }
            }
        }
        return alignedParts;
    }
    
    public static preProcessForAI(solfegeText: string): string {
        // This method can be simplified now that the main app doesn't rely on it for SATB parsing,
        // but it's kept for potential direct use by the AI service.
        const parser = new SolfegeParser();
        const { key } = parser.detectKey(solfegeText);
        const parsedData = parser.parse(solfegeText, key);

        const hasContent = Object.values(parsedData).some((p: any) => p.length > 0 && p[0][0]?.isRest !== true);
        if(!hasContent) {
             return `This appears to be Tonic Sol-fa notation in the key of ${key} Major. Please parse it. Original Text: "${solfegeText}"`;
        }
        
        const formatPart = (part: any[]) => part.map(measure => measure.map(note => `${note.noteName}${note.octave}`).join(' ')).join(' | ');

        const processedSoprano = formatPart(parsedData.soprano);
        const processedAlto = formatPart(parsedData.alto);
        const processedTenor = formatPart(parsedData.tenor);
        const processedBass = formatPart(parsedData.bass);

        const prompt = `
This is pre-processed SATB (Soprano, Alto, Tenor, Bass) Tonic Sol-fa notation.
Key: ${key} Major.
The solfege syllables have been converted into specific scientific pitch notations based on standard vocal ranges for each part. Your main task is to determine the RHYTHM and DURATION of these notes by analyzing the formatting of the original notation provided below. The pitches are already calculated for you.

Pre-processed Pitches:
Soprano: ${processedSoprano || 'N/A'}
Alto: ${processedAlto || 'N/A'}
Tenor: ${processedTenor || 'N/A'}
Bass: ${processedBass || 'N/A'}

---
Analyze the following original notation to determine the durations (whole, half, quarter, etc.) for the pitches listed above. Pay attention to colons, periods, bars, and spacing.
\`\`\`
${solfegeText}
\`\`\`
`;
        return prompt;
    }
}