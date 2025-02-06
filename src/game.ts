import { k } from "./kaboom"
import { createStartScene } from "./scenes/startScene"
import { createPlayScene } from "./scenes/playScene"

// Asset loading
k.loadSprite("shark", "sprites/sharks.png", {
    width: 1000, height: 1000, sliceX: 2, sliceY: 1,
    anims: {
        idle: {
            from: 0,       // First frame index
            to: 1,         // Last frame index
            loop: true,    // Make it loop
            speed: 4,
        }
    }
})
k.loadSprite("seal", "sprites/seals.png", {
    width: 1000, height: 1000, sliceX: 2, sliceY: 1,
    anims: {
        idle: {
            from: 0,       // First frame index
            to: 1,         // Last frame index
            loop: true,    // Make it loop
            speed: 4,
        }
    }
})
k.loadSprite("island", "sprites/island.png")
k.loadSprite("boulder", "sprites/boulder.png")
k.loadSprite("iceberg", "sprites/ice_berg.png")
k.loadSprite("barrel", "sprites/barrel.png")
k.loadSprite("waves1", "sprites/waves1.png")
k.loadSprite("clouds", "sprites/clouds.png")



// Create scenes
createStartScene()
createPlayScene()

// Start the game
k.go("start")

