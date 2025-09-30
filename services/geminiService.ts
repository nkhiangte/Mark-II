
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ParsedMusic } from '../types';
import { SolfegeParser } from './solfegeParser';

interface RequestOptions {
  signal?: AbortSignal;
}

const musicSchema = {
  type: Type.OBJECT,
  properties: {
    tempo: {
      type: Type.NUMBER,
      description: "The tempo of the music in beats per minute (BPM). Default to 120 if not specified.",
    },
    timeSignature: {
      type: Type.STRING,
      description: "The time signature, e.g., '4/4' or '3/4'.",
    },
    parts: {
      type: Type.ARRAY,
      description: "An array of musical parts. For SATB, this would be 4 parts. For solo piano, it might be 2 (right and left hand).",
      items: {
        type: Type.OBJECT,
        properties: {
          partName: {
            type: Type.STRING,
            description: "The name of the part, e.g., 'Soprano', 'Alto', 'Tenor', 'Bass', 'Piano Right Hand'.",
          },
          measures: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                notes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      pitch: {
                        type: Type.STRING,
                        description: "The pitch of the note in Scientific Pitch Notation (e.g., 'C4', 'F#5'). Use 'rest' for rests.",
                      },
                      duration: {
                        type: Type.STRING,
                        enum: ['whole', 'half', 'quarter', 'eighth', 'sixteenth'],
                        description: "The duration of the note (whole, half, quarter, eighth, sixteenth).",
                      },
                    },
                    required: ['pitch', 'duration'],
                  },
                },
              },
              required: ['notes'],
            },
          },
        },
        required: ['partName', 'measures'],
      },
    },
  },
  required: ['tempo', 'timeSignature', 'parts'],
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

const generateWithTimeout = <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string, signal?: AbortSignal): Promise<T> => {
    if (signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    let timeoutId: number;
    let abortHandler: (() => void) | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
            reject(new Error(timeoutMessage));
        }, timeoutMs);
    });

    const promisesToRace: Promise<T>[] = [promise, timeoutPromise];

    if (signal) {
        const abortPromise = new Promise<T>((_, reject) => {
            abortHandler = () => reject(new DOMException('Aborted', 'AbortError'));
            signal.addEventListener('abort', abortHandler);
        });
        promisesToRace.push(abortPromise);
    }

    return Promise.race(promisesToRace).finally(() => {
        clearTimeout(timeoutId);
        if (signal && abortHandler) {
            signal.removeEventListener('abort', abortHandler);
        }
    });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateContentWithRetry(
    generateFn: () => Promise<GenerateContentResponse>,
    timeoutMs: number,
    timeoutMessage: string,
    maxRetries = 3,
    initialDelay = 2000,
    signal?: AbortSignal
): Promise<GenerateContentResponse> {
    let attempt = 1;
    let currentDelay = initialDelay;

    while (attempt <= maxRetries) {
        signal?.throwIfAborted();
        try {
            const apiPromise = generateFn();
            return await generateWithTimeout(apiPromise, timeoutMs, timeoutMessage, signal);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error; // Re-throw cancellation to stop retries
            }
            console.warn(`API call failed on attempt ${attempt} of ${maxRetries}.`, error);

            let errorMessage = "An unknown error occurred.";
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String((error as {message: string}).message);
            } else {
                try {
                    errorMessage = JSON.stringify(error);
                } catch {
                    errorMessage = String(error);
                }
            }
            
            const lowerErrorMessage = errorMessage.toLowerCase();
            const isRetryable = lowerErrorMessage.includes("503") || 
                                lowerErrorMessage.includes("overloaded") || 
                                lowerErrorMessage.includes("try again later") ||
                                lowerErrorMessage.includes("took too long to respond");
            
            if (isRetryable && attempt < maxRetries) {
                console.log(`Retrying in ${currentDelay}ms...`);
                await delay(currentDelay);
                currentDelay *= 2; // Exponential backoff
                attempt++;
            } else {
                let finalMessage = "The AI model could not process the request. Please try again later.";
                try {
                    const jsonStartIndex = errorMessage.indexOf('{');
                    if (jsonStartIndex > -1) {
                        const jsonPart = errorMessage.substring(jsonStartIndex);
                        const parsedError = JSON.parse(jsonPart);
                        if (parsedError.error && parsedError.error.message) {
                            finalMessage = parsedError.error.message;
                        } else {
                             finalMessage = errorMessage;
                        }
                    } else {
                        finalMessage = errorMessage;
                    }
                } catch (e) {
                     finalMessage = errorMessage;
                }
                throw new Error(finalMessage);
            }
        }
    }
    throw new Error("Exhausted all retries for the AI API call.");
}

