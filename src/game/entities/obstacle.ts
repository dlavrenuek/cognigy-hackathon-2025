import { k } from "../../kaboom"
import { GAME_CONSTANTS, COLLISION_SHAPES } from "../constants"

export function createObstacle(index: number) {
    const randomObstacle = GAME_CONSTANTS.OBSTACLE_TYPES[
        Math.floor(Math.random() * GAME_CONSTANTS.OBSTACLE_TYPES.length)
    ]

    const baseX = k.width() / 2 +
        (GAME_CONSTANTS.OBSTACLE_SPACING * (index + 1)) +
        Math.random() * GAME_CONSTANTS.OBSTACLE_RANDOM_OFFSET

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