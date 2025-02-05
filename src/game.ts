import { k } from "./kaboom"
import { createStartScene } from "./scenes/startScene"
import { createPlayScene } from "./scenes/playScene"
import { createEndScene } from "./scenes/endScene"

// Asset loading
k.loadSprite("shark", "sprites/shark_1.png", {
    sliceX: 1,
    sliceY: 1,
})
k.loadSprite("seal", "sprites/seal.webp")
k.loadSprite("island", "sprites/island.png")
k.loadSprite("obstacle", "sprites/obstacle.png")
k.loadSprite("waves1", "sprites/waves1.png")

// Game states
type GameState = "start" | "play" | "end"
let currentState: GameState = "start"

// Create scenes
createStartScene()
createPlayScene()
createEndScene()

// Start the game
k.go("start") 