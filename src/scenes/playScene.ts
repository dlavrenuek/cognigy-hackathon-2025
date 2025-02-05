import { k } from "../game"

export function createPlayScene() {
    return k.scene("play", () => {
        // Split screen setup
        const splitLine = k.add([
            k.rect(4, k.height()),
            k.pos(k.width() / 2, 0),
            k.color(0, 0, 0),
        ])

        // Player setup
        const shark = k.add([
            k.sprite("shark"),
            k.pos(100, k.height() / 2),
            k.area(),
            k.scale(0.5),
            "shark",
            {
                speed: 200,
            },
        ])

        const seal = k.add([
            k.sprite("seal"),
            k.pos(k.width() - 200, k.height() / 2),
            k.area(),
            k.scale(0.5),
            "seal",
            {
                speed: 200,
            },
        ])

        // Basic movement
        k.onKeyPress("space", () => {
            // Temporary controls for testing
            shark.jump()
            seal.jump()
        })

        // Game loop
        k.onUpdate(() => {
            // Move characters automatically
            shark.move(shark.speed, 0)
            seal.move(seal.speed, 0)

            // Check win conditions
            if (shark.pos.x >= seal.pos.x) {
                k.go("end", { winner: "shark" })
            }
        })
    })
} 