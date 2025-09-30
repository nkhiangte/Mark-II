/**
 * A utility class to parse Tonic Sol-fa (solfege) notation.
 * It detects and pre-processes solfege text to improve AI parsing accuracy.
 */
export class SolfegeParser {
    private static keyMap: Record<string, Record<string, string>> = {
        'C': { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', ti: 'B' },
        'G': { do: 'G', re: 'A', mi: 'B', fa: 'C', sol: 'D', la: 'E', ti: 'F#' },
        'D': { do: 'D', re: 'E', mi: 'F#', fa: 'G', sol: 'A', la: 'B', ti: 'C#' },
        'F': { do: 'F', re: 'G', mi: 'A', fa: 'Bb', sol: 'C', la: 'D', ti: 'E' }
    };

    /**
     * Checks if a given text string is likely solfege notation.
     * @param text The input text.
     * @returns True if the text is likely solfege, false otherwise.
     */
    public static isSolfege(text: string): boolean {
        const lowerText = text.toLowerCase();
        // A generous set of syllables including single-letter abbreviations
        const syllables = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'd', 'r', 'm', 'f', 's', 'l', 't'];
        const words = lowerText.split(/\s+/).map(w => w.replace(/[.,;!?-]/g, ''));
        
        if (words.length === 0) return false;

        let solfegeCount = 0;
        words.forEach(word => {
            if (syllables.includes(word)) {
                solfegeCount++;
            }
        });
        
        // Heuristic: if more than 40% of words are solfege syllables, treat it as such.
        return (solfegeCount / words.length) > 0.4;
    }

    /**
     * Pre-processes solfege text into a format more easily understood by the AI.
     * Converts syllables to note names (e.g., "do re mi" -> "C4 D4 E4").
     * @param solfegeText The raw solfege text.
     * @param key The musical key to use for conversion (default: 'C').
     * @param octave The starting octave (default: 4).
     * @returns A string containing the pre-processed notation, ready for the AI.
     */
    public static preProcessForAI(solfegeText: string, key: string = 'C', octave: number = 4): string {
        const keyMapping = this.keyMap[key] || this.keyMap['C'];
        const words = solfegeText.toLowerCase().trim().split(/\s+/);
        
        const processedNotes: string[] = [];
        
        words.forEach(word => {
            const cleanWord = word.replace(/[.,;!?]/g, '');
            // Map common abbreviations to full syllables
            const syllableMap: Record<string, string> = {
                'do':'do', 'd':'do', 're':'re', 'r':'re', 'mi':'mi', 'm':'mi', 'fa':'fa', 'f':'fa', 
                'sol':'sol', 'so':'sol', 's':'sol', 'la':'la', 'l':'la', 'ti':'ti', 't':'ti'
            };

            const syllable = syllableMap[cleanWord];

            if (syllable && keyMapping[syllable]) {
                const noteName = keyMapping[syllable];
                processedNotes.push(`${noteName}${octave}`);
            }
        });

        if (processedNotes.length > 0) {
            const header = `The following is Tonic Sol-fa notation, pre-processed into note names in the key of ${key} Major. The AI should interpret rhythms, rests, and structure from the original text provided below and the parsed notes.\nOriginal Text: "${solfegeText}"\nParsed Notes: `;
            return header + processedNotes.join(' ');
        }

        return solfegeText; // Return original text if parsing fails to find notes
    }
}
