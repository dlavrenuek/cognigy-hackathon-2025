import { k } from "../kaboom"

export function createStartScene() {
    return k.scene("start", () => {
        const title = k.add([
            k.text("Shark vs Seal", { size: 64 }),
            k.pos(k.center()),
            k.anchor("center"),
        ])

        const instructions = k.add([
            k.text("Test your microphone to begin", { size: 32 }),
            k.pos(k.center().add(0, 100)),
            k.anchor("center"),
        ])

        // Microphone test areas
        function createMicTest(x: number, player: "Shark" | "Seal") {
            const testArea = k.add([
                k.rect(200, 100),
                k.pos(x, 400),
                k.anchor("center"),
                k.outline(4),
                k.area(),
            ])

            k.add([
                k.text(player, { size: 24 }),
                k.pos(x, 350),
                k.anchor("center"),
            ])
        }

        createMicTest(k.width() / 3, "Shark")
        createMicTest((k.width() / 3) * 2, "Seal")

        // Start button
        const startBtn = k.add([
            k.rect(200, 80),
            k.pos(k.center().add(0, 200)),
            k.anchor("center"),
            k.area(),
            k.color(0, 255, 0),
        ])

        k.add([
            k.text("Start Game", { size: 32 }),
            k.pos(k.center().add(0, 200)),
            k.anchor("center"),
        ])

        startBtn.onClick(() => {
            k.go("play")
        })
    })
} 
