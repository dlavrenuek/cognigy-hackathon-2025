import { AudioHandler } from "../audioHandler";
import { k } from "../kaboom";
import { PlayerZone, PlayerType } from "./types";

export class PlayerZoneManager {
    private currentPlayer: PlayerType | null = null;
    private readonly SAMPLES_NEEDED = 3;
    private readonly COLORS = {
        shark: k.rgb(128, 128, 128),
        seal: k.rgb(139, 69, 19),
        inactive: k.rgb(200, 200, 200)
    };

    constructor(
        private audioHandler: AudioHandler,
        private sharkZone: PlayerZone,
        private sealZone: PlayerZone
    ) {
        this.setupClickHandlers();
    }

    private setupClickHandlers() {
        this.sharkZone.container.onClick(() => {
            if (!this.sharkZone.testingLoop && !this.currentPlayer) {
                this.startCalibration('shark');
            }
        });

        this.sealZone.container.onClick(() => {
            if (!this.sealZone.testingLoop && !this.currentPlayer) {
                this.startCalibration('seal');
            }
        });

        this.setupTestButtonHandlers();
    }

    private setupTestButtonHandlers() {
        this.sharkZone.testButton.onClick(() => {
            if (this.currentPlayer === 'shark') {
                this.currentPlayer = null;
            }
            this.startTestingLoop('shark', this.sharkZone);
        });

        this.sealZone.testButton.onClick(() => {
            if (this.currentPlayer === 'seal') {
                this.currentPlayer = null;
            }
            this.startTestingLoop('seal', this.sealZone);
        });
    }

    private async startCalibration(player: PlayerType) {
        if (this.currentPlayer) return;

        const zone = player === 'shark' ? this.sharkZone : this.sealZone;
        zone.testButton.opacity = 0;
        zone.testButtonText.opacity = 0;

        this.currentPlayer = player;
        let sampleCount = 0;

        zone.container.color = this.COLORS[player];
        zone.status.text = "Make your sound!";

        await this.audioHandler.setupMicrophone();
        this.audioHandler.startCalibration();

        const calibrationLoop = setInterval(async () => {
            const sample = await this.audioHandler.captureCalibrationSample();

            if (sample) {
                this.updateWaveform(zone.waveform, sample, player);
                sampleCount++;

                if (sampleCount >= this.SAMPLES_NEEDED) {
                    clearInterval(calibrationLoop);
                    const success = this.audioHandler.finishCalibration(player);

                    if (success) {
                        zone.status.text = "Calibration complete! ✓";
                        zone.testButton.opacity = 1;
                        zone.testButtonText.opacity = 1;
                    } else {
                        zone.status.text = "Failed - Try again";
                        zone.container.color = this.COLORS.inactive;
                    }

                    this.currentPlayer = null;
                } else {
                    zone.status.text = `Got ${sampleCount} of 5 samples!\nWait... Now make your sound again!`;
                    zone.container.color = this.COLORS.inactive;
                    setTimeout(() => {
                        if (this.currentPlayer === player) {
                            zone.container.color = this.COLORS[player];
                            zone.status.text = "Make your sound!";
                        }
                    }, 500);
                }
            }
        }, 16);
    }

    private startTestingLoop(player: PlayerType, zone: PlayerZone) {
        if (zone.testingLoop) {
            clearInterval(zone.testingLoop);
            zone.testButton.color = k.rgb(100, 100, 100);
            zone.testButtonText.text = "Test Sound";
            zone.status.text = "Ready!";
            zone.testingLoop = undefined;
            return;
        }

        zone.testButton.color = k.rgb(200, 50, 50);
        zone.testButtonText.text = "Stop Test";

        zone.status.text = player === 'shark'
            ? "Make a low growling sound!"
            : "Make a high-pitched bark!";

        let lastMatchTime = 0;
        const FEEDBACK_COOLDOWN = 300;

        zone.testingLoop = setInterval(() => {
            const { frequencies } = this.audioHandler.getFrequencyData();
            this.updateWaveform(zone.waveform, Array.from(frequencies), player);

            const matchScore = this.audioHandler.testAudioMatch(player);
            const now = Date.now();

            if (now - lastMatchTime > FEEDBACK_COOLDOWN) {
                if (matchScore > 0.6) {
                    this.createFeedbackEffect(zone.container.pos.x, zone.container.pos.y, true);
                    lastMatchTime = now;
                } else if (matchScore > 0) {
                    this.createFeedbackEffect(zone.container.pos.x, zone.container.pos.y, false);
                    lastMatchTime = now;
                }
            }
        }, 50);
    }

    private updateWaveform(waveformObj: any, audioData: number[], player: PlayerType) {
        const points = audioData.filter((_, i) => i % 8 === 0);
        const maxHeight = 150;

        const vertices = points.map((value, i) => {
            const x = (i / points.length) * 280;
            const y = (value / 255) * maxHeight;
            return k.vec2(x - 140, y - maxHeight / 2);
        });

        waveformObj.unuse("polygon");
        waveformObj.unuse("rect");
        waveformObj.use(k.polygon(vertices));

        const { shark, seal, isSimultaneous } = this.audioHandler.detectSimultaneousSounds();
        const energy = player === 'shark' ? shark : seal;
        const otherEnergy = player === 'shark' ? seal : shark;

        if (isSimultaneous) {
            waveformObj.color = k.rgb(255, 165, 0);
        } else if (energy > this.audioHandler.ENERGY_THRESHOLD && energy > (otherEnergy * 1.5)) {
            waveformObj.color = k.rgb(0, 255, 0);
        } else {
            waveformObj.color = this.COLORS[player];
        }
    }

    private createFeedbackEffect(x: number, y: number, isGood: boolean) {
        const size = 40;
        const effect = k.add([
            k.circle(size),
            k.pos(x, y),
            k.anchor("center"),
            k.color(isGood ? k.rgb(0, 255, 0) : k.rgb(255, 0, 0)),
            k.opacity(0.8),
        ]);

        k.tween(
            effect.opacity,
            0,
            0.5,
            (val: number) => effect.opacity = val,
            k.easings.linear,
        );

        k.tween(
            size,
            size * 2,
            0.5,
            (val: number) => effect.radius = val,
            k.easings.linear,
        );

        k.wait(0.5, () => {
            effect.destroy();
        });
    }

    cleanup() {
        if (this.sharkZone.testingLoop) clearInterval(this.sharkZone.testingLoop);
        if (this.sealZone.testingLoop) clearInterval(this.sealZone.testingLoop);
    }
} 