import React from 'react';
import { SavedScore } from '../types';
import { MusicNoteIcon } from './icons/MusicNoteIcon';

interface MyScoresProps {
  scores: SavedScore[];
  onLoadScore: (score: SavedScore) => void;
  isLoading: boolean;
}

const MyScores: React.FC<MyScoresProps> = ({ scores, onLoadScore, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-lg shadow-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-3 text-teal-400">My Scores</h2>
        <div className="text-center text-gray-400 py-4">Loading scores...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg shadow-2xl p-6 border border-gray-700 h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-3 text-teal-400">My Scores</h2>
      {scores.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-center text-gray-500">
          <p>You haven't saved any scores yet.</p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto -mr-2 pr-2">
          {scores.map((score) => (
            <li key={score.id}>
              <button
                onClick={() => onLoadScore(score)}
                className="w-full text-left p-3 rounded-md bg-gray-900/50 hover:bg-gray-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <div className="flex items-center space-x-3">
                    <MusicNoteIcon />
                    <div className="flex-grow overflow-hidden">
                        <p className="font-medium text-gray-200 truncate" title={score.name}>{score.name}</p>
                        <p className="text-xs text-gray-400">
                            Saved on {new Date(score.savedAt.seconds * 1000).toLocaleDateString()}
                        </p>
                    </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyScores;
