import { k } from "../kaboom"
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

        if (!result.isFinal) {
            // Check for specific words
            console.log("transcript", transcript)
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
        }
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
        let shark: any = null;
        let seal: any = null;

        // Create UI elements
        k.add([
            k.text("Shark vs Seal", { size: 72 }),
            k.pos(k.center().sub(0, k.height() * 0.4)),
            k.anchor("center"),
        ])

        k.add([
            k.text("Say 'shark' or 'seal' to test!", { size: 32 }),
            k.pos(k.center().sub(0, k.height() * 0.33)),
            k.anchor("center"),
        ])

        // Add shark and seal sprites
        shark = k.add([
            k.sprite("shark"),
            k.pos(k.width() * 0.4, k.height() * 0.5),
            k.anchor("center"),
            k.scale(0.15),
        ]);

        seal = k.add([
            k.sprite("seal"),
            k.pos(k.width() * 0.6, k.height() * 0.5),
            k.anchor("center"),
            k.scale(0.15),
        ]);

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
            k.text("Click to Enable Voice", { size: 40 }),
            k.pos(k.center().add(0, k.height() * 0.35)),
            k.anchor("center"),
        ]);

        // Add jump animations for shark and seal
        const handleShark = () => {
            if (shark) {
                shark.pos.y -= 50;
                k.wait(0.5, () => {
                    if (shark) shark.pos.y += 50;
                });
            }
        };

        const handleSeal = () => {
            if (seal) {
                seal.pos.y -= 50;
                k.wait(0.5, () => {
                    if (seal) seal.pos.y += 50;
                });
            }
        };

        const handleStart = () => k.go("play");

        startBtn.onClick(() => {
            if (!initialized) {
                initialize(k);
                startBtnText.destroy();
                startBtn.opacity = 1;
                k.add([
                    k.text("Start Game", { size: 40 }),
                    k.pos(k.center().add(0, k.height() * 0.35)),
                    k.anchor("center"),
                ]);
            } else {
                k.go("play");
            }
        });

        // Add event listeners
        addListener("shark", handleShark);
        addListener("seal", handleSeal);
        addListener("start", handleStart);

        // Cleanup on scene exit
        k.onSceneLeave(() => {
            removeListener("shark", handleShark);
            removeListener("seal", handleSeal);
            removeListener("start", handleStart);
        });
    });
}
