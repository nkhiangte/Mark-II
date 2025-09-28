import React from 'react';
import { ParsedMusic, Note, Measure } from '../types';

interface SheetMusicViewerProps {
  music: ParsedMusic;
}

const PITCH_Y_MAP: Record<string, number> = {
    'C8': -15, 'B7': -10, 'A7': -5, 'G7': 0, 'F7': 5, 'E7': 10, 'D7': 15, 'C7': 20, 
    'B6': 25, 'A6': 30, 'G6': 35, 'F6': 40, 'E6': 45, 'D6': 50, 'C6': 55, 
    'B5': 60, 'A5': 65, 'G5': 70, 'F5': 75, 'E5': 80, 'D5': 85, 'C5': 90, 
    'B4': 95, 'A4': 100, 'G4': 105, 'F4': 110, 'E4': 115, 'D4': 120, 'C4': 125,
    'B3': 130, 'A3': 135, 'G3': 140, 'F3': 145, 'E3': 150,
};

const DURATION_WIDTH: Record<Note['duration'], number> = {
    'whole': 80, 'half': 60, 'quarter': 45, 'eighth': 35, 'sixteenth': 35
};

const STAFF_TOP = 40;
const STAFF_HEIGHT = 80;
const LINE_SPACING = STAFF_HEIGHT / 4;

