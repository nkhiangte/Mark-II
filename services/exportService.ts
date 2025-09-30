
import { ParsedMusic, Note, Part } from '../types';

declare const Tone: any;

// Function to convert base64 to a Blob for download
const b64toBlob = (b64Data: string, contentType = '', sliceSize = 512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

// Function to trigger file download
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const exportToMidi = (midiBase64: string, filename: string) => {
  const blob = b64toBlob(midiBase64, 'audio/midi');
  downloadBlob(blob, `${filename}.mid`);
};

// Functions to create a WAV file from an AudioBuffer
const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([view], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

const DURATION_TO_TONE: Record<Note['duration'], string> = {
    'whole': '1n', 'half': '2n', 'quarter': '4n', 'eighth': '8n', 'sixteenth': '16n'
};

export const exportToWav = async (music: ParsedMusic, tempo: number, targetPartName?: string) => {
    if (typeof Tone === 'undefined' || typeof Tone.Offline === 'undefined') {
        alert('Audio library (Tone.js) has not loaded. Cannot export to WAV.');
        return;
    }

    const partsToRender = targetPartName && targetPartName.toLowerCase() !== 'all'
        ? music.parts.filter(p => p.partName.toLowerCase() === targetPartName.toLowerCase())
        : music.parts;
        
    if (partsToRender.length === 0) {
        alert("No parts available to export.");
        return;
    }

    let maxDuration = 0;
     // Temporarily set Tone's transport for duration calculation, then reset
    const originalBpm = Tone.Transport.bpm.value;
    Tone.Transport.bpm.value = tempo;

    partsToRender.forEach(part => {
        const notes = part.measures.flatMap(m => m.notes);
        const partDuration = notes.reduce((total, note) => total + Tone.Time(DURATION_TO_TONE[note.duration]).toSeconds(), 0);
        if (partDuration > maxDuration) {
            maxDuration = partDuration;
        }
    });

    Tone.Transport.bpm.value = originalBpm;

    try {
        const buffer = await Tone.Offline(async (transport: any) => {
            const offlineSynth = new Tone.PolySynth(Tone.Synth).toDestination();
            transport.bpm.value = tempo;

            partsToRender.forEach(partData => {
                const notes = partData.measures.flatMap(m => m.notes);
                const part = new transport.Part((time: number, value: any) => {
                    if (value.pitch !== 'rest') {
                        offlineSynth.triggerAttackRelease(value.pitch, value.duration, time);
                    }
                }, []).start(0);

                let currentTime = 0;
                notes.forEach(note => {
                    const toneDuration = DURATION_TO_TONE[note.duration];
                    part.add(currentTime, { pitch: note.pitch, duration: toneDuration });
                    currentTime += Tone.Time(toneDuration).toSeconds();
                });
            });

            transport.start();
        }, maxDuration + 0.1); // Add a small buffer for release tails

        const wavBlob = bufferToWav(buffer);
        downloadBlob(wavBlob, 'music.wav');

    } catch (e) {
        console.error("Error rendering WAV file with Tone.Offline:", e);
        alert("An error occurred while rendering the WAV file.");
    }
};
