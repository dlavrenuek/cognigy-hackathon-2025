import { k } from "../../kaboom"
import { GAME_CONSTANTS } from "../constants"

export function createBackground() {
    const layerHeight = k.height() / GAME_CONSTANTS.BG_COLORS.length

    const layers = GAME_CONSTANTS.BG_COLORS.map((color, i) => {
        return k.add([
            k.rect(GAME_CONSTANTS.SCENE_WIDTH * 2, layerHeight),
            k.pos(-k.width() / 2, i * layerHeight * 0.6),
            k.color(...color),
            k.z(-2),
        ])
    })

    return {
        gameObjects: layers
    }
} 