const renderNote = (note: Note, x: number, key: string) => {
    if (note.pitch === 'rest') {
        const RestSymbols: Record<Note['duration'], React.ReactNode> = {
            'whole': <rect x={x} y={STAFF_TOP + LINE_SPACING} width="20" height="8" fill="white" />,
            'half': <rect x={x} y={STAFF_TOP + 2 * LINE_SPACING - 8} width="20" height="8" fill="white" />,
            'quarter': <text x={x} y={STAFF_TOP + STAFF_HEIGHT/2 + 20} fontSize="50" fill="white" fontFamily="serif">𝄽</text>,
            'eighth': <text x={x} y={STAFF_TOP + STAFF_HEIGHT/2 + 10} fontSize="40" fill="white" fontFamily="serif">𝄾</text>,
            'sixteenth': <text x={x} y={STAFF_TOP + STAFF_HEIGHT/2 + 10} fontSize="40" fill="white" fontFamily="serif">𝄿</text>,
        };
        const restSymbol = RestSymbols[note.duration];
        return <g key={key}>{restSymbol}</g>;
    }

    let accidental: 'sharp' | 'flat' | null = null;
    let pitchWithoutAccidental = note.pitch;

    if (/[#b]/.test(note.pitch)) {
        const match = note.pitch.match(/([A-G])([#b]+)(.*)/);
        if(match) {
            if (match[2].includes('#')) accidental = 'sharp';
            if (match[2].includes('b')) accidental = 'flat';
            pitchWithoutAccidental = match[1] + match[3];
        }
    }
    
    const y = PITCH_Y_MAP[pitchWithoutAccidental] || PITCH_Y_MAP['B4']; 
    
    const noteHeadX = x + (accidental ? 15 : 0);
    const accidentalX = x;

    const hasStem = note.duration !== 'whole';
    const isFilled = ['quarter', 'eighth', 'sixteenth'].includes(note.duration);
    const stemDirection = y < STAFF_TOP + STAFF_HEIGHT / 2 ? -1 : 1; // Stems go down if high, up if low
    const stemX = noteHeadX + (stemDirection === 1 ? 10 : -10);
    const stemHeight = 60;
    const stemY2 = y + stemDirection * stemHeight;

    const flagDirection = stemDirection === -1 ? 1 : -1; // Flags point right

    return (
      <g key={key}>
        {accidental === 'sharp' && <text x={accidentalX} y={y + 5} fontSize="30" fill="white" fontFamily="serif">♯</text>}
        {accidental === 'flat' && <text x={accidentalX} y={y + 8} fontSize="35" fill="white" fontFamily="serif">♭</text>}
        
        {hasStem && <line x1={stemX} y1={y} x2={stemX} y2={stemY2} stroke="white" strokeWidth="2" />}
        
        <ellipse cx={noteHeadX} cy={y} rx="10" ry="8" fill={isFilled ? 'white' : 'transparent'} stroke="white" strokeWidth="2.5" transform={`rotate(-20, ${noteHeadX}, ${y})`} />
        
        {note.duration === 'eighth' && 
            <path d={`M ${stemX} ${stemY2} Q ${stemX + flagDirection * 15} ${stemY2 + 15}, ${stemX + flagDirection * 5} ${stemY2 + 30}`} stroke="white" strokeWidth="3" fill="none"/>
        }
        {note.duration === 'sixteenth' && 
          <>
            <path d={`M ${stemX} ${stemY2} Q ${stemX + flagDirection * 15} ${stemY2 + 15}, ${stemX + flagDirection * 5} ${stemY2 + 30}`} stroke="white" strokeWidth="3" fill="none"/>
            <path d={`M ${stemX} ${stemY2 - 8} Q ${stemX + flagDirection * 15} ${stemY2 + 7}, ${stemX + flagDirection * 5} ${stemY2 + 22}`} stroke="white" strokeWidth="3" fill="none"/>
          </>
        }
      </g>
    );
}

const TrebleClef = ({ x, y }: { x: number; y: number; }) => (
    <text x={x} y={y} fontSize="120" fill="white" fontFamily="serif">&#x1D11E;</text>
);

const SheetMusicViewer: React.FC<SheetMusicViewerProps> = ({ music }) => {
    const lines: Measure[][] = [];
    let currentLine: Measure[] = [];
    let currentWidth = 100; // Start with space for clef
    const MAX_WIDTH = 980;

    music.measures.forEach(measure => {
        const measureWidth = measure.notes.reduce((w, note) => w + DURATION_WIDTH[note.duration], 0) + 20; // notes + barline space
        if (currentWidth + measureWidth > MAX_WIDTH && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentWidth = 100;
        }
        currentLine.push(measure);
        currentWidth += measureWidth;
    });
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
    const totalHeight = lines.length * (STAFF_HEIGHT + 60) + STAFF_TOP;

    return (
        <div className="w-full h-full overflow-auto">
            <svg width="100%" height="auto" viewBox={`0 0 1000 ${totalHeight}`}>
                {lines.map((measuresOnLine, lineIndex) => {
                    const yOffset = lineIndex * (STAFF_HEIGHT + 60);
                    let currentX = 80;
                    
                    return (
                        <g key={`line-${lineIndex}`} transform={`translate(0, ${yOffset})`}>
                            {/* Staff lines */}
                            {Array.from({ length: 5 }).map((_, i) => (
                                <path 
                                    key={`staff-${lineIndex}-${i}`} 
                                    d={`M 10,${STAFF_TOP + i * LINE_SPACING} L 990,${STAFF_TOP + i * LINE_SPACING}`} 
                                    stroke="rgba(255,255,255,0.5)" 
                                    strokeWidth="1" 
                                />
                            ))}
                            {/* Clef */}
                            <TrebleClef x={15} y={STAFF_TOP + STAFF_HEIGHT/2 + 45} />
                            
                            {/* Notes and Barlines */}
                            {measuresOnLine.map((measure, measureIndex) => {
                                const measureContent = measure.notes.map((note, noteIndex) => {
                                    const noteElement = renderNote(note, currentX, `${lineIndex}-${measureIndex}-${noteIndex}`);
                                    currentX += DURATION_WIDTH[note.duration];
                                    return noteElement;
                                });
                                currentX += 10; // barline space
                                const barline = <line x1={currentX} y1={STAFF_TOP} x2={currentX} y2={STAFF_TOP + STAFF_HEIGHT} stroke="rgba(255,255,255,0.8)" strokeWidth="2" />;
                                currentX += 10; // space after barline
                                return (
                                    <g key={`measure-${lineIndex}-${measureIndex}`}>
                                        {measureContent}
                                        {barline}
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default SheetMusicViewer;