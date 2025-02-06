import { k } from "../../kaboom"
import { GAME_CONSTANTS } from "../constants"
import { COLLISION_SHAPES } from "../constants"

export function createPhase2(
    existingObjects: {
        shark: any,
        seal: any,
        waves: any,
        background: any
    }
) {
    const { shark, seal, waves, background } = existingObjects

    // Create island using original sprite dimensions with double size
    const island = k.add([
        k.sprite("island"),  // Use natural sprite dimensions
        k.scale(2),         // Double the size of the sprite
        k.pos(GAME_CONSTANTS.ISLAND_POSITION_X, GAME_CONSTANTS.PLAYER_START_Y - 200),
        k.anchor("center"),
        k.area({
            shape: new k.Polygon(COLLISION_SHAPES.ISLAND)
        }),
        "island"
    ])

    // Add speed boost properties to players
    shark.gameObject.boostTimeLeft = 0
    shark.gameObject.boostTransition = 0
    seal.gameObject.boostTimeLeft = 0
    seal.gameObject.boostTransition = 0

    // Helper function for easing
    const easeInOutQuad = (t: number): number => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    }

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
        // Update speed boosts with smooth transitions
        const updatePlayerSpeed = (player: any, isShark: boolean) => {
            // Only handle boost when jumping for both shark and seal
            if (player.gameObject.isJumping && player.gameObject.boostTimeLeft > 0) {
                // During boost
                player.gameObject.boostTimeLeft -= k.dt()
                player.gameObject.boostTransition = Math.min(1, player.gameObject.boostTransition + k.dt() / GAME_CONSTANTS.BOOST_EASE_DURATION)
            } else {
                // Ending boost - fade out
                player.gameObject.boostTransition = Math.max(0, player.gameObject.boostTransition - k.dt() / GAME_CONSTANTS.BOOST_EASE_DURATION)
            }

            // Calculate speed using easing with different boost amounts for shark and seal
            const boostSpeed = isShark ? GAME_CONSTANTS.SHARK_SPEED_BOOST : GAME_CONSTANTS.SEAL_SPEED_BOOST
            const boostAmount = easeInOutQuad(player.gameObject.boostTransition) * boostSpeed
            player.gameObject.speed = -GAME_CONSTANTS.GAME_SPEED - boostAmount
        }

        // Update both players with their respective boost speeds
        updatePlayerSpeed(shark, true)   // true for shark
        updatePlayerSpeed(seal, false)   // false for seal

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