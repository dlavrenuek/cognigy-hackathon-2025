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

    const update = () => {
        cameraPos += GAME_CONSTANTS.GAME_SPEED * k.dt()
        k.camPos(k.vec2(cameraPos, k.height() / 2))

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
        isComplete
    }
} 