export class AudioHandler {
    private audioContext: AudioContext
    public analyzer: AnalyserNode
    private mediaStream: MediaStream | null = null
    private isListening: boolean = false
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    profiles: Map<string, {
        frequencyProfiles: number[][], // Store multiple profiles per player
        frequencyCharacteristics: {
            peakFrequencies: number[],
            avgEnergy: number
        }
    }> = new Map();
    private calibrationData: number[][] = [];
    private isCalibrating: boolean = false;
    private readonly VOLUME_THRESHOLD = 0.3; // Minimum volume to detect sound
    private readonly MIN_SAMPLE_GAP = 500; // Minimum ms between samples
    private lastSampleTime = 0;
    private isCurrentlyRecording = false;

    constructor() {
        this.audioContext = new AudioContext()
        this.analyzer = this.audioContext.createAnalyser()
        // Set FFT size for better frequency resolution
        this.analyzer.fftSize = 2048;
        // Set smoothing to help reduce noise
        this.analyzer.smoothingTimeConstant = 0.8;
    }

    async setupMicrophone(player: string): Promise<boolean> {
        try {
            // Resume audio context if it's suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            })

            // Store the source node and connect it to the analyzer
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream)
            this.mediaStreamSource.connect(this.analyzer)

            // Create a dummy node to prevent audio feedback
            const silentNode = this.audioContext.createGain();
            silentNode.gain.value = 0;
            this.analyzer.connect(silentNode);
            silentNode.connect(this.audioContext.destination);

            this.isListening = true;
            console.log("Microphone setup complete");
            return true;
        } catch (error) {
            console.error(`Failed to setup microphone for ${player}:`, error)
            return false
        }
    }

    getVolume(): number {
        if (!this.isListening) return 0

        const dataArray = new Uint8Array(this.analyzer.frequencyBinCount)
        this.analyzer.getByteFrequencyData(dataArray)

        // Calculate average volume
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
        return average / 255 // Normalize to 0-1
    }

    startCalibration() {
        this.calibrationData = [];
        this.isCalibrating = true;
        this.isCurrentlyRecording = false;
        this.lastSampleTime = 0;
    }

    async captureCalibrationSample(): Promise<number[] | null> {
        if (!this.isListening || !this.isCalibrating || this.isCurrentlyRecording) {
            return null;
        }

        const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(dataArray);
        const currentVolume = this.calculateVolume(dataArray);
        console.log("Current volume:", currentVolume);

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
        // Find dominant frequencies across all samples
        const peakFrequencies: number[] = [];
        let totalEnergy = 0;

        // Average the frequency data across all samples
        const avgProfile = new Array(profiles[0].length).fill(0);
        profiles.forEach(profile => {
            profile.forEach((val, i) => {
                avgProfile[i] += val;
            });
        });

        avgProfile.forEach((val, i) => {
            avgProfile[i] /= profiles.length;
            totalEnergy += val;
        });

        // Find peak frequencies (local maxima)
        for (let i = 1; i < avgProfile.length - 1; i++) {
            if (avgProfile[i] > avgProfile[i - 1] &&
                avgProfile[i] > avgProfile[i + 1] &&
                avgProfile[i] > 50) { // Minimum peak threshold
                peakFrequencies.push(i);
            }
        }

        return {
            peakFrequencies: peakFrequencies.slice(0, 3), // Keep top 3 peaks
            avgEnergy: totalEnergy / avgProfile.length
        };
    }

    cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop())
        }
        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
        }
        this.analyzer.disconnect();
        this.isListening = false;
    }

    testAudioMatch(player: 'shark' | 'seal'): number {
        if (!this.isListening || !this.profiles.has(player)) {
            return 0;
        }

        const currentAudio = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(currentAudio);

        // Get current volume
        const currentVolume = this.calculateVolume(currentAudio);
        if (currentVolume < this.VOLUME_THRESHOLD) {
            return 0;
        }

        const profile = this.profiles.get(player)!;

        // Find current peak frequencies
        const currentPeaks = this.findPeakFrequencies(Array.from(currentAudio));

        // Compare peak frequencies with stored profile
        const peakMatch = this.comparePeakFrequencies(
            currentPeaks,
            profile.frequencyCharacteristics.peakFrequencies
        );

        return peakMatch;
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

    private comparePeakFrequencies(current: number[], stored: number[]): number {
        if (current.length === 0 || stored.length === 0) return 0;

        // Calculate how many peaks match within a tolerance range
        const tolerance = 2; // Frequency bin tolerance
        let matches = 0;

        current.forEach(currentPeak => {
            if (stored.some(storedPeak =>
                Math.abs(currentPeak - storedPeak) <= tolerance)) {
                matches++;
            }
        });

        return matches / Math.max(current.length, stored.length);
    }
} 