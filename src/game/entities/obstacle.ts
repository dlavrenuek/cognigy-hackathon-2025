import { k } from "../../kaboom"
import { GAME_CONSTANTS, COLLISION_SHAPES } from "../constants"

// Keep track of the last obstacle's x position
let lastObstacleX = 0

export function createObstacle(index: number) {
    const randomObstacle = GAME_CONSTANTS.OBSTACLE_TYPES[
        Math.floor(Math.random() * GAME_CONSTANTS.OBSTACLE_TYPES.length)
    ]

    // Calculate base position with minimum spacing
    const minSpacing = GAME_CONSTANTS.OBSTACLE_SPACING
    const randomOffset = Math.random() * GAME_CONSTANTS.OBSTACLE_RANDOM_OFFSET

    // Ensure minimum distance from last obstacle
    const baseX = Math.max(
        k.width() / 2 + (minSpacing * (index + 1)) + randomOffset,
        lastObstacleX + minSpacing
    )

    // Update last obstacle position
    lastObstacleX = baseX

    const obstacle = k.add([
        k.sprite(randomObstacle, {
            width: GAME_CONSTANTS.OBSTACLE_SIZE,
            height: GAME_CONSTANTS.OBSTACLE_SIZE,
        }),
        k.anchor("center"),
        k.pos(baseX, GAME_CONSTANTS.PLAYER_START_Y),
        k.area({
            shape: new k.Polygon(COLLISION_SHAPES.OBSTACLE)
        }),
        k.z(1),
        "obstacle",
        {
            startY: GAME_CONSTANTS.PLAYER_START_Y,
            amplitude: 5,
            frequency: 2 + Math.random() * 2,
            speed: GAME_CONSTANTS.GAME_SPEED * 3
        }
    ])

    const oscillate = () => {
        obstacle.pos.y = obstacle.startY + Math.sin(k.time() * obstacle.frequency) * obstacle.amplitude
    }

    const move = () => {
        obstacle.pos.x -= obstacle.speed * k.dt()
    }

    return {
        gameObject: obstacle,
        oscillate,
        move
    }
} 