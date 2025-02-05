import { AudioHandler } from "../audioHandler";
import { k } from "../kaboom";

export class FrequencyVisualizer {
    private readonly BAR_WIDTH = 4;
    private readonly SPACING = 1;
    private readonly VISUALIZER_WIDTH = 800;
    private readonly VISUALIZER_HEIGHT = 300;
    private bars: any[] = [];
    private detectionText: any;

    constructor(private audioHandler: AudioHandler) {
        // Since audio is already initialized, we can setup immediately
        this.setupVisualizer();
        this.startVisualization();
    }

    private async setupVisualizer() {
        // Background container
        k.add([
            k.rect(this.VISUALIZER_WIDTH, this.VISUALIZER_HEIGHT),
            k.pos(k.center().x, k.height() * 0.5),
            k.anchor("center"),
            k.color(k.rgb(40, 40, 40)),
        ]);

        // Create bars
        const numBars = Math.floor(this.VISUALIZER_WIDTH / (this.BAR_WIDTH + this.SPACING));
        const startX = k.center().x - (this.VISUALIZER_WIDTH / 2) + (this.BAR_WIDTH / 2);
        const centerY = k.height() * 0.5;

        for (let i = 0; i < numBars; i++) {
            const bar = k.add([
                k.rect(this.BAR_WIDTH, 2),
                k.pos(startX + i * (this.BAR_WIDTH + this.SPACING), centerY + this.VISUALIZER_HEIGHT / 2),
                k.anchor("bot"),
                k.color(k.rgb(150, 150, 150)),
            ]);
            this.bars.push(bar);
        }

        // Add detection text display
        this.detectionText = k.add([
            k.text("Listening...", { size: 32 }),
            k.pos(k.center().x, k.height() * 0.7), // Changed from 0.3 to 0.7 to move it lower
            k.anchor("center"),
            k.color(k.rgb(255, 255, 255)),
        ]);
    }

    private async startVisualization() {
        // Remove the setupMicrophone call since it's already done
        k.onUpdate(() => {
            const { frequencies } = this.audioHandler.getFrequencyData();
            const ranges = this.audioHandler.getFrequencyRanges();

            console.log(frequencies);
            console.log(ranges);

            // Track if we detect shark or seal frequencies
            let sharkDetected = false;
            let sealDetected = false;

            // Update each bar
            this.bars.forEach((bar, i) => {
                const freqIndex = Math.floor((i / this.bars.length) * frequencies.length);
                const value = frequencies[freqIndex];
                const freq = (freqIndex / frequencies.length) * (this.audioHandler.getSampleRate() / 2);

                // Set height based on frequency value
                const height = Math.max(2, (value / 255) * this.VISUALIZER_HEIGHT);
                bar.use(k.rect(this.BAR_WIDTH, height));

                // Color based on frequency range
                if (freq >= ranges.shark.min && freq <= ranges.shark.max) {
                    bar.color = k.rgb(255, 100, 100); // Red for shark frequencies
                } else if (freq >= ranges.seal.min && freq <= ranges.seal.max) {
                    bar.color = k.rgb(100, 100, 255); // Blue for seal frequencies
                } else {
                    bar.color = k.rgb(150, 150, 150); // Grey for other frequencies
                }

                // Update detection flags
                if (freq >= ranges.shark.min && freq <= ranges.shark.max && value > 128) {
                    sharkDetected = true;
                }
                if (freq >= ranges.seal.min && freq <= ranges.seal.max && value > 128) {
                    sealDetected = true;
                }
            });

            // Update detection text
            if (sharkDetected && sealDetected) {
                this.detectionText.text = "Detected: Shark and Seal!";
                this.detectionText.color = k.rgb(255, 200, 100);
            } else if (sharkDetected) {
                this.detectionText.text = "Detected: Shark!";
                this.detectionText.color = k.rgb(255, 100, 100);
            } else if (sealDetected) {
                this.detectionText.text = "Detected: Seal!";
                this.detectionText.color = k.rgb(100, 100, 255);
            } else {
                this.detectionText.text = "Listening...";
                this.detectionText.color = k.rgb(255, 255, 255);
            }
        });
    }

    cleanup() {
        this.detectionText.destroy();
        this.bars.forEach(bar => bar.destroy());
    }
} 