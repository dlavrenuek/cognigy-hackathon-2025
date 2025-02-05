export class AudioHandler {
    private audioContext: AudioContext
    private analyzer: AnalyserNode
    private mediaStream: MediaStream | null = null
    private isListening: boolean = false

    constructor() {
        this.audioContext = new AudioContext()
        this.analyzer = this.audioContext.createAnalyser()
    }

    async setupMicrophone(player: "shark" | "seal"): Promise<boolean> {
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

    cleanup() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop())
        }
        this.isListening = false
    }
} 