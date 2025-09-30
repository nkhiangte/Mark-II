
import React, { useState, useCallback, useRef } from 'react';
import { ParsedMusic } from './types';
import { parseSheetMusic } from './services/geminiService';
import { SoundEngine } from './services/soundEngine';
import { exportToWav, exportToMidi } from './services/exportService';
import { SolfegeParser } from './services/solfegeParser';
import { MIDIGenerator } from './services/midiGenerator';
import { uint8ArrayToBase64 } from './services/utils';
import Header from './components/Header';
import Controls from './components/Controls';
import SheetMusicViewer from './components/SheetMusicViewer';
import SATBDebugViewer from './components/SATBDebugViewer';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [parsedMusic, setParsedMusic] = useState<ParsedMusic | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTempo, setPlaybackTempo] = useState<number>(120);
  const [satbDebugData, setSatbDebugData] = useState<any | null>(null);
  const [selectedPart, setSelectedPart] = useState<string>('All');

  const soundEngineRef = useRef<SoundEngine | null>(null);
  const parserRef = useRef(new SolfegeParser());

  const handleImport = useCallback(async (notation: string, file?: File, format?: string, key?: string) => {
    setIsLoading(true);
    setError(null);
    setParsedMusic(null);
    setSatbDebugData(null);
    if (isPlaying) {
      soundEngineRef.current?.stop();
      setIsPlaying(false);
    }

    try {
      if (notation && !file && SolfegeParser.isSolfege(notation)) {
        const parsedData = parserRef.current.parse(notation, key);
        setSatbDebugData(parsedData);
      }

      const result = await parseSheetMusic(notation, file);
      setParsedMusic(result);
      setPlaybackTempo(result.tempo);
      setSelectedPart('All');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying]);

  const handlePlay = useCallback(async () => {
    if (!parsedMusic) return;

    if (!soundEngineRef.current) {
      soundEngineRef.current = new SoundEngine();
    }
    
    setIsPlaying(true);
    await soundEngineRef.current.play(parsedMusic, playbackTempo, () => setIsPlaying(false), selectedPart);
  }, [parsedMusic, playbackTempo, selectedPart]);

  const handleStop = useCallback(() => {
    soundEngineRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const handleExportWav = useCallback(() => {
    if (!parsedMusic) return;
    exportToWav(parsedMusic, playbackTempo, selectedPart);
  }, [parsedMusic, playbackTempo, selectedPart]);
  
  const handleExportMidi = useCallback(() => {
    if (!parsedMusic) return;
    const midiGenerator = new MIDIGenerator();
    const midiData = midiGenerator.generateMIDI(parsedMusic.parts, parsedMusic.tempo, selectedPart);
    if (midiData.length === 0) {
      alert("Could not generate MIDI. The selected part may be empty.");
      return;
    }
    const midiBase64 = uint8ArrayToBase64(midiData);
    exportToMidi(midiBase64, `music-${selectedPart}`);
  }, [parsedMusic, playbackTempo, selectedPart]);

  const handleTempoChange = useCallback((newTempo: number) => {
    setPlaybackTempo(newTempo);
  }, []);

  const handlePartChange = useCallback((newPart: string) => {
    setSelectedPart(newPart);
  }, []);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-4 sm:p-6 lg:p-8">
      <Header />
      <main className="flex-grow flex flex-col xl:flex-row gap-8 mt-6">
        <div className="xl:w-1/3 w-full flex flex-col gap-8">
          <Controls 
            onImport={handleImport}
            onPlay={handlePlay}
            onStop={handleStop}
            onExportWav={handleExportWav}
            onExportMidi={handleExportMidi}
            isMusicLoaded={!!parsedMusic}
            isPlaying={isPlaying}
            isLoading={isLoading}
            tempo={playbackTempo}
            onTempoChange={handleTempoChange}
            parts={parsedMusic?.parts?.map(p => p.partName) || []}
            selectedPart={selectedPart}
            onPartChange={handlePartChange}
          />
        </div>
        <div className="xl:w-2/3 w-full flex-grow flex flex-col">
            <div className="bg-gray-800/50 rounded-lg shadow-2xl p-6 border border-gray-700 min-h-[400px] flex items-center justify-center flex-grow">
              {isLoading && <Loader />}
              {error && <div className="text-red-400 text-center">{error}</div>}
              {!isLoading && !error && parsedMusic && <SheetMusicViewer music={parsedMusic} />}
              {!isLoading && !error && !parsedMusic && (
                <div className="text-center text-gray-500">
                  <p className="text-xl">Welcome to Mark II</p>
                  <p>Import your sheet music using the panel on the left to begin.</p>
                </div>
              )}
            </div>
            {satbDebugData && <SATBDebugViewer data={satbDebugData} />}
        </div>
      </main>
    </div>
  );
};

export default App;
