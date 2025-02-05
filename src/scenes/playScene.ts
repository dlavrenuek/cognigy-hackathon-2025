import { k } from "../kaboom"

export function createPlayScene() {
    return k.scene("play", () => {
        // Game state
        const GAME_SPEED = 200
        let cameraPos = 0

        // Split screen setup
        const splitLine = k.add([
            k.rect(4, k.height()),
            k.pos(k.width() / 2, 0),
            k.color(0, 0, 0),
            k.fixed(),
        ])

        // Background (can be expanded later)
        const bg = k.add([
            k.rect(k.width() * 3, k.height()), // Make bg wider than screen
            k.pos(0, 0),
            k.color(0, 200, 255),
            k.z(-1),
        ])

        // Player setup with fixed positions
        const shark = k.add([
            k.sprite("shark"),
            k.pos(k.width() * 0.25, k.height() / 2), // Fixed position on left side
            k.area(),
            k.scale(0.5),
            k.fixed(),
            "shark",
            {
                speed: GAME_SPEED,
            },
        ])

        const seal = k.add([
            k.sprite("seal"),
            k.pos(k.width() * 0.75, k.height() / 2), // Fixed position on right side
            k.area(),
            k.scale(0.5),
            k.fixed(),
            "seal",
            {
                speed: GAME_SPEED,
            },
        ])

        // Basic movement (temporary)
        k.onKeyPress("space", () => {
            shark.jump()
            seal.jump()
        })

        // Game loop
        k.onUpdate(() => {
            // Move camera/scene instead of characters
            cameraPos += GAME_SPEED * k.dt()
            k.camPos(k.vec2(cameraPos, k.height() / 2))

            // Check win conditions - now based on camera position
            if (cameraPos >= k.width() * 2) { // Example end point
                k.go("end", { winner: "seal" })
            }

            // Can add logic here for shark catching up to seal
            // For example, if shark's relative position catches up to seal's
        })
    })
} 