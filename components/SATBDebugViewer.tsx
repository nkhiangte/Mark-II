import React from 'react';

interface SATBDebugViewerProps {
    data: any;
}

const SATBDebugViewer: React.FC<SATBDebugViewerProps> = ({ data }) => {
    if (!data) return null;

    const parts = ['soprano', 'alto', 'tenor', 'bass'];

    // Check if there is any actual data to display
    const hasData = parts.some(part => data[part] && data[part].length > 0 && data[part].some((measure: any[]) => measure.length > 0 && !measure[0].isRest));
    if (!hasData) return null;

    return (
        <div className="mt-6 p-4 bg-gray-800/60 rounded-lg border border-gray-700 shadow-xl">
            <h3 className="text-lg font-semibold mb-3 text-teal-400">SATB Parser Output</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {parts.map(part => (
                    data[part] && data[part].length > 0 && (
                        <div key={part} className="bg-gray-900/70 p-3 rounded-md border border-gray-700">
                            <strong className="block mb-2 text-center capitalize text-gray-300 tracking-wider">{part}</strong>
                            {data[part].map((measure: any[], measureIndex: number) => (
                                <div key={`${part}-${measureIndex}`} className="text-sm mb-1 text-gray-400">
                                    <span className="font-semibold text-gray-500 mr-2">M{measureIndex + 1}:</span>
                                    <span className="font-mono">
                                    {measure.map((note, noteIndex) => 
                                        note.isRest ? 'R' : `${note.solfege}(${note.noteName}${note.octave})`
                                    ).join(' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

export default SATBDebugViewer;
