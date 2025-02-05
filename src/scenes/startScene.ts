import { AudioHandler } from "../audioHandler"
import { k } from "../kaboom"
import { PlayerZoneManager } from "./PlayerZoneManager"

interface PlayerZone {
    container: any;
    waveform: any;
    label: any;
    status: any;
    testButton: any;
    testButtonText: any;
    testingLoop?: number;
}

function createUIElements() {
    // Title and instructions
    k.add([
        k.text("Shark vs Seal", { size: 72 }),
        k.pos(k.center().sub(0, k.height() * 0.4)),
        k.anchor("center"),
    ])

    k.add([
        k.text("Calibrate each player's voice", { size: 32 }),
        k.pos(k.center().sub(0, k.height() * 0.33)),
        k.anchor("center"),
    ])
}

function createPlayerZone(x: number, player: "shark" | "seal"): PlayerZone {
    const zoneHeight = k.height() * 0.5;
    const container = k.add([
        k.rect(350, zoneHeight),
        k.pos(x, k.height() * 0.5),
        k.anchor("center"),
        k.outline(4),
        k.color(k.rgb(200, 200, 200)), // inactive color
        k.area(),
    ]);

    const waveform = k.add([
        k.rect(330, zoneHeight * 0.8),
        k.pos(x, k.height() * 0.5),
        k.anchor("center"),
        k.color(player === 'shark' ? k.rgb(128, 128, 128) : k.rgb(139, 69, 19)),
        k.opacity(0.5),
    ]);

    const label = k.add([
        k.text(player.toUpperCase(), { size: 32 }),
        k.pos(x, k.height() * 0.5 - (zoneHeight * 0.44)),
        k.anchor("center"),
        k.color(player === 'shark' ? k.rgb(128, 128, 128) : k.rgb(139, 69, 19)),
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

    const status = k.add([
        k.text("Click to calibrate", { size: 24 }),
        k.pos(x, k.height() * 0.5 + (zoneHeight * 0.35)),
        k.anchor("center"),
    ]);

    return { container, waveform, label, status, testButton, testButtonText };
}

function createStartButton(audioHandler: AudioHandler, zones: { shark: PlayerZone, seal: PlayerZone }) {
    const startBtn = k.add([
        k.rect(250, 100),
        k.pos(k.center().add(0, k.height() * 0.35)),
        k.anchor("center"),
        k.area(),
        k.color(k.rgb(0, 100, 0)),
        k.opacity(0.5),
    ]);

    k.add([
        k.text("Start Game", { size: 40 }),
        k.pos(k.center().add(0, k.height() * 0.35)),
        k.anchor("center"),
    ]);

    startBtn.onClick(() => {
        if (startBtn.area.enabled) {
            if (zones.shark.testingLoop) clearInterval(zones.shark.testingLoop);
            if (zones.seal.testingLoop) clearInterval(zones.seal.testingLoop);
            k.go("play", { audioHandler });
        }
    });

    return startBtn;
}

export function createStartScene() {
    return k.scene("start", () => {
        const DEBUG_SKIP_CALIBRATION = true;
        const audioHandler = new AudioHandler();

        if (DEBUG_SKIP_CALIBRATION) {
            audioHandler.setDummyProfile('shark');
            audioHandler.setDummyProfile('seal');
        }

        // Create UI elements
        createUIElements();

        // Create visualization zones
        const sharkZone = createPlayerZone(k.width() / 3 - 50, "shark");
        const sealZone = createPlayerZone((k.width() / 3) * 2 + 50, "seal");

        // Create start button
        const startBtn = createStartButton(audioHandler, { shark: sharkZone, seal: sealZone });

        // Initialize zone manager
        const zoneManager = new PlayerZoneManager(audioHandler, sharkZone, sealZone);

        // Update loop
        k.onUpdate(() => {
            const bothCalibrated = DEBUG_SKIP_CALIBRATION ||
                (audioHandler.profiles.has('shark') && audioHandler.profiles.has('seal'));
            startBtn.opacity = bothCalibrated ? 1 : 0.5;
            startBtn.area.enabled = bothCalibrated;
        });

        // Update cleanup on scene exit
        k.onSceneLeave(() => {
            if (!startBtn.area.enabled) {
                audioHandler.cleanup();
            }
            zoneManager.cleanup();
        });
    });
}
