import { AudioHandler } from "../audioHandler"
import { k } from "../kaboom"

interface PlayerZone {
    container: any;
    waveform: any;
    label: any;
    status: any;
    testButton: any;
    testButtonText: any;
    testingLoop?: number;
}

export function createStartScene() {
    return k.scene("start", () => {
        const DEBUG_SKIP_CALIBRATION = true;
        const audioHandler = new AudioHandler();

        if (DEBUG_SKIP_CALIBRATION) {
            audioHandler.setDummyProfile('shark');
            audioHandler.setDummyProfile('seal');
        }

        let currentPlayer: 'shark' | 'seal' | null = null;
        const SAMPLES_NEEDED = 5;
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
        function createPlayerZone(x: number, player: 'shark' | 'seal'): PlayerZone {
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

            const testButton = k.add([
                k.rect(200, 50),
                k.pos(x, k.height() * 0.5 + (zoneHeight * 0.45)),
                k.anchor("center"),
                k.area(),
                k.color(k.rgb(100, 100, 100)),
                k.opacity(0),
            ]);

            const testButtonText = k.add([
                k.text("Test Sound", { size: 24 }),
                k.pos(x, k.height() * 0.5 + (zoneHeight * 0.45)),
                k.anchor("center"),
                k.opacity(0),
            ]);

            // Move status text up a bit to make room for test button
            const status = k.add([
                k.text("Click to calibrate", { size: 24 }),
                k.pos(x, k.height() * 0.5 + (zoneHeight * 0.35)),
                k.anchor("center"),
            ]);

            return { container, waveform, label, status, testButton, testButtonText };
        }

        const sharkZone = createPlayerZone(k.width() / 3 - 50, "shark");
        const sealZone = createPlayerZone((k.width() / 3) * 2 + 50, "seal");

        // Calibration logic
        async function startCalibration(player: 'shark' | 'seal') {
            if (currentPlayer) return;

            const zone = player === 'shark' ? sharkZone : sealZone;
            zone.testButton.opacity = 0;
            zone.testButtonText.opacity = 0;

            currentPlayer = player;
            let sampleCount = 0;

            zone.container.color = COLORS[player];
            zone.status.text = "Make your sound!";

            await audioHandler.setupMicrophone(player);
            audioHandler.startCalibration();

            const calibrationLoop = setInterval(async () => {
                const sample = await audioHandler.captureCalibrationSample();

                if (sample) {
                    updateWaveform(zone.waveform, sample);
                    sampleCount++;

                    if (sampleCount >= SAMPLES_NEEDED) {
                        clearInterval(calibrationLoop);
                        const success = audioHandler.finishCalibration(player);

                        if (success) {
                            zone.status.text = "Calibration complete! ✓";
                            zone.testButton.opacity = 1;
                            zone.testButtonText.opacity = 1;
                        } else {
                            zone.status.text = "Failed - Try again";
                            zone.container.color = COLORS.inactive;
                        }

                        currentPlayer = null;
                    } else {
                        zone.status.text = `Got ${sampleCount} of 5 samples!\nWait... Now make your sound again!`;
                        // Add visual feedback for the waiting period
                        zone.container.color = COLORS.inactive;
                        setTimeout(() => {
                            if (currentPlayer === player) {  // Only if still calibrating
                                zone.container.color = COLORS[player];
                                zone.status.text = "Make your sound!";
                            }
                        }, 500);  // Match MIN_SAMPLE_GAP
                    }
                }
            }, 16);
        }

        function createFeedbackEffect(x: number, y: number, isGood: boolean) {
            const size = 40;
            const effect = k.add([
                k.circle(size),
                k.pos(x, y),
                k.anchor("center"),
                k.color(isGood ? k.rgb(0, 255, 0) : k.rgb(255, 0, 0)),
                k.opacity(0.8),
            ]);

            // Animate the effect
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

            // Remove the effect after animation
            k.wait(0.5, () => {
                effect.destroy();
            });
        }

        function startTestingLoop(player: 'shark' | 'seal', zone: any) {
            if (zone.testingLoop) {
                clearInterval(zone.testingLoop);
                zone.testingLoop = null;
                zone.testButton.color = k.rgb(100, 100, 100);
                zone.testButtonText.text = "Test Sound";
                zone.status.text = "Calibration complete! ✓";
                return;
            }

            zone.testButton.color = k.rgb(200, 50, 50);
            zone.testButtonText.text = "Stop Test";
            zone.status.text = "Make your sound!";

            let lastMatchTime = 0;
            const FEEDBACK_COOLDOWN = 300; // ms between feedback effects

            const testingLoop = setInterval(() => {
                const matchScore = audioHandler.testAudioMatch(player);
                const now = Date.now();

                // Update waveform color based on match score
                zone.waveform.color = matchScore > 0
                    ? k.rgb(
                        COLORS[player].r,
                        COLORS[player].g,
                        COLORS[player].b,
                        matchScore
                    )
                    : k.rgb(200, 200, 200);

                // Create feedback effects with cooldown
                if (now - lastMatchTime > FEEDBACK_COOLDOWN) {
                    if (matchScore > 0.6) {
                        createFeedbackEffect(zone.container.pos.x, zone.container.pos.y, true);
                        lastMatchTime = now;
                    } else if (matchScore > 0.2) {
                        createFeedbackEffect(zone.container.pos.x, zone.container.pos.y, false);
                        lastMatchTime = now;
                    }
                }

                // Get current audio for waveform
                const dataArray = new Uint8Array(audioHandler.analyzer.frequencyBinCount);
                audioHandler.analyzer.getByteFrequencyData(dataArray);
                updateWaveform(zone.waveform, Array.from(dataArray));
            }, 50);

            zone.testingLoop = testingLoop;
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
        sharkZone.container.onClick(() => {
            // Don't start calibration if testing or already calibrating
            if (!sharkZone.testingLoop && !currentPlayer) {
                startCalibration('shark');
            }
        });

        sealZone.container.onClick(() => {
            // Don't start calibration if testing or already calibrating
            if (!sealZone.testingLoop && !currentPlayer) {
                startCalibration('seal');
            }
        });

        // Test button handlers
        sharkZone.testButton.onClick(() => {
            // Stop any ongoing calibration before starting test
            if (currentPlayer === 'shark') {
                currentPlayer = null;
            }
            startTestingLoop('shark', sharkZone);
        });

        sealZone.testButton.onClick(() => {
            // Stop any ongoing calibration before starting test
            if (currentPlayer === 'seal') {
                currentPlayer = null;
            }
            startTestingLoop('seal', sealZone);
        });

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
            const bothCalibrated = DEBUG_SKIP_CALIBRATION ||
                (audioHandler.profiles.has('shark') && audioHandler.profiles.has('seal'));
            startBtn.opacity = bothCalibrated ? 1 : 0.5;
            startBtn.area.enabled = bothCalibrated;
        });

        startBtn.onClick(() => {
            if (startBtn.area.enabled) {
                k.go("play", { audioHandler });
            }
        });

        // Update cleanup on scene exit
        k.onSceneLeave(() => {
            if (!startBtn.area.enabled) {
                audioHandler.cleanup();
            }
            if (sharkZone.testingLoop) clearInterval(sharkZone.testingLoop);
            if (sealZone.testingLoop) clearInterval(sealZone.testingLoop);
        });
    });
}
