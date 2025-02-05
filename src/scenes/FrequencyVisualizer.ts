import { AudioHandler } from "../audioHandler";
import { k } from "../kaboom";

export class FrequencyVisualizer {
    private readonly BAR_WIDTH = 4;
    private readonly SPACING = 1;
    private readonly VISUALIZER_WIDTH = 800;
    private readonly VISUALIZER_HEIGHT = 300;
    private bars: any[] = [];

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
    }

    private async startVisualization() {
        // Remove the setupMicrophone call since it's already done
        k.onUpdate(() => {
            const { frequencies } = this.audioHandler.getFrequencyData();
            const ranges = this.audioHandler.getFrequencyRanges();

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
            });
        });
    }

    cleanup() {
        this.bars.forEach(bar => bar.destroy());
    }
} 