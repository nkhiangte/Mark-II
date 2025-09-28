
import React, { useState, useCallback, useRef } from 'react';
import { ParsedMusic, Note } from './types';
import { parseSheetMusic } from './services/geminiService';
import { SoundEngine } from './services/soundEngine';
import { exportToWav, exportToMidi } from './services/exportService';
import Header from './components/Header';
import Controls from './components/Controls';
import SheetMusicViewer from './components/SheetMusicViewer';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [parsedMusic, setParsedMusic] = useState<ParsedMusic | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const soundEngineRef = useRef<SoundEngine | null>(null);

  const handleImport = useCallback(async (notation: string, file?: File) => {
    setIsLoading(true);
    setError(null);
    setParsedMusic(null);
    if (isPlaying) {
      soundEngineRef.current?.stop();
      setIsPlaying(false);
    }

    try {
      const result = await parseSheetMusic(notation, file);
      setParsedMusic(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying]);

  const handlePlay = useCallback(() => {
    if (!parsedMusic) return;

    if (!soundEngineRef.current) {
      soundEngineRef.current = new SoundEngine();
    }
    
    soundEngineRef.current.play(parsedMusic, () => setIsPlaying(false));
    setIsPlaying(true);
  }, [parsedMusic]);

  const handleStop = useCallback(() => {
    soundEngineRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const handleExportWav = useCallback(() => {
    if (!parsedMusic) return;
    exportToWav(parsedMusic);
  }, [parsedMusic]);
  
  const handleExportMidi = useCallback(() => {
    if (!parsedMusic || !parsedMusic.midiBase64) return;
    exportToMidi(parsedMusic.midiBase64, 'music');
  }, [parsedMusic]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-4 sm:p-6 lg:p-8">
      <Header />
      <main className="flex-grow flex flex-col xl:flex-row gap-8 mt-6">
        <div className="xl:w-1/3 w-full flex flex-col">
          <Controls 
            onImport={handleImport}
            onPlay={handlePlay}
            onStop={handleStop}
            onExportWav={handleExportWav}
            onExportMidi={handleExportMidi}
            isMusicLoaded={!!parsedMusic}
            isPlaying={isPlaying}
            isLoading={isLoading}
          />
        </div>
        <div className="xl:w-2/3 w-full flex-grow bg-gray-800/50 rounded-lg shadow-2xl p-6 border border-gray-700 min-h-[400px] flex items-center justify-center">
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
      </main>
    </div>
  );
};

export default App;
