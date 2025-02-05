import { k } from "../game"
import { AudioHandler } from "../audioHandler"

export function createStartScene() {
    return k.scene("start", () => {
        const audioHandler = new AudioHandler();
        let currentPlayer: 'shark' | 'seal' | null = null;
        const SAMPLES_NEEDED = 50;
        const SAMPLE_INTERVAL = 100;

        const COLORS = {
            shark: k.rgb(128, 128, 128),
            seal: k.rgb(139, 69, 19),
            inactive: k.rgb(200, 200, 200)
        };

        // Title and instructions - adjust vertical positioning
        k.add([
            k.text("Shark vs Seal", { size: 72 }),
            k.pos(k.center().sub(0, k.height() * 0.25)), // Relative to screen height
            k.anchor("center"),
        ])

        k.add([
            k.text("Calibrate each player's voice", { size: 36 }),
            k.pos(k.center().sub(0, k.height() * 0.18)), // Relative to screen height
            k.anchor("center"),
        ])

        // Create visualization zones
        function createPlayerZone(x: number, player: 'shark' | 'seal') {
            const zoneHeight = k.height() * 0.35; // Relative zone height
            const container = k.add([
                k.rect(350, zoneHeight),
                k.pos(x, k.height() * 0.5), // Center vertically
                k.anchor("center"),
                k.outline(4),
                k.color(COLORS.inactive),
                k.area(),
            ]);

            const waveform = k.add([
                k.rect(330, zoneHeight * 0.8),
                k.pos(x, k.height() * 0.5),
                k.anchor("center"),
                k.color(COLORS[player]),
                k.opacity(0.5),
            ]);

            const label = k.add([
                k.text(player.toUpperCase(), { size: 32 }),
                k.pos(x, k.height() * 0.5 - (zoneHeight * 0.45)),
                k.anchor("center"),
                k.color(COLORS[player]),
            ]);

            const status = k.add([
                k.text("Click to calibrate", { size: 24 }),
                k.pos(x, k.height() * 0.5 + (zoneHeight * 0.4)),
                k.anchor("center"),
            ]);

            return { container, waveform, label, status };
        }

        const sharkZone = createPlayerZone(k.width() / 3 - 50, "shark");
        const sealZone = createPlayerZone((k.width() / 3) * 2 + 50, "seal");

        // Calibration logic
        async function startCalibration(player: 'shark' | 'seal') {
            if (currentPlayer) return;

            currentPlayer = player;
            const zone = player === 'shark' ? sharkZone : sealZone;
            let sampleCount = 0;

            zone.container.color = COLORS[player];
            zone.status.text = "Get ready to make some noise...";

            await audioHandler.setupMicrophone(player);
            audioHandler.startCalibration();

            const calibrationLoop = setInterval(async () => {
                if (sampleCount >= SAMPLES_NEEDED) {
                    clearInterval(calibrationLoop);
                    audioHandler.finishCalibration(player);
                    zone.status.text = "✓ Calibration complete!";
                    currentPlayer = null;
                    return;
                }

                const sample = await audioHandler.captureCalibrationSample();
                updateWaveform(zone.waveform, sample);
                sampleCount++;
                zone.status.text = `Calibrating: ${Math.floor((sampleCount / SAMPLES_NEEDED) * 100)}%`;
            }, SAMPLE_INTERVAL);
        }

        function updateWaveform(waveformObj: any, audioData: number[]) {
            const points = audioData.filter((_, i) => i % 8 === 0);
            const maxHeight = 150;

            // Create waveform vertices
            const vertices = points.map((value, i) => {
                const x = (i / points.length) * 280;
                const y = (value / 255) * maxHeight;
                return k.vec2(x - 140, y - maxHeight / 2); // Center the waveform
            });

            // Remove existing shape components before adding new one
            waveformObj.unuse("polygon");
            waveformObj.unuse("rect");
            waveformObj.use(k.polygon(vertices));
        }

        // Click handlers
        sharkZone.container.onClick(() => startCalibration('shark'));
        sealZone.container.onClick(() => startCalibration('seal'));

        // Adjust start button position
        const startBtn = k.add([
            k.rect(250, 100),
            k.pos(k.center().add(0, k.height() * 0.35)), // Position relative to screen height
            k.anchor("center"),
            k.area(),
            k.color(k.rgb(0, 100, 0)),
            k.opacity(0.5),
        ]);

        const startText = k.add([
            k.text("Start Game", { size: 40 }),
            k.pos(k.center().add(0, k.height() * 0.35)), // Match button position
            k.anchor("center"),
        ]);

        // Update loop
        k.onUpdate(() => {
            const bothCalibrated = audioHandler.profiles.has('shark') &&
                audioHandler.profiles.has('seal');
            startBtn.opacity = bothCalibrated ? 1 : 0.5;
            startBtn.area.enabled = bothCalibrated;
        });

        startBtn.onClick(() => {
            if (startBtn.area.enabled) {
                k.go("play", { audioHandler });
            }
        });

        // Cleanup on scene exit
        k.onSceneLeave(() => {
            if (!startBtn.area.enabled) {
                audioHandler.cleanup();
            }
        });
    });
} 