export const extractTextFromImage = async (file: File, options?: RequestOptions): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Your Google AI API Key is not configured. Please ensure the API_KEY environment variable is set for this application to function.");
  }
  
  const prompt = `
    You are an expert OCR system specializing in music. 
    Your task is to extract all textual information from the provided image.
    The image may contain standard staff notation, guitar tablature, or tonic sol-fa.
    Present the output as plain text. 
    Preserve the layout and structure of the original notation as closely as possible. 
    Do not attempt to interpret or convert the notation, just extract the text you see.
  `;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePart = await fileToGenerativePart(file);

    const response = await generateContentWithRetry(
        () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, imagePart] },
        }),
        120000,
        "The AI model took too long to respond while extracting text from the image.",
        3,
        2000,
        options?.signal
    );

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for text extraction:", error);
    if (error instanceof Error && error.name !== 'AbortError') {
        throw new Error(`Failed to extract text from image: ${error.message}`);
    } else if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
    }
    throw new Error("Failed to extract text from image. The AI model could not process the input.");
  }
};


export const parseSheetMusic = async (notationText: string, options?: RequestOptions): Promise<ParsedMusic> => {
  if (!process.env.API_KEY) {
    throw new Error("Your Google AI API Key is not configured. Please ensure the API_KEY environment variable is set for this application to function.");
  }
  
  let processedNotationText = notationText;
  // Pre-process if the input is text-only and looks like solfege
  if (notationText && SolfegeParser.isSolfege(notationText)) {
      processedNotationText = SolfegeParser.preProcessForAI(notationText);
  }

  const prompt = `
    You are an expert music theorist and programmer, with exceptional skill in interpreting text-based music notation, especially Tonic Sol-fa. Your task is to analyze the provided music notation and convert it into a structured JSON object. Your absolute top priority is to correctly interpret the rhythm—note durations, sustains, and rests—as this is where mistakes are most common.

    **Core Principles for Rhythmic Interpretation:**

    1.  **Analyze the Structure First:** Before assigning durations, scan the entire piece. Identify the time signature by counting the beats in several measures. Most simple hymns are 4/4, 3/4, or 2/4. Default to 4/4 if ambiguous, but let the notation guide you.
    2.  **The Measure is King:** The total duration of notes and rests in a measure MUST add up to the time signature. Use this constraint to resolve ambiguities.

    **Tonic Sol-fa Rhythmic Notation Guide:**

    *   **Measures (\`|\`):** The pipe character separates measures. It's a hard boundary.
    *   **Sustains (\`-\`):** A dash sustains the preceding note. In most conventions, a dash represents one full beat.
        *   Example (4/4 time): \`d:- \` is a half note (2 beats). \`d:-:-:-\` is a whole note (4 beats).
    *   **Dotted Notes (\`.\`):** A dot after a note increases its duration by 50%.
        *   Example: In a measure like \`d. r | m -\`, \`d.\` is a dotted quarter note (1.5 beats) and \`r\` is an eighth note (0.5 beats).
    *   **Beat Separation (\`:\` or \` \`):** Colons and spaces are used to group notes. Their meaning can be contextual.
        *   **Often, a colon separates full beats.** Example: \`d:r.m|f:s\` could be interpreted in 4/4 as: Beat 1=\`d\` (quarter); Beat 2=\`r.m\` (dotted-eighth + sixteenth); Beat 3=\`f\` (quarter); Beat 4=\`s\` (quarter).
        *   **Spaces often subdivide a beat.** Example: \`s l\` could be two eighth notes making up one beat.
    *   **Rests:** Rests are critical and often implied.
        *   If a measure seems too short, it likely contains rests.
        *   A blank space between beat separators (like \`d : : m\`) implies a rest.
        *   A single dot \`.\` or a \`0\` on its own can also signify a rest for one beat.
        *   **You MUST ensure measures are complete.** If a 4/4 measure only contains notation for 3 beats, you must add a quarter rest to complete it.

    **General Instructions:**

    *   For multi-part music (like SATB), create a separate entry in the 'parts' array for each voice.
    *   Convert all pitches to Scientific Pitch Notation (e.g., C4 for middle C).
    *   Use 'rest' for the pitch of any rests, and assign them a valid duration.
    *   Your final JSON output must be perfectly structured according to the schema. Double-check your work.

    Music Notation Input:
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contents = { parts: [ {text: prompt}, {text: processedNotationText} ] };

    const response = await generateContentWithRetry(
        () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: musicSchema,
            },
        }),
        240000, // 240 seconds (4 minutes)
        "The AI model took too long to respond. This might be due to an invalid API key, network issues, or high server load. Please check your API key configuration and try again.",
        3,
        2000,
        options?.signal
    );

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    // Ensure the response has a `parts` array, even if the AI failed to provide one.
    if (!parsedJson.parts || !Array.isArray(parsedJson.parts)) {
        if (parsedJson.measures) {
            // If the old `measures` format is returned, adapt it to the new structure.
            parsedJson.parts = [{ partName: 'Main', measures: parsedJson.measures }];
            delete parsedJson.measures;
        } else {
            throw new Error("AI response did not contain the expected 'parts' array.");
        }
    }
    
    const result: ParsedMusic = parsedJson;
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.name !== 'AbortError') {
        throw new Error(`Failed to parse sheet music: ${error.message}`);
    } else if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
    }
    throw new Error("Failed to parse sheet music. The AI model could not process the input.");
  }
};

export const convertToSolfa = async (music: ParsedMusic, key: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Your Google AI API Key is not configured. Please ensure the API_KEY environment variable is set for this application to function.");
  }

  const formatMusicForPrompt = (music: ParsedMusic): string => {
    return music.parts.map(part => {
        const measuresStr = part.measures.map(measure => 
            measure.notes.map(note => `${note.pitch}:${note.duration}`).join(' ')
        ).join(' | ');
        return `${part.partName}: ${measuresStr}`;
    }).join('\n');
  };

  const formattedMusic = formatMusicForPrompt(music);

  const prompt = `
    You are an expert music theorist specializing in Tonic Sol-fa notation.
    Your task is to convert the provided musical data from scientific pitch notation into standard Tonic Sol-fa notation.

    Target Key: ${key} Major.
    - 'do' should correspond to the tonic of ${key} Major.
    - Use standard abbreviated solfege syllables (d, r, m, f, s, l, t).
    - Infer the correct octave using commas (,) for lower octaves and apostrophes (') for higher octaves.
    - Represent rhythm using common Tonic Sol-fa conventions. The input format is "Pitch:Duration". Use colons, periods, dashes, and bars (|) to represent the rhythm accurately.
    - Format the output clearly, with each part on a new line, prefixed by its name (e.g., "S: ").

    Music Data:
    ${formattedMusic}

    Provide only the resulting Tonic Sol-fa text as your response. Start with "Doh is ${key}".
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await generateContentWithRetry(
      () => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      }),
      120000, // 2 minute timeout
      "The AI model took too long to respond during the conversion."
    );

    return response.text;

  } catch (error) {
    console.error("Error calling Gemini API for Sol-fa conversion:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to convert to Tonic Sol-fa: ${error.message}`);
    }
    throw new Error("Failed to convert to Tonic Sol-fa. The AI model could not process the request.");
  }
};
