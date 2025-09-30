
import { ParsedMusic } from '../types';
import { SoundEngine } from './soundEngine'; // For offline rendering logic

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

export const exportToWav = async (music: ParsedMusic, tempo: number) => {
  const totalDuration = music.measures.reduce((total, measure) => {
    return total + measure.notes.reduce((measureTotal, note) => {
      const beatDuration = 60 / tempo;
      const durations: { [key: string]: number } = { 'whole': 4, 'half': 2, 'quarter': 1, 'eighth': 0.5, 'sixteenth': 0.25 };
      return measureTotal + (durations[note.duration] || 0) * beatDuration;
    }, 0);
  }, 0);
  
  const OfflineAudioContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineAudioContext) {
    alert('Offline audio rendering is not supported in this browser.');
    return;
  }

  const offlineCtx = new OfflineAudioContext(2, 44100 * (totalDuration + 1), 44100);
  
  // A bit of a hack: re-instantiate sound engine logic for offline context
  const tempSoundEngine = new SoundEngine();
  (tempSoundEngine as any).audioContext = offlineCtx; // Override context
  
  tempSoundEngine.play(music, tempo, () => {});

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = bufferToWav(renderedBuffer);
  downloadBlob(wavBlob, 'music.wav');
};
