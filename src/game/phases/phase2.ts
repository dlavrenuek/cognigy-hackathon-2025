import { k } from "../../kaboom"

export function createPhase2(
    existingObjects: {
        shark: any,
        seal: any,
        waves: any,
        background: any
    }
) {
    const { shark, seal, waves, background } = existingObjects

    const update = () => {
        // Camera follows midpoint between players
        const midPoint = (shark.gameObject.pos.x + seal.gameObject.pos.x) / 2
        k.camPos(k.vec2(midPoint, k.height() / 2))

        waves.oscillate()
        waves.move()

            // Update players
            ;[shark, seal].forEach(player => {
                player.updatePhysics()
                if (!player.gameObject.isJumping) {
                    player.oscillate()
                }
                player.move()
            })

        // Check if shark caught up with seal
        if (shark.gameObject.pos.x >= seal.gameObject.pos.x - 50) {
            return "shark" // Shark wins
        }

        // Check if seal escaped (arbitrary distance)
        if (seal.gameObject.pos.x - shark.gameObject.pos.x > k.width() * 2) {
            return "seal" // Seal wins
        }

        return null // Game continues
    }

    const cleanup = () => {
        background.gameObjects.forEach(obj => obj.destroy())
        waves.gameObjects.forEach(obj => obj.destroy())
        shark.gameObject.destroy()
        seal.gameObject.destroy()
    }

    return {
        shark,
        seal,
        update,
        cleanup
    }
} 