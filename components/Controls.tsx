import React, { useState, useRef } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ControlsProps {
  onImport: (notation: string, format?: string, key?: string) => void;
  onExtractText: (file: File) => void;
  notationText: string;
  onNotationTextChange: (text: string) => void;
  selectedFile: File | null;
  onSelectedFileChange: (file: File | null) => void;
  onPlay: () => void;
  onStop: () => void;
  onExportWav: () => void;
  onExportMidi: () => void;
  onConvertToSolfa: (key: string) => void;
  isMusicLoaded: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  isConverting: boolean;
  tempo: number;
  onTempoChange: (newTempo: number) => void;
  parts: string[];
  selectedPart: string;
  onPartChange: (newPart: string) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  onImport, onExtractText, notationText, onNotationTextChange, selectedFile, onSelectedFileChange,
  onPlay, onStop, onExportWav, onExportMidi, onConvertToSolfa,
  isMusicLoaded, isPlaying, isLoading, isConverting,
  tempo, onTempoChange,
  parts, selectedPart, onPartChange
}) => {
  const [inputFormat, setInputFormat] = useState<'separate' | 'vertical' | 'mixed'>('separate');
  const [keySignature, setKeySignature] = useState('C');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const examples = {
    separate: `Doh is Eb
S: d:r.m | m:f.s | s:l.s | f:m.r
A: s:s.s | d:d.d | d:d.d | l:s.f
T: m:f.s | s:l.s | s:s.d'| d':t.l
B: d:d.d | d:d.d | d:l.t,| d:s.s`,
    vertical: `Doh is G
// Each line represents a voice part (S, A, T, B) in order.
// Notes in the same column are played together.
s.s l.l | s.f m.r | d
m.m f.f | m.r d.t | d
d'.d'd'.d'| s.s s.s | s
d.d d.d | d.g g.g | d`,
    chords: `Doh is C
// This example mixes explicit part indicators with vertical harmony for the chorus.
// Verse 1
S: d r m | f m r
A: s, l, t,| d t, l,

// Chorus
| d m s d'| t l s - |
| s, d m s | s f m - |
| m s d' m'| r' d' t - |
| d d d d | g, a, s, - |`
  };

  const keys = ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb'];

  const loadExample = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const exampleType = event.target.value;
    if (exampleType in examples) {
      onNotationTextChange(examples[exampleType as keyof typeof examples]);
      
      if (exampleType === 'separate') setInputFormat('separate');
      else if (exampleType === 'vertical') setInputFormat('vertical');
      else if (exampleType === 'chords') setInputFormat('mixed');
    } else {
      onNotationTextChange('');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onSelectedFileChange(event.target.files[0]);
    }
  };
  
  const handleImportClick = () => {
    if (!notationText) {
        alert("Please provide notation text to import. If you uploaded a file, extract the text first.");
        return;
    }
    onImport(notationText, inputFormat, keySignature);
  };
  
  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };
  
  const clearFile = () => {
    onSelectedFileChange(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const renderPlaybackControls = () => (
    <>
      {!isPlaying ? (
        <button onClick={onPlay} disabled={!isMusicLoaded || isLoading || isConverting} className="control-button bg-teal-600 hover:bg-teal-500">
          <PlayIcon /> Play
        </button>
      ) : (
        <button onClick={onStop} className="control-button bg-yellow-600 hover:bg-yellow-500">
          <StopIcon /> Stop
        </button>
      )}
    </>
  );

  const renderExportControls = () => (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={onExportWav} disabled={!isMusicLoaded || isLoading || isPlaying || isConverting} className="control-button bg-blue-600 hover:bg-blue-500">
        <DownloadIcon /> WAV
      </button>
      <button onClick={onExportMidi} disabled={!isMusicLoaded || isLoading || isPlaying || isConverting} className="control-button bg-purple-600 hover:bg-purple-500">
        <DownloadIcon /> MIDI
      </button>
    </div>
  );
  
  const renderPartSelector = () => (
    isMusicLoaded && parts.length > 0 && (
          <div>
              <label htmlFor="part-selector" className="block text-sm font-medium text-gray-400 mb-2">
                  Playback/Export Part:
              </label>
              <select
                  id="part-selector"
                  value={selectedPart}
                  onChange={(e) => onPartChange(e.target.value)}
                  disabled={!isMusicLoaded || isLoading || isPlaying || isConverting}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none transition disabled:opacity-50"
              >
                  <option value="All">All Parts</option>
                  {parts.map(partName => (
                      <option key={partName} value={partName}>{partName}</option>
                  ))}
              </select>
          </div>
      )
  );

  const isInputDisabled = isLoading || isConverting;

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-2xl p-6 border border-gray-700 space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-xl font-semibold mb-3 text-teal-400">1. Input &amp; Convert</h2>
        <p className="text-sm text-gray-400 mb-4">
          Paste notation, upload an image, or use an example. Use the buttons below to convert between Standard Notation (a visual score) and Tonic Sol-fa text.
        </p>
        <textarea
          value={notationText}
          onChange={(e) => onNotationTextChange(e.target.value)}
          placeholder="e.g., C G Am F, guitar tabs, or 'd r m f s'..."
          className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none transition disabled:opacity-50"
          disabled={isInputDisabled}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
                <label htmlFor="keySignature" className="block text-sm font-medium mb-2 text-gray-400">Key Signature:</label>
                <select 
                    id="keySignature" 
                    value={keySignature}
                    onChange={(e) => setKeySignature(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none transition disabled:opacity-50"
                    disabled={isInputDisabled}
                >
                    {keys.map(k => <option key={k} value={k}>{k} Major</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="exampleSelector" className="block text-sm font-medium mb-2 text-gray-400">SATB Notation Examples:</label>
                <select 
                    id="exampleSelector" 
                    onChange={loadExample}
                    defaultValue=""
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none transition disabled:opacity-50"
                    disabled={isInputDisabled}
                >
                    <option value="">Select an example...</option>
                    <option value="separate">Separate Parts Example</option>
                    <option value="vertical">Vertical Harmony Example</option>
                    <option value="chords">Chordal Example</option>
                </select>
            </div>
        </div>
        
        <div className="mt-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.musicxml,.xml" disabled={isInputDisabled} />
            <button onClick={handleFileSelectClick} className="w-full control-button bg-gray-700 hover:bg-gray-600 text-sm" disabled={isInputDisabled}>
                <UploadIcon /> {selectedFile ? "Change File" : "Select Image File"}
            </button>
            {selectedFile && (
                <div className="text-xs text-center mt-2 text-gray-400 flex items-center justify-center">
                    <span>{selectedFile.name}</span>
                    <button onClick={clearFile} className="ml-2 text-red-400 hover:text-red-300" disabled={isInputDisabled}>&times;</button>
                </div>
            )}
            {selectedFile && (
              <button 
                onClick={() => onExtractText(selectedFile)} 
                disabled={isLoading} 
                className="mt-2 w-full control-button bg-cyan-600 hover:bg-cyan-500"
              >
                Extract Text from Image
              </button>
            )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
            <button onClick={handleImportClick} disabled={isInputDisabled} className="w-full control-button bg-green-700 hover:bg-green-600 text-lg font-bold">
              {isLoading ? 'Processing...' : 'Convert to Standard Notation'}
            </button>
            <button 
              onClick={() => onConvertToSolfa(keySignature)} 
              disabled={!isMusicLoaded || isLoading || isPlaying || isConverting}
              className="w-full control-button bg-indigo-600 hover:bg-indigo-500"
            >
              {isConverting ? 'Converting...' : 'Convert to Tonic Sol-fa'}
            </button>
        </div>
      </div>
      
      <div className="flex-grow">
        <h2 className="text-xl font-semibold mb-3 text-teal-400">2. Control</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="tempo-slider" className="block text-sm font-medium text-gray-400 mb-2">
                Tempo (BPM): <span className="font-bold text-gray-200">{tempo}</span>
            </label>
            <div className="flex items-center gap-4">
                <input
                    id="tempo-slider"
                    type="range"
                    min="40"
                    max="240"
                    value={tempo}
                    onChange={(e) => onTempoChange(Number(e.target.value))}
                    disabled={!isMusicLoaded || isLoading || isPlaying || isConverting}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-teal-400 [&::-moz-range-thumb]:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                    type="number"
                    min="40"
                    max="240"
                    value={tempo}
                    onChange={(e) => onTempoChange(Number(e.target.value))}
                    disabled={!isMusicLoaded || isLoading || isPlaying || isConverting}
                    className="w-20 p-1 bg-gray-900 border border-gray-600 rounded-md text-center focus:ring-2 focus:ring-teal-500 focus:outline-none transition disabled:opacity-50"
                />
            </div>
          </div>
          
          {renderPartSelector()}

          <div className="space-y-2 pt-4">
            {renderPlaybackControls()}
            {renderExportControls()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;