import { k } from "../../kaboom"
import { GAME_CONSTANTS } from "../constants"


export function createClouds() {

    const clouds = Array.from({ length: GAME_CONSTANTS.CLOUDS_CLOUNT }).map((_, i) => {
        const randomness = 0.5 + Math.random();

        return k.add([
            k.sprite("clouds", {
                width: 660 / 2.5,
                height: 390 / 2.5,
            }),
            k.pos(k.width() / 2 * i * randomness, 100 + Math.random() * 50),
            k.scale(randomness),
            k.z(1),
            {
                speed: GAME_CONSTANTS.GAME_SPEED * randomness
            }
        ])
    });


    const move = () => {
        clouds.forEach(clouds => {
            clouds.pos.x -= clouds.speed * k.dt()
        })
    }

    return {
        clouds,
        move
    }
}
