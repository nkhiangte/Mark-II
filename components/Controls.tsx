
import React, { useState, useRef } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import { auth, googleProvider } from '../firebase';
// FIX: Use specific browser entry point for Firebase auth
import { signInWithPopup, signOut } from 'firebase/auth/browser';
import type { User } from 'firebase/auth/browser';
import { SaveIcon } from './icons/SaveIcon';
import { LoginIcon } from './icons/LoginIcon';
import { LogoutIcon } from './icons/LogoutIcon';

interface ControlsProps {
  onImport: (notation: string, file?: File) => void;
  onPlay: () => void;
  onStop: () => void;
  onExportWav: () => void;
  onExportMidi: () => void;
  isMusicLoaded: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentUser: User | null;
  onSaveScore: () => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  onImport, onPlay, onStop, onExportWav, onExportMidi, 
  isMusicLoaded, isPlaying, isLoading,
  currentUser, onSaveScore
}) => {
  const [notationText, setNotationText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };
  
  const handleImportClick = () => {
    if (!notationText && !selectedFile) {
        alert("Please provide some notation text or select a file to import.");
        return;
    }
    onImport(notationText, selectedFile || undefined);
  };
  
  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };
  
  const clearFile = () => {
    setSelectedFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleLogin = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Authentication error:", error);
        alert("Could not log in. Please check the console for details, and ensure your Firebase configuration in `firebase.ts` is correct.");
    }
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
      } catch (error)
      {
          console.error("Sign out error:", error);
      }
  };

  const renderPlaybackControls = () => (
    <>
      {!isPlaying ? (
        <button onClick={onPlay} disabled={!isMusicLoaded || isLoading} className="control-button bg-teal-600 hover:bg-teal-500">
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
      <button onClick={onExportWav} disabled={!isMusicLoaded || isLoading || isPlaying} className="control-button bg-blue-600 hover:bg-blue-500">
        <DownloadIcon /> WAV
      </button>
      <button onClick={onExportMidi} disabled={!isMusicLoaded || isLoading || isPlaying} className="control-button bg-purple-600 hover:bg-purple-500">
        <DownloadIcon /> MIDI
      </button>
    </div>
  );

  const isImportDisabled = isLoading;

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-2xl p-6 border border-gray-700 space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-xl font-semibold mb-3 text-teal-400">1. Import Music</h2>
        <p className="text-sm text-gray-400 mb-4">
          Paste text notation or upload an image of sheet music, tabs, or sol-fa.
        </p>
        <textarea
          value={notationText}
          onChange={(e) => setNotationText(e.target.value)}
          placeholder="e.g., C G Am F, guitar tabs, or 'd r m f s'..."
          className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:outline-none transition disabled:opacity-50"
          disabled={isImportDisabled}
        />
        <div className="mt-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.musicxml,.xml" disabled={isImportDisabled} />
            <button onClick={handleFileSelectClick} className="w-full control-button bg-gray-700 hover:bg-gray-600 text-sm" disabled={isImportDisabled}>
                <UploadIcon /> {selectedFile ? "Change File" : "Select Image File"}
            </button>
            {selectedFile && (
                <div className="text-xs text-center mt-2 text-gray-400 flex items-center justify-center">
                    <span>{selectedFile.name}</span>
                    <button onClick={clearFile} className="ml-2 text-red-400 hover:text-red-300" disabled={isImportDisabled}>&times;</button>
                </div>
            )}
        </div>
        <button onClick={handleImportClick} disabled={isImportDisabled} className="mt-4 w-full control-button bg-green-700 hover:bg-green-600 text-lg font-bold">
          {isLoading ? 'Parsing...' : 'Parse & Import'}
        </button>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-3 text-teal-400">2. Control &amp; Save</h2>
        <div className="space-y-2">
          <button onClick={onSaveScore} disabled={!isMusicLoaded || isLoading || isPlaying || !currentUser} className="w-full control-button bg-indigo-600 hover:bg-indigo-500">
            <SaveIcon /> Save Score
          </button>
          {renderPlaybackControls()}
          {renderExportControls()}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-gray-700">
        <h2 className="text-xl font-semibold mb-3 text-teal-400">3. Account</h2>
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Logged in as</p>
              <p className="font-medium truncate" title={currentUser.displayName || 'User'}>{currentUser.displayName}</p>
            </div>
            <button onClick={handleLogout} className="control-button bg-red-600 hover:bg-red-500 text-sm">
              <LogoutIcon /> Logout
            </button>
          </div>
        ) : (
          <button onClick={handleLogin} className="w-full control-button bg-gray-700 hover:bg-gray-600">
            <LoginIcon /> Login with Google
          </button>
        )}
      </div>
    </div>
  );
};

export default Controls;
