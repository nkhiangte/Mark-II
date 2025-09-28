
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
        Mark II
      </h1>
      <p className="text-gray-400 mt-2 text-lg">
        Your AI-Powered Music Notation Assistant
      </p>
    </header>
  );
};

export default Header;
