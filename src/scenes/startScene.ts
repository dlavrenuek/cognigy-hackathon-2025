import { AudioHandler } from "../audioHandler"
import { k } from "../kaboom"
import { FrequencyVisualizer } from "./FrequencyVisualizer"

export function createStartScene() {
    return k.scene("start", () => {
        const audioHandler = new AudioHandler();
        let visualizer: FrequencyVisualizer | null = null;

        // Create UI elements
        k.add([
            k.text("Shark vs Seal", { size: 72 }),
            k.pos(k.center().sub(0, k.height() * 0.4)),
            k.anchor("center"),
        ])

        k.add([
            k.text("Make sounds to test!", { size: 32 }),
            k.pos(k.center().sub(0, k.height() * 0.33)),
            k.anchor("center"),
        ])

        k.add([
            k.text("Low growl = Shark (red)", { size: 24 }),
            k.pos(k.center().sub(0, k.height() * 0.25)),
            k.anchor("center"),
            k.color(k.rgb(255, 100, 100)),
        ])

        k.add([
            k.text("High bark = Seal (blue)", { size: 24 }),
            k.pos(k.center().sub(0, k.height() * 0.2)),
            k.anchor("center"),
            k.color(k.rgb(100, 100, 255)),
        ])

        // Create start button
        const startBtn = k.add([
            k.rect(250, 100),
            k.pos(k.center().add(0, k.height() * 0.35)),
            k.anchor("center"),
            k.area(),
            k.color(k.rgb(0, 100, 0)),
            k.opacity(1),
        ]);

        k.add([
            k.text("Click to Enable Audio", { size: 40 }),
            k.pos(k.center().add(0, k.height() * 0.35)),
            k.anchor("center"),
        ]);

        let hasInitialized = false;

        startBtn.onClick(async () => {
            if (!hasInitialized) {
                // First click: Initialize audio
                const success = await audioHandler.setupMicrophone();
                if (success) {
                    hasInitialized = true;
                    visualizer = new FrequencyVisualizer(audioHandler);
                    startBtn.color = k.rgb(0, 150, 0);
                    // Update button text
                    k.add([
                        k.text("Start Game", { size: 40 }),
                        k.pos(k.center().add(0, k.height() * 0.35)),
                        k.anchor("center"),
                    ]);
                } else {
                    // Show error message if microphone setup fails
                    k.add([
                        k.text("Please allow microphone access to play", { size: 24 }),
                        k.pos(k.center().add(0, k.height() * 0.45)),
                        k.anchor("center"),
                        k.color(k.rgb(255, 100, 100)),
                    ]);
                }
            } else {
                // Second click: Start the game
                k.go("play", { audioHandler });
            }
        });

        // Cleanup on scene exit
        k.onSceneLeave(() => {
            if (visualizer) {
                visualizer.cleanup();
            }
        });
    });
}
