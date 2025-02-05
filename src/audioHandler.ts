export class AudioHandler {
    private audioContext: AudioContext
    private analyzer: AnalyserNode
    private mediaStream: MediaStream | null = null
    private isListening: boolean = false
    profiles: Map<string, any> = new Map();
    private calibrationData: number[][] = [];
    private isCalibrating: boolean = false;

    constructor() {
        this.audioContext = new AudioContext()
        this.analyzer = this.audioContext.createAnalyser()
    }

    async setupMicrophone(player: string): Promise<boolean> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            })

            const source = this.audioContext.createMediaStreamSource(this.mediaStream)
            source.connect(this.analyzer)
            this.isListening = true
            return true
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
    }

    finishCalibration(player: string) {
        if (this.calibrationData.length === 0) {
            console.warn(`No calibration data collected for ${player}`);
            return;
        }

        // Calculate average frequency profile
        const avgProfile = this.calculateAverageProfile();

        // Store the profile for this player
        this.profiles.set(player, {
            frequencyProfile: avgProfile,
            threshold: this.calculateThreshold(avgProfile)
        });

        this.isCalibrating = false;
        this.calibrationData = [];
    }

    async captureCalibrationSample(): Promise<number[]> {
        if (!this.isListening || !this.isCalibrating) {
            return [];
        }

        const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteFrequencyData(dataArray);

        // Convert to regular array and store
        const sample = Array.from(dataArray);
        this.calibrationData.push(sample);

        return sample;
    }

    private calculateAverageProfile(): number[] {
        const sampleLength = this.calibrationData[0].length;
        const avgProfile = new Array(sampleLength).fill(0);

        // Calculate the average for each frequency bin
        for (let i = 0; i < sampleLength; i++) {
            let sum = 0;
            for (const sample of this.calibrationData) {
                sum += sample[i];
            }
            avgProfile[i] = sum / this.calibrationData.length;
        }

        return avgProfile;
    }

    private calculateThreshold(profile: number[]): number {
        // Calculate the average amplitude across all frequencies
        const average = profile.reduce((sum, val) => sum + val, 0) / profile.length;

        // Set threshold at 60% of the average calibration volume
        return average * 0.6;
    }

    cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop())
        }
        this.isListening = false
    }
} 