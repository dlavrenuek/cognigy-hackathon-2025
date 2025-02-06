import { AudioHandler } from "../audioHandler"
import { k } from "../kaboom"
import { FrequencyVisualizer } from "./FrequencyVisualizer"
import { addListener, emit, removeListener } from "../events"

type K = typeof k;

let initialized = false;
const initialize = (k: K) => {
    // Create speech recognition object
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    // Configure recognition
    recognition.continuous = true;        // Keep listening even after results
    recognition.interimResults = true;    // Get results as they come
    recognition.lang = 'en-US';          // Set language

    // Start listening
    recognition.start();

    // Listen for results
    recognition.onresult = (event) => {
        // Get the latest result
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.toLowerCase();
        console.log(transcript)
        // Check for specific words
        if (transcript.includes('shark')) {
            emit("shark")
            console.log('Shark detected!');
        }
        if (transcript.includes('seal') || transcript.includes('see')) {
            emit("seal")
            console.log('Seal detected!');
        }
        if (transcript.includes('start')) {
            emit("start")
            console.log('start detected!');
        }

        // Log confidence level (0 to 1)
        console.log('Confidence:', result[0].confidence);
    };

    // Handle errors
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
    };

    // Restart when it ends
    recognition.onend = () => {
        recognition.start();
    };

    initialized = true;
}

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
            k.opacity(0),
        ]);

        const startBtnText = k.add([
            k.text("Click to Enable Audio", { size: 40 }),
            k.pos(k.center().add(0, k.height() * 0.35)),
            k.anchor("center"),
        ]);

        k.on("start", () => k.go("play"))

        let hasInitialized = false;



        const handleStart = () => k.go("play");

        addListener("start", handleStart);

        k.onSceneLeave(() => {
            removeListener("start", handleStart);
        })


        startBtn.onClick(async () => {

            if (!initialized) {
                initialize(k);
            }


            if (!hasInitialized) {
                // First click: Initialize audio
                startBtnText.destroy();  // Remove the initial text
                const success = await audioHandler.setupMicrophone();
                if (success) {
                    hasInitialized = true;
                    visualizer = new FrequencyVisualizer(audioHandler);
                    startBtn.color = k.rgb(0, 150, 0);
                    startBtn.opacity = 1;
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
