
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ParsedMusic } from '../types';
import { SolfegeParser } from './solfegeParser';
import { MIDIGenerator } from './midiGenerator';

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
  required: ['tempo', 'timeSignature', 'measures'],
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

const generateWithTimeout = <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: number;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
            reject(new Error(timeoutMessage));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export const parseSheetMusic = async (notationText: string, file?: File): Promise<ParsedMusic> => {
  if (!process.env.API_KEY) {
    throw new Error("Your Google AI API Key is not configured. Please ensure the API_KEY environment variable is set for this application to function.");
  }
  
  let processedNotationText = notationText;
  // Pre-process if the input is text-only and looks like solfege
  if (notationText && !file && SolfegeParser.isSolfege(notationText)) {
      processedNotationText = SolfegeParser.preProcessForAI(notationText);
  }

  const prompt = `
    You are an expert music theorist and programmer with OCR capabilities.
    Your task is to analyze the provided musical notation and convert it into a structured JSON object according to the provided schema.

    The input can be:
    1. Text-based notation (like guitar tablature, chord names, or tonic sol-fa). If it is pre-processed sol-fa, that information will be provided.
    2. An image file. If an image is provided, perform OCR to extract the musical content. The image could contain standard staff notation, guitar tablature, or tonic sol-fa text.

    Key Instructions:
    - Convert all pitches to Scientific Pitch Notation (e.g., C4 is middle C). Assume a key of C Major if not specified, so 'do' or 'd' would be 'C4'.
    - Use 'rest' for the pitch of any rests.
    - Correctly identify note durations (whole, half, quarter, eighth, sixteenth).
    - If the input is ambiguous or invalid, make a reasonable interpretation. For example, if no durations are given for tonic sol-fa, assume they are all quarter notes.
    - Do NOT generate a MIDI file. Only provide the JSON structure for the notes.

    Music Notation Input:
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contents = file ? 
    { parts: [ {text: prompt}, await fileToGenerativePart(file), {text: `\nTextual description (if any): ${notationText}`}] } :
    { parts: [ {text: prompt}, {text: processedNotationText} ] };

    const apiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: musicSchema,
      },
    });

    const response: GenerateContentResponse = await generateWithTimeout(
        apiCall,
        120000, // 120 seconds
        "The AI model took too long to respond. This might be due to an invalid API key, network issues, or high server load. Please check your API key configuration and try again."
    );

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    
    // Generate MIDI from the parsed JSON structure
    const midiGenerator = new MIDIGenerator();
    const midiData = midiGenerator.generateMIDI(parsedJson.measures, parsedJson.tempo);
    const midiBase64 = uint8ArrayToBase64(midiData);

    const result: ParsedMusic = {
        ...parsedJson,
        midiBase64: midiBase64,
    };

    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to parse sheet music: ${error.message}`);
    }
    throw new Error("Failed to parse sheet music. The AI model could not process the input.");
  }
};