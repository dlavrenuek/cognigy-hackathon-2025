import { k } from "../../kaboom"
import { GAME_CONSTANTS } from "../constants"

export function createPhase2(
    existingObjects: {
        shark: any,
        seal: any,
        waves: any,
        background: any
    }
) {
    const { shark, seal, waves, background } = existingObjects

    // Create island (placeholder)
    const island = k.add([
        k.rect(GAME_CONSTANTS.ISLAND_WIDTH, GAME_CONSTANTS.ISLAND_HEIGHT),
        k.pos(GAME_CONSTANTS.ISLAND_POSITION_X, GAME_CONSTANTS.PLAYER_START_Y),
        k.anchor("center"),
        k.color(k.rgb(240, 200, 140)), // Sandy color
        k.area(),
        "island"
    ])

    // Add speed boost properties to players
    shark.gameObject.boostTimeLeft = 0
    seal.gameObject.boostTimeLeft = 0

    // Modify jump function to add speed boost
    const originalSharkJump = shark.jump
    shark.jump = () => {
        originalSharkJump()
        if (shark.gameObject.isJumping) {
            shark.gameObject.boostTimeLeft = GAME_CONSTANTS.JUMP_BOOST_DURATION
        }
    }

    const originalSealJump = seal.jump
    seal.jump = () => {
        originalSealJump()
        if (seal.gameObject.isJumping) {
            seal.gameObject.boostTimeLeft = GAME_CONSTANTS.JUMP_BOOST_DURATION
        }
    }

    // Handle collision between shark and seal
    seal.gameObject.onCollide("shark", () => {
        return "shark" // Shark wins
    })

    // Handle collision between seal and island
    seal.gameObject.onCollide("island", () => {
        return "seal" // Seal wins
    })

    const update = () => {
        // Update speed boosts
        if (shark.gameObject.boostTimeLeft > 0) {
            shark.gameObject.speed = -GAME_CONSTANTS.GAME_SPEED - GAME_CONSTANTS.JUMP_SPEED_BOOST
            shark.gameObject.boostTimeLeft -= k.dt()
        } else {
            shark.gameObject.speed = -GAME_CONSTANTS.GAME_SPEED
        }

        if (seal.gameObject.boostTimeLeft > 0) {
            seal.gameObject.speed = -GAME_CONSTANTS.GAME_SPEED - GAME_CONSTANTS.JUMP_SPEED_BOOST
            seal.gameObject.boostTimeLeft -= k.dt()
        } else {
            seal.gameObject.speed = -GAME_CONSTANTS.GAME_SPEED
        }

        // Camera follows midpoint between players
        const midPoint = (shark.gameObject.pos.x + seal.gameObject.pos.x) / 2
        k.camPos(k.vec2(midPoint, k.height() / 2))

        // Update game objects
        waves.oscillate()
        waves.move()

            ;[shark, seal].forEach(player => {
                player.updatePhysics()
                if (!player.gameObject.isJumping) {
                    player.oscillate()
                }
                player.move()
            })

        // Check win conditions
        // 1. Shark catches seal
        if (shark.gameObject.isColliding(seal.gameObject)) {
            return "shark"
        }

        // 2. Seal reaches island
        if (seal.gameObject.isColliding(island)) {
            return "seal"
        }

        // 3. Seal exits right side
        if (seal.gameObject.pos.x > k.camPos().x + k.width() / 2 + GAME_CONSTANTS.SCREEN_EXIT_MARGIN) {
            return "seal"
        }

        // 4. Shark exits left side
        if (shark.gameObject.pos.x < k.camPos().x - k.width() / 2 - GAME_CONSTANTS.SCREEN_EXIT_MARGIN) {
            return "seal"
        }

        return null // Game continues
    }

    const cleanup = () => {
        background.gameObjects.forEach(obj => obj.destroy())
        waves.gameObjects.forEach(obj => obj.destroy())
        shark.gameObject.destroy()
        seal.gameObject.destroy()
        island.destroy()
    }

    return {
        shark,
        seal,
        update,
        cleanup
    }
} 