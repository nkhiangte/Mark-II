
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ParsedMusic, SavedScore } from './types';
import { parseSheetMusic } from './services/geminiService';
import { SoundEngine } from './services/soundEngine';
import { exportToWav, exportToMidi } from './services/exportService';
import Header from './components/Header';
import Controls from './components/Controls';
import SheetMusicViewer from './components/SheetMusicViewer';
import Loader from './components/Loader';
// FIX: Use specific browser entry point for Firebase auth
import { onAuthStateChanged } from 'firebase/auth/browser';
import type { User } from 'firebase/auth/browser';
import { collection, addDoc, getDocs, query, where, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import MyScores from './components/MyScores';

const App: React.FC = () => {
  const [parsedMusic, setParsedMusic] = useState<ParsedMusic | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  const [isScoresLoading, setIsScoresLoading] = useState<boolean>(true);

  // Listen to auth changes
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, user => {
          setCurrentUser(user);
          if (!user) {
              setSavedScores([]); // Clear scores on logout
          }
      });
      return () => unsubscribe();
  }, []);

  // Fetch scores when user logs in
  useEffect(() => {
      const fetchScores = async () => {
          if (!currentUser) {
              setIsScoresLoading(false);
              return;
          };

          setIsScoresLoading(true);
          try {
              const scoresCollection = collection(db, 'scores');
              const q = query(
                  scoresCollection, 
                  where('userId', '==', currentUser.uid),
                  orderBy('savedAt', 'desc')
              );
              const querySnapshot = await getDocs(q);
              const scores = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
              })) as SavedScore[];
              setSavedScores(scores);
          } catch (error) {
              console.error("Error fetching scores:", error);
              setError("Could not load your saved scores.");
          } finally {
              setIsScoresLoading(false);
          }
      };

      fetchScores();
  }, [currentUser]);


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
    } catch (err): any {
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

  const handleSaveScore = useCallback(async () => {
    if (!parsedMusic || !currentUser) return;
    
    const scoreName = prompt("Enter a name for your score:", `Score - ${new Date().toLocaleDateString()}`);
    if (!scoreName) return; // User cancelled

    setIsLoading(true);
    setError(null);
    try {
        const scoresCollection = collection(db, 'scores');
        const newScorePayload = {
            ...parsedMusic,
            userId: currentUser.uid,
            name: scoreName,
            savedAt: serverTimestamp(),
        };
        const docRef = await addDoc(scoresCollection, newScorePayload);
        // Add to local state to avoid re-fetch, creating a client-side timestamp
        const currentTimestamp = new Timestamp(Math.floor(Date.now() / 1000), 0);
        const newScoreForState: SavedScore = { 
          id: docRef.id, 
          ...parsedMusic,
          userId: currentUser.uid,
          name: scoreName,
          savedAt: currentTimestamp
        };
        setSavedScores(prevScores => [newScoreForState, ...prevScores]);
        alert(`Score "${scoreName}" saved successfully!`);
    } catch (error) {
        console.error("Error saving score:", error);
        setError("Failed to save the score. Please try again.");
    } finally {
        setIsLoading(false);
    }
  }, [parsedMusic, currentUser]);

  const handleLoadScore = useCallback((score: SavedScore) => {
      if (isPlaying) {
          soundEngineRef.current?.stop();
          setIsPlaying(false);
      }
      setParsedMusic(score);
      setError(null);
  }, [isPlaying]);


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
            currentUser={currentUser}
            onSaveScore={handleSaveScore}
          />
           {currentUser && (
              <MyScores 
                  scores={savedScores}
                  onLoadScore={handleLoadScore}
                  isLoading={isScoresLoading}
              />
          )}
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
