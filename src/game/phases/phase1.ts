import { k } from "../../kaboom"
import { GAME_CONSTANTS } from "../constants"
import { createPlayer, PlayerType } from "../entities/player"
import { createObstacle } from "../entities/obstacle"
import { createWaves } from "../entities/waves"
import { createBackground } from "../entities/background"

export function createPhase1() {
    // Create split line
    const splitLine = k.add([
        k.rect(10, k.height()),
        k.pos(GAME_CONSTANTS.SPLIT_LINE_X, 0),
        k.color(255, 255, 255),
        k.fixed(),
        k.z(10)
    ])

    // Create background elements
    const background = createBackground()
    const waves = createWaves()

    // Create players
    const shark = createPlayer({
        type: "shark" as PlayerType,
        startX: -k.width() * 0.4
    })
    const seal = createPlayer({
        type: "seal" as PlayerType,
        startX: 0
    })

    // Create obstacles
    const obstacles = Array.from({ length: GAME_CONSTANTS.OBSTACLE_COUNT })
        .map((_, i) => createObstacle(i))

    let cameraPos = 0
    let isTransitioning = false
    let transitionStartPos = 0
    let transitionProgress = 0

    const update = () => {
        if (!isTransitioning) {
            cameraPos += GAME_CONSTANTS.GAME_SPEED * k.dt()
            k.camPos(k.vec2(cameraPos, k.height() / 2))
        } else {
            // Smooth transition over 1 second
            transitionProgress = Math.min(transitionProgress + k.dt(), 1)
            const easedProgress = easeInOutCubic(transitionProgress)

            // Calculate target position (midpoint between players)
            const midPoint = (shark.gameObject.pos.x + seal.gameObject.pos.x) / 2
            const newCamPos = k.lerp(transitionStartPos, midPoint, easedProgress)
            k.camPos(k.vec2(newCamPos, k.height() / 2))
        }

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

        // Update obstacles
        obstacles.forEach(obstacle => {
            obstacle.oscillate()
            obstacle.move()
        })
    }

    const startTransition = () => {
        isTransitioning = true
        transitionStartPos = cameraPos
        transitionProgress = 0
    }

    // Easing function for smooth transition
    const easeInOutCubic = (x: number): number => {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    }

    const cleanup = () => {
        splitLine.destroy()
        background.gameObjects.forEach(obj => obj.destroy())
        waves.gameObjects.forEach(obj => obj.destroy())
        shark.gameObject.destroy()
        seal.gameObject.destroy()
        obstacles.forEach(obstacle => obstacle.gameObject.destroy())
    }

    const isComplete = () => {
        return obstacles.every(obstacle =>
            obstacle.gameObject.pos.x < cameraPos - k.width()
        )
    }

    return {
        shark,
        seal,
        obstacles,
        update,
        cleanup,
        isComplete,
        startTransition
    }
} 