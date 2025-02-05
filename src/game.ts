import kaboom from "kaboom"

// Initialize Kaboom
const k = kaboom({
    width: 1280,
    height: 720,
    background: [0, 180, 255],
})

// Asset loading
k.loadSprite("shark", "sprites/shark.png", {
    sliceX: 1,
    sliceY: 1,
})
loadSprite("seal", "sprites/seal.png")
loadSprite("island", "sprites/island.png")
loadSprite("obstacle", "sprites/obstacle.png")

// Game states
type GameState = "start" | "play" | "end"
let currentState: GameState = "start"

// Game scenes
scene("start", () => {
    const title = add([
        text("Shark vs Seal", { size: 64 }),
        pos(center()),
        anchor("center"),
    ])

    const instructions = add([
        text("Test your microphone to begin", { size: 32 }),
        pos(center().add(0, 100)),
        anchor("center"),
    ])

    // Microphone test areas
    function createMicTest(x: number, player: "Shark" | "Seal") {
        const testArea = add([
            rect(200, 100),
            pos(x, 400),
            anchor("center"),
            outline(4),
            area(),
        ])

        add([
            text(player, { size: 24 }),
            pos(x, 350),
            anchor("center"),
        ])
    }

    createMicTest(width() / 3, "Shark")
    createMicTest((width() / 3) * 2, "Seal")

    // Start button
    const startBtn = add([
        rect(200, 80),
        pos(center().add(0, 200)),
        anchor("center"),
        area(),
        color(0, 255, 0),
    ])

    add([
        text("Start Game", { size: 32 }),
        pos(center().add(0, 200)),
        anchor("center"),
    ])

    startBtn.onClick(() => {
        go("play")
    })
})

scene("play", () => {
    // Split screen setup
    const splitLine = add([
        rect(4, height()),
        pos(width() / 2, 0),
        color(0, 0, 0),
    ])

    // Player setup
    const shark = add([
        sprite("shark"),
        pos(100, height() / 2),
        area(),
        scale(0.5),
        "shark",
        {
            speed: 200,
        },
    ])

    const seal = add([
        sprite("seal"),
        pos(width() - 200, height() / 2),
        area(),
        scale(0.5),
        "seal",
        {
            speed: 200,
        },
    ])

    // Basic movement
    onKeyPress("space", () => {
        // Temporary controls for testing
        shark.jump()
        seal.jump()
    })

    // Game loop
    onUpdate(() => {
        // Move characters automatically
        shark.move(shark.speed, 0)
        seal.move(seal.speed, 0)

        // Check win conditions
        if (shark.pos.x >= seal.pos.x) {
            go("end", { winner: "shark" })
        }
    })
})

scene("end", ({ winner }) => {
    add([
        text(`${winner.toUpperCase()} WINS!`, { size: 64 }),
        pos(center()),
        anchor("center"),
    ])

    const restartBtn = add([
        rect(240, 80),
        pos(center().add(0, 200)),
        anchor("center"),
        area(),
        color(0, 255, 0),
    ])

    add([
        text("Play Again", { size: 32 }),
        pos(center().add(0, 200)),
        anchor("center"),
    ])

    restartBtn.onClick(() => {
        go("start")
    })
})

// Start the game
go("start") 