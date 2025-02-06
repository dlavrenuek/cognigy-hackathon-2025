import { k } from "../../kaboom"
import { GAME_CONSTANTS, COLLISION_SHAPES } from "../constants"

export type PlayerType = "shark" | "seal"

export interface PlayerConfig {
    type: PlayerType
    startX: number
}

export function createPlayer(config: PlayerConfig) {
    const shape = config.type === "shark" ? COLLISION_SHAPES.SHARK : COLLISION_SHAPES.SEAL

    const player = k.add([
        k.sprite(config.type, {
            width: 200,
            height: 200,
        }),
        k.anchor("center"),
        k.pos(config.startX, GAME_CONSTANTS.PLAYER_START_Y),
        k.area({
            shape: new k.Polygon(shape)
        }),
        k.width(200),
        k.height(200),
        k.z(1),
        config.type,
        "player",
        {
            startY: GAME_CONSTANTS.PLAYER_START_Y,
            amplitude: 10,
            frequency: config.type === "shark" ? 3 : 5,
            speed: -GAME_CONSTANTS.GAME_SPEED,
            velocity: 0,
            isJumping: false,
            boostTimeLeft: 0,
            collided: 0
        },
    ])

    player.play("idle")

    const jump = () => {
        if (!player.isJumping) {
            player.velocity = -GAME_CONSTANTS.JUMP_FORCE
            player.isJumping = true
        }
    }

    const updatePhysics = () => {
        if (player.isJumping) {
            player.velocity += GAME_CONSTANTS.GRAVITY * k.dt()
            player.pos.y += player.velocity * k.dt()

            if (player.pos.y >= player.startY) {
                player.pos.y = player.startY
                player.velocity = 0
                player.isJumping = false
            }
        }
    }

    const oscillate = () => {
        if (!player.isJumping) {
            player.pos.y = player.startY + Math.sin(k.time() * player.frequency) * player.amplitude
        }
    }

    const move = () => {
        player.pos.x -= player.speed * k.dt()
    }

    const handleCollision = (obstacle: any) => {
        player.use(k.color(255, 0, 0))
        
        k.wait(0.3, () => {
            player.unuse("color");
        })

        if (player.collided === 0) {
            player.pos.x -= 50;
            player.collided = 1;
        }
        /*
        k.wait(0.5, () => {
            const winner = config.type === "shark" ? "seal" : "shark"
            k.go("end", { winner })
        })
        */
    }

    player.onCollide("obstacle", handleCollision)

    // Add method to check collision with another game object
    const isColliding = (other: any) => {
        return player.isColliding(other)
    }

    return {
        gameObject: player,
        jump,
        updatePhysics,
        oscillate,
        move,
        isColliding
    }
} 