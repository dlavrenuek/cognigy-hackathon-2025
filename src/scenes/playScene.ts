import { k } from "../kaboom"

export function createPlayScene() {
    return k.scene("play", () => {
        // Game state
        const GAME_SPEED = 200
        const sceneWidth = k.width() * 4;
        const playerStartPosY = k.height() / 2;
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
            k.rect(sceneWidth, k.height()), // Make bg wider than screen
            k.pos(-k.width()/2, 0), // Start one screen width to the left
            k.color(200, 200, 255),
            k.z(-1),
        ])

        const waves: ReturnType<typeof k.add>[] = [];

        // Waves layer
        for (let i = 0; i < 3; i++) {
            waves.push(k.add([
                k.sprite("waves1", {
                    width: sceneWidth * 1.2,  // Same width as background
                    height: 240,  // Take up most of the screen height
                    tiled: true,  // Tile the sprite to fill the area
                }),
                k.pos(-k.width() + i * 50, playerStartPosY + i * 30), // Start at same x as bg, slightly down from top
                k.z(i+1),
                k.opacity(0.7),  // Make slightly transparent
                {
                    startY: playerStartPosY + i * 50,  // Store initial Y position
                    amplitude: Math.random() * 50 - 15,           // How far it moves up/down
                    frequency: Math.random() * 3,          // How fast it moves
                }
            ]))
        }

        // Player setup with fixed positions
        const shark = k.add([
            k.sprite("shark", { 
                width: 200,   // Make sprite fit object width
                height: 200,  // Make sprite fit object height
            }),
            k.pos(k.width() * 0.25 - 100, playerStartPosY),
            k.area(),
            k.width(200),
            k.height(200),
            k.fixed(),
            k.z(1),
            "shark",
            {
                speed: GAME_SPEED,
            },
        ])

        const seal = k.add([
            k.sprite("seal", {
                width: 200,   // Make sprite fit object width
                height: 200,  // Make sprite fit object height
            }),
            k.pos(k.width() * 0.75 - 100, playerStartPosY),
            k.area(),
            k.width(200),
            k.height(200),
            k.fixed(),
            k.z(1),
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

            waves.forEach(wave => {
                wave.pos.y = wave.startY + 
                Math.sin(k.time() * wave.frequency) * wave.amplitude
            });
            // Can add logic here for shark catching up to seal
            // For example, if shark's relative position catches up to seal's
        })
    })
} 