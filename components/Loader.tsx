
import React from 'react';

interface LoaderProps {
  message?: string;
  onCancel?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ message, onCancel }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-600 border-t-teal-400 rounded-full animate-spin"></div>
      <p className="text-gray-400 text-lg">{message || 'AI is parsing your music...'}</p>
      <p className="text-gray-500 text-sm">This may take up to a few minutes for complex pieces.</p>
      {onCancel && (
        <button 
          onClick={onCancel}
          className="mt-6 px-6 py-2 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          aria-label="Cancel processing"
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default Loader;
