
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
    'whole': 80, 'half': 60, 'quarter': 40, 'eighth': 30, 'sixteenth': 25
};

const STAFF_TOP = 40;
const STAFF_HEIGHT = 80;
const LINE_SPACING = STAFF_HEIGHT / 4;

const renderNote = (note: Note, x: number, key: string) => {
    const pitch = note.pitch.replace(/[b#]/g, ''); // Simple rendering, ignores accidentals for positioning
    const y = PITCH_Y_MAP[pitch] || PITCH_Y_MAP['B4']; // Default to B4 if not found
    
    if (note.pitch === 'rest') {
        let restSymbol;
        switch(note.duration) {
            case 'whole': restSymbol = <rect x={x} y={STAFF_TOP + LINE_SPACING} width="20" height="10" fill="white" />; break; // Below 2nd line
            case 'half': restSymbol = <rect x={x} y={STAFF_TOP + LINE_SPACING * 1.5} width="20" height="10" fill="white" />; break; // On 3rd line
            case 'quarter': restSymbol = <text x={x} y={STAFF_TOP + STAFF_HEIGHT/2 + 15} fontSize="45" fill="white" fontFamily="serif" transform={`rotate(10, ${x}, ${STAFF_TOP + STAFF_HEIGHT/2})`}>{'{'}'}'}</text>; break;
            default: restSymbol = <circle cx={x+5} cy={STAFF_TOP + STAFF_HEIGHT/2} r="5" fill="white" />; // Eighth rest placeholder
        }
        return <g key={key}>{restSymbol}</g>;
    }

    const hasStem = note.duration !== 'whole';
    const stemDirection = y < STAFF_TOP + STAFF_HEIGHT / 2 ? 1 : -1;
    const stemHeight = 60;

    return (
      <g key={key}>
        {hasStem && <line x1={x + (stemDirection === 1 ? -10 : 10)} y1={y} x2={x + (stemDirection === 1 ? -10 : 10)} y2={y - stemDirection * stemHeight} stroke="white" strokeWidth="2" />}
        <ellipse cx={x} cy={y} rx="10" ry="8" fill={note.duration === 'whole' ? 'transparent' : 'white'} stroke="white" strokeWidth="2" transform={`rotate(-20, ${x}, ${y})`} />
        {['eighth', 'sixteenth'].includes(note.duration) && 
            <path d={`M ${x + (stemDirection === 1 ? -10 : 10)} ${y - stemDirection * stemHeight} Q ${x + (stemDirection === 1 ? 0 : 20)} ${y - stemDirection * (stemHeight-10)}, ${x + (stemDirection === 1 ? -15 : 15)} ${y - stemDirection * (stemHeight-30)}`} stroke="white" strokeWidth="3" fill="none"/>
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