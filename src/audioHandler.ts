export class AudioHandler {
    private audioContexts: Map<string, AudioContext> = new Map()
    public analyzers: Map<string, AnalyserNode> = new Map()
    private mediaStreams: Map<string, MediaStream> = new Map()
    private mediaStreamSources: Map<string, MediaStreamAudioSourceNode> = new Map()
    private isListening: boolean = false
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

    constructor() {
        // Remove the single audioContext and analyzer initialization
    }

    async setupMicrophone(player: string): Promise<boolean> {
        try {
            // Create new AudioContext for this player
            const audioContext = new AudioContext();
            const analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 2048;
            analyzer.smoothingTimeConstant = 0.8;

            // Resume audio context if it's suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            })

            const mediaStreamSource = audioContext.createMediaStreamSource(mediaStream)
            mediaStreamSource.connect(analyzer)

            // Create a dummy node to prevent audio feedback
            const silentNode = audioContext.createGain();
            silentNode.gain.value = 0;
            analyzer.connect(silentNode);
            silentNode.connect(audioContext.destination);

            // Store all components for this player
            this.audioContexts.set(player, audioContext);
            this.analyzers.set(player, analyzer);
            this.mediaStreams.set(player, mediaStream);
            this.mediaStreamSources.set(player, mediaStreamSource);

            this.isListening = true;
            console.log(`Microphone setup complete for ${player}`);
            return true;
        } catch (error) {
            console.error(`Failed to setup microphone for ${player}:`, error)
            return false
        }
    }

    getVolume(player: string): number {
        const analyzer = this.analyzers.get(player);
        if (!this.isListening || !analyzer) return 0;

        const dataArray = new Uint8Array(analyzer.frequencyBinCount)
        analyzer.getByteFrequencyData(dataArray)

        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
        return average / 255
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

        const currentPlayer = this.getCurrentPlayer();
        const analyzer = this.analyzers.get(currentPlayer);
        if (!analyzer) return null;

        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);
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
                    const reading = new Uint8Array(analyzer.frequencyBinCount);
                    analyzer.getByteFrequencyData(reading);
                    readings.push(Array.from(reading));
                    await new Promise(resolve => setTimeout(resolve, sampleDuration / 3));
                }

                // Average the readings
                const sample = new Array(analyzer.frequencyBinCount).fill(0);
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

    cleanup() {
        // Cleanup all audio components for all players
        for (const [player] of this.mediaStreams) {
            this.cleanupPlayer(player);
        }
        this.isListening = false;
    }

    private cleanupPlayer(player: string) {
        const mediaStream = this.mediaStreams.get(player);
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }

        const mediaStreamSource = this.mediaStreamSources.get(player);
        if (mediaStreamSource) {
            mediaStreamSource.disconnect();
        }

        const analyzer = this.analyzers.get(player);
        if (analyzer) {
            analyzer.disconnect();
        }

        this.mediaStreams.delete(player);
        this.mediaStreamSources.delete(player);
        this.analyzers.delete(player);
        this.audioContexts.delete(player);
    }

    testAudioMatch(player: 'shark' | 'seal'): number {
        const analyzer = this.analyzers.get(player);
        if (!this.isListening || !this.profiles.has(player) || !analyzer) {
            return 0;
        }

        const currentAudio = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(currentAudio);
        const currentProfile = Array.from(currentAudio);

        // Get current volume
        const currentVolume = this.calculateVolume(currentAudio);
        if (currentVolume < this.VOLUME_THRESHOLD) {
            return 0;
        }

        const storedProfile = this.profiles.get(player)!;
        const currentCharacteristics = this.calculateFrequencyCharacteristics([currentProfile]);

        // Calculate weighted match score
        const peakMatch = this.comparePeakFrequencies(
            currentCharacteristics.peakFrequencies,
            storedProfile.frequencyCharacteristics.peakFrequencies
        );

        const centroidMatch = 1 - Math.abs(
            currentCharacteristics.spectralCentroid -
            storedProfile.frequencyCharacteristics.spectralCentroid
        ) / storedProfile.frequencyCharacteristics.spectralCentroid;

        const rolloffMatch = 1 - Math.abs(
            currentCharacteristics.spectralRolloff -
            storedProfile.frequencyCharacteristics.spectralRolloff
        ) / storedProfile.frequencyCharacteristics.spectralRolloff;

        const zcrMatch = 1 - Math.abs(
            currentCharacteristics.zeroCrossingRate -
            storedProfile.frequencyCharacteristics.zeroCrossingRate
        ) / storedProfile.frequencyCharacteristics.zeroCrossingRate;

        // Weight the different characteristics
        return (
            peakMatch * 0.4 +
            Math.max(0, centroidMatch) * 0.2 +
            Math.max(0, rolloffMatch) * 0.2 +
            Math.max(0, zcrMatch) * 0.2
        );
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

    // Helper method to get current player during calibration
    private getCurrentPlayer(): string {
        // This should be updated to track the current calibrating player
        return Array.from(this.analyzers.keys())[0] || '';
    }
} 