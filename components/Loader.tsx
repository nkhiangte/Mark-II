
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-600 border-t-teal-400 rounded-full animate-spin"></div>
      <p className="text-gray-400 text-lg">AI is parsing your music...</p>
      <p className="text-gray-500 text-sm">This may take up to two minutes for complex pieces.</p>
    </div>
  );
};

export default Loader;