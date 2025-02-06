import { k } from "../../kaboom"
import { GAME_CONSTANTS } from "../constants"

export function createWaves() {
    const waves = Array.from({ length: GAME_CONSTANTS.WAVES_COUNT }).map((_, i) => {
        const wave = k.add([
            k.sprite("waves1", {
                width: GAME_CONSTANTS.SCENE_WIDTH * 5,
                height: 240,
                tiled: true,
            }),
            k.scale(i * 0.08 + 0.2),
            k.pos(
                -k.width() + i * Math.random() * 100,
                200 - GAME_CONSTANTS.PLAYER_START_Y + i * 30
            ),
            k.z(i),
            k.opacity(1 - i * (0.5 / GAME_CONSTANTS.WAVES_COUNT)),
            {
                startY: GAME_CONSTANTS.PLAYER_START_Y + i * i * 3 - 100,
                amplitude: i * 5,
                frequency: Math.random() * 3,
                speed: GAME_CONSTANTS.GAME_SPEED * (0.2 + i * 0.4)
            }
        ])

        return wave
    })

    const oscillate = () => {
        waves.forEach(wave => {
            wave.pos.y = wave.startY + Math.sin(k.time() * wave.frequency) * wave.amplitude
        })
    }

    const move = () => {
        waves.forEach(wave => {
            wave.pos.x -= wave.speed * k.dt()
        })
    }

    return {
        gameObjects: waves,
        oscillate,
        move
    }
} 