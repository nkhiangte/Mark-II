import { GoogleGenAI, Type } from "@google/genai";
import { ParsedMusic } from '../types';

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
    midiBase64: {
        type: Type.STRING,
        description: "A base64 encoded string of the MIDI file representing the parsed music."
    }
  },
  required: ['tempo', 'timeSignature', 'measures', 'midiBase64'],
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

export const parseSheetMusic = async (notationText: string, file?: File): Promise<ParsedMusic> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please configure it to use the AI features.");
  }

  const prompt = `
    You are an expert music theorist and programmer.
    Analyze the following musical notation and convert it into a structured JSON object according to the provided schema.
    The input could be text-based (like guitar tablature or tonic sol-fa) or an image of standard notation.
    - For pitch, use Scientific Pitch Notation (e.g., C4 is middle C).
    - For rests, use the pitch 'rest'.
    - Ensure the durations are correctly identified.
    - Generate a valid base64 encoded MIDI file string for the music.
    - If the input is ambiguous or invalid, make a reasonable interpretation or return an error structure.

    Music Notation Input:
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const contents = file ? 
    { parts: [ {text: prompt}, await fileToGenerativePart(file), {text: `\nTextual description (if any): ${notationText}`}] } :
    { parts: [ {text: prompt}, {text: notationText} ] };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: musicSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    return parsedJson as ParsedMusic;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to parse sheet music. The AI model could not process the input.");
  }
};
