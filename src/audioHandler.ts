export class AudioHandler {
    private audioContext: AudioContext | null = null;
    private analyzer: AnalyserNode | null = null;
    private mediaStream: MediaStream | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private isListening: boolean = false;
    profiles = new Map<string, boolean>();

    // Frequency ranges for each player
    private readonly FREQUENCY_RANGES = {
        shark: { min: 100, max: 400 },  // Low growl range
        seal: { min: 800, max: 2000 }   // High bark range
    };

    // Energy thresholds for detecting sounds
    public readonly ENERGY_THRESHOLD = 0.2;

    constructor() {
        // Initialize both players as ready
        this.profiles.set('shark', true);
        this.profiles.set('seal', true);
    }

    async setupMicrophone(): Promise<boolean> {
        try {
            this.audioContext = new AudioContext();
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = 2048; // For better frequency resolution
            this.analyzer.smoothingTimeConstant = 0.5;

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.mediaStreamSource.connect(this.analyzer);

            this.isListening = true;
            return true;
        } catch (error) {
            console.error('Failed to setup microphone:', error);
            return false;
        }
    }

    getFrequencyData(): { frequencies: Uint8Array, shark: number, seal: number } {
        if (!this.analyzer || !this.isListening) {
            return { frequencies: new Uint8Array(), shark: 0, seal: 0 };
        }

        const frequencies = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(frequencies);

        // Calculate energy in shark and seal frequency ranges
        const sharkEnergy = this.calculateBandEnergy(frequencies, 'shark');
        const sealEnergy = this.calculateBandEnergy(frequencies, 'seal');

        return {
            frequencies,
            shark: sharkEnergy,
            seal: sealEnergy
        };
    }

    private calculateBandEnergy(frequencies: Uint8Array, player: 'shark' | 'seal'): number {
        const { min, max } = this.FREQUENCY_RANGES[player];
        const nyquist = this.audioContext!.sampleRate / 2;
        const minIndex = Math.floor((min / nyquist) * frequencies.length);
        const maxIndex = Math.floor((max / nyquist) * frequencies.length);

        let energy = 0;
        let count = 0;

        for (let i = minIndex; i <= maxIndex; i++) {
            energy += frequencies[i];
            count++;
        }

        return count > 0 ? (energy / (count * 255)) : 0;
    }

    testAudioMatch(player: 'shark' | 'seal'): number {
        const analyzer = this.analyzer;
        if (!this.isListening || !analyzer) {
            return 0;
        }

        const frequencies = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(frequencies);

        const sharkEnergy = this.calculateBandEnergy(frequencies, 'shark');
        const sealEnergy = this.calculateBandEnergy(frequencies, 'seal');

        // Return match score based on energy in correct range
        const energy = player === 'shark' ? sharkEnergy : sealEnergy;
        const otherEnergy = player === 'shark' ? sealEnergy : sharkEnergy;

        // Different scenarios:
        // 1. Clear single sound in correct range
        if (energy > this.ENERGY_THRESHOLD && otherEnergy < this.ENERGY_THRESHOLD) {
            return energy;
        }
        // 2. Simultaneous sounds but correct range is stronger
        else if (energy > this.ENERGY_THRESHOLD && energy > (otherEnergy * 1.5)) {
            return energy * 0.7; // Reduce score when there's some interference
        }
        // 3. Too much interference or wrong sound
        return 0;
    }

    cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
        }
        if (this.analyzer) {
            this.analyzer.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }

        this.mediaStream = null;
        this.mediaStreamSource = null;
        this.analyzer = null;
        this.audioContext = null;
        this.isListening = false;
    }

    // Helper method for visualization
    getFrequencyRanges() {
        return this.FREQUENCY_RANGES;
    }

    // Add new method to detect simultaneous sounds
    detectSimultaneousSounds(): {
        shark: number,
        seal: number,
        isSimultaneous: boolean
    } {
        if (!this.analyzer || !this.isListening) {
            return { shark: 0, seal: 0, isSimultaneous: false };
        }

        const frequencies = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(frequencies);

        const sharkEnergy = this.calculateBandEnergy(frequencies, 'shark');
        const sealEnergy = this.calculateBandEnergy(frequencies, 'seal');

        // Detect if both sounds are present above threshold
        const isSimultaneous = (
            sharkEnergy > this.ENERGY_THRESHOLD &&
            sealEnergy > this.ENERGY_THRESHOLD
        );

        return {
            shark: sharkEnergy,
            seal: sealEnergy,
            isSimultaneous
        };
    }

    getSampleRate(): number {
        return this.audioContext?.sampleRate ?? 44100;
    }
} 