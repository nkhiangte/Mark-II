
import { ParsedMusic, Note } from '../types';

declare const Tone: any;

const DURATION_TO_TONE: Record<Note['duration'], string> = {
    'whole': '1n',
    'half': '2n',
    'quarter': '4n',
    'eighth': '8n',
    'sixteenth': '16n',
};

export class SoundEngine {
    private synth: any | null = null;
    private isInitialized: boolean = false;
    private onEndedCallback: (() => void) | null = null;

    constructor() {
        // Defer initialization to first user interaction to comply with browser audio policies.
    }

    private async initialize() {
        if (this.isInitialized || typeof Tone === 'undefined') return;
        try {
            await Tone.start();
            this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
            this.isInitialized = true;
            console.log("Audio context started and synth initialized.");

            // The 'stop' event fires when the transport is stopped, either manually or at the end of the schedule.
            Tone.Transport.on('stop', () => {
                if (this.onEndedCallback) {
                    this.onEndedCallback();
                }
                this.onEndedCallback = null;
            });
        } catch (e) {
            console.error("Could not initialize Tone.js", e);
        }
    }

    async play(music: ParsedMusic, tempo: number, onEnded: () => void) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.isInitialized || !this.synth) {
            console.error("SoundEngine not initialized. Cannot play music.");
            onEnded();
            return;
        }

        this.stop(); 
        this.onEndedCallback = onEnded;

        Tone.Transport.bpm.value = tempo;

        const notes = music.measures.flatMap(m => m.notes);
        
        const part = new Tone.Part((time, value) => {
            if (value.pitch !== 'rest') {
                this.synth.triggerAttackRelease(
                    value.pitch, 
                    value.duration, 
                    time
                );
            }
        }, []).start(0);
        
        let totalDuration = 0;
        let currentTime = 0;
        notes.forEach(note => {
            const toneDuration = DURATION_TO_TONE[note.duration];
            part.add(currentTime, { pitch: note.pitch, duration: toneDuration });
            const durationInSeconds = Tone.Time(toneDuration).toSeconds();
            currentTime += durationInSeconds;
            totalDuration = currentTime;
        });

        // Schedule the transport to stop after the last note has finished playing.
        Tone.Transport.scheduleOnce(() => {
            this.stop(false); // don't call onEnded manually, let the event handle it
        }, totalDuration);
        
        Tone.Transport.start();
    }

    stop(manual = true) {
        if (!this.isInitialized) return;
        
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (this.synth?.releaseAll) {
            this.synth.releaseAll();
        }
    }
}
