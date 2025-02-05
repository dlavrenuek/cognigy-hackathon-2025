export class AudioHandler {
    private audioContext: AudioContext | null = null;
    private analyzer: AnalyserNode | null = null;
    private mediaStream: MediaStream | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private isListening: boolean = false;
    profiles: Map<string, {
        frequencyProfiles: number[][], // Store multiple profiles per player
        frequencyCharacteristics: {
            peakFrequencies: number[],
            avgEnergy: number,
            spectralCentroid: number,
            spectralRolloff: number,
            zeroCrossingRate: number,
            formants: number[]  // Voice formants (resonant frequencies)
        }
    }> = new Map();
    private calibrationData: number[][] = [];
    private isCalibrating: boolean = false;
    private readonly VOLUME_THRESHOLD = 0.3; // Minimum volume to detect sound
    private readonly MIN_SAMPLE_GAP = 500; // Minimum ms between samples
    private lastSampleTime = 0;
    private isCurrentlyRecording = false;

    // Frequency ranges for each player
    private readonly FREQUENCY_RANGES = {
        shark: { min: 100, max: 400 },  // Low growl range
        seal: { min: 800, max: 2000 }   // High bark range
    };

    // Energy thresholds for detecting sounds
    public readonly ENERGY_THRESHOLD = 0.2;

    constructor() { }

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

    startCalibration() {
        this.calibrationData = [];
        this.isCalibrating = true;
        this.isCurrentlyRecording = false;
        this.lastSampleTime = 0;
    }

    async captureCalibrationSample(): Promise<number[] | null> {
        if (!this.isListening || !this.isCalibrating || this.isCurrentlyRecording || !this.analyzer) {
            return null;
        }

        const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(dataArray);
        const currentVolume = this.calculateVolume(dataArray);

        // Only capture if there's significant sound and enough time has passed
        const now = Date.now();
        if (currentVolume > this.VOLUME_THRESHOLD &&
            (now - this.lastSampleTime) > this.MIN_SAMPLE_GAP) {

            this.isCurrentlyRecording = true;

            try {
                // Take multiple readings over a short period to get a better sample
                const sampleDuration = 100; // ms
                const readings: number[][] = [];

                // Take several readings over the sample duration
                for (let i = 0; i < 3; i++) {
                    const reading = new Uint8Array(this.analyzer.frequencyBinCount);
                    this.analyzer.getByteFrequencyData(reading);
                    readings.push(Array.from(reading));
                    await new Promise(resolve => setTimeout(resolve, sampleDuration / 3));
                }

                // Average the readings
                const sample = new Array(this.analyzer.frequencyBinCount).fill(0);
                for (let i = 0; i < sample.length; i++) {
                    sample[i] = readings.reduce((sum, reading) => sum + reading[i], 0) / readings.length;
                }

                this.calibrationData.push(sample);
                this.lastSampleTime = now;
                return sample;
            } finally {
                this.isCurrentlyRecording = false;
            }
        }

        return null;
    }

    private calculateVolume(dataArray: Uint8Array): number {
        // Get more accurate volume by focusing on meaningful frequency range
        // Skip first few bins (very low frequencies) and very high frequencies
        const start = 5;  // Skip first few bins (usually noise)
        const end = Math.floor(dataArray.length * 0.8);  // Skip very high frequencies

        let sum = 0;
        let count = 0;
        for (let i = start; i < end; i++) {
            sum += dataArray[i];
            count++;
        }
        return sum / (count * 255); // Normalize to 0-1
    }

    finishCalibration(player: string) {
        if (this.calibrationData.length === 0) {
            console.warn(`No calibration data collected for ${player}`);
            return false;
        }

        // Store the raw frequency profiles
        const frequencyProfiles = [...this.calibrationData];

        // Calculate frequency characteristics
        const characteristics = this.calculateFrequencyCharacteristics(frequencyProfiles);

        // Store both profiles and characteristics
        this.profiles.set(player, {
            frequencyProfiles,
            frequencyCharacteristics: characteristics
        });

        this.isCalibrating = false;
        this.calibrationData = [];
        return true;
    }

    private calculateFrequencyCharacteristics(profiles: number[][]) {
        // Average the frequency data across all samples
        const avgProfile = new Array(profiles[0].length).fill(0);
        profiles.forEach(profile => {
            profile.forEach((val, i) => {
                avgProfile[i] += val;
            });
        });

        avgProfile.forEach((val, i) => {
            avgProfile[i] /= profiles.length;
        });

        // Find peak frequencies (local maxima)
        const peakFrequencies = this.findPeakFrequencies(avgProfile);

        // Calculate spectral centroid (brightness of sound)
        let numerator = 0;
        let denominator = 0;
        avgProfile.forEach((magnitude, i) => {
            numerator += magnitude * i;
            denominator += magnitude;
        });
        const spectralCentroid = numerator / denominator;

        // Calculate spectral rolloff (frequency below which 85% of spectrum energy lies)
        const totalEnergy = avgProfile.reduce((sum, val) => sum + val, 0);
        let energySum = 0;
        let rolloffIndex = 0;
        for (let i = 0; i < avgProfile.length; i++) {
            energySum += avgProfile[i];
            if (energySum >= totalEnergy * 0.85) {
                rolloffIndex = i;
                break;
            }
        }

        // Calculate zero-crossing rate from time domain data
        const zeroCrossings = this.calculateZeroCrossings(profiles[0]);

        // Estimate formants (resonant frequencies)
        const formants = this.estimateFormants(avgProfile);

        return {
            peakFrequencies: peakFrequencies.slice(0, 3),
            avgEnergy: totalEnergy / avgProfile.length,
            spectralCentroid,
            spectralRolloff: rolloffIndex,
            zeroCrossingRate: zeroCrossings,
            formants
        };
    }

    private calculateZeroCrossings(profile: number[]): number {
        let crossings = 0;
        const mean = profile.reduce((sum, val) => sum + val, 0) / profile.length;

        for (let i = 1; i < profile.length; i++) {
            if ((profile[i - 1] - mean) * (profile[i] - mean) < 0) {
                crossings++;
            }
        }

        return crossings / profile.length;
    }

    private estimateFormants(profile: number[]): number[] {
        const formants: number[] = [];
        const smoothedProfile = this.smoothArray(profile);

        // Find local maxima in the lower frequency range (typical for voice formants)
        for (let i = 1; i < Math.min(smoothedProfile.length - 1, 4000); i++) {
            if (smoothedProfile[i] > smoothedProfile[i - 1] &&
                smoothedProfile[i] > smoothedProfile[i + 1] &&
                smoothedProfile[i] > 50) {
                formants.push(i);
                i += 10; // Skip ahead to avoid detecting same formant
            }
        }

        return formants.slice(0, 3); // Return first 3 formants
    }

    private smoothArray(arr: number[], windowSize: number = 5): number[] {
        const smoothed = [...arr];
        const half = Math.floor(windowSize / 2);

        for (let i = half; i < arr.length - half; i++) {
            let sum = 0;
            for (let j = -half; j <= half; j++) {
                sum += arr[i + j];
            }
            smoothed[i] = sum / windowSize;
        }

        return smoothed;
    }

    // Add debug method to set dummy profiles
    setDummyProfile(player: 'shark' | 'seal') {
        const dummyFrequencyProfile = new Array(1024).fill(128);
        const dummyCharacteristics = {
            peakFrequencies: [100, 200, 300], // Dummy peak frequencies
            avgEnergy: 128,
            spectralCentroid: 0,
            spectralRolloff: 0,
            zeroCrossingRate: 0,
            formants: []
        };

        this.profiles.set(player, {
            frequencyProfiles: [dummyFrequencyProfile],
            frequencyCharacteristics: dummyCharacteristics
        });
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

    private findPeakFrequencies(audio: number[]): number[] {
        const peaks: number[] = [];
        for (let i = 1; i < audio.length - 1; i++) {
            if (audio[i] > audio[i - 1] &&
                audio[i] > audio[i + 1] &&
                audio[i] > 50) {
                peaks.push(i);
            }
        }
        return peaks.slice(0, 3); // Keep top 3 peaks
    }
} 