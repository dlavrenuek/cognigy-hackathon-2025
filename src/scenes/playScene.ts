import { k } from "../kaboom"
import { addListener, removeListener } from "../events"
import { createPhase1 } from "../game/phases/phase1"
import { createPhase2 } from "../game/phases/phase2"
import { GAME_CONSTANTS } from "../game/constants"

export function createPlayScene() {
    return k.scene("play", () => {
        let currentPhase = 1
        let phase1: ReturnType<typeof createPhase1> | null = null
        let phase2: ReturnType<typeof createPhase2> | null = null
        let isPaused = false
        let isTransitioning = false
        let transitionTimer = 0
        let nextPhasePositions: { sharkX: number, sealX: number } | null = null

        // Create phase 1
        phase1 = createPhase1()

        // Set up controls
        const handleShark = () => {
            if (currentPhase === 1) {
                phase1?.shark.jump()
            } else {
                phase2?.shark.jump()
            }
        }
        const handleSeal = () => {
            if (currentPhase === 1) {
                phase1?.seal.jump()
            } else {
                phase2?.seal.jump()
            }
        }

        k.onKeyPress("left", handleShark)
        k.onKeyPress("right", handleSeal)
        addListener("shark", handleShark)
        addListener("seal", handleSeal)

        // Debug collision shapes if enabled
        if (GAME_CONSTANTS.DEBUG_COLLISIONS) {
            phase1.obstacles.forEach(obstacle => {
                drawCollisionShape(obstacle.gameObject)
            })
            drawCollisionShape(phase1.shark.gameObject)
            drawCollisionShape(phase1.seal.gameObject)
        }

        // Game loop
        k.onUpdate(() => {
            if (isPaused) return

            if (currentPhase === 1 && phase1) {
                phase1.update()

                if (phase1.isComplete() && !isTransitioning) {
                    // Start transition to phase 2
                    isTransitioning = true
                    phase1.startTransition()
                    // Store positions for later use
                    nextPhasePositions = {
                        sharkX: phase1.shark.gameObject.pos.x,
                        sealX: phase1.seal.gameObject.pos.x
                    }
                }

                if (isTransitioning) {
                    transitionTimer += k.dt()
                    if (transitionTimer >= 1) {
                        // Complete transition after 1 second
                        currentPhase = 2
                        // Clean up phase 1 first
                        phase1.cleanup()
                        phase1 = null
                        // Then create phase 2
                        if (nextPhasePositions) {
                            phase2 = createPhase2(
                                nextPhasePositions.sharkX,
                                nextPhasePositions.sealX
                            )
                            // Add debug collision shapes if needed
                            if (GAME_CONSTANTS.DEBUG_COLLISIONS) {
                                drawCollisionShape(phase2.shark.gameObject)
                                drawCollisionShape(phase2.seal.gameObject)
                            }
                        }
                        isTransitioning = false
                        nextPhasePositions = null
                    }
                }
            } else if (currentPhase === 2 && phase2) {
                const result = phase2.update()
                if (result) {
                    k.go("end", { winner: result })
                }
            }
        })

        // Cleanup on scene exit
        k.onSceneLeave(() => {
            removeListener("shark", handleShark)
            removeListener("seal", handleSeal)
            phase1?.cleanup()
            phase2?.cleanup()
        })

        // Helper function for debug collision shapes
        function drawCollisionShape(obj: any) {
            if (!GAME_CONSTANTS.DEBUG_COLLISIONS) return

            const area = obj.area
            if (!area || !area.shape || !(area.shape instanceof k.Polygon)) return

            const points = area.shape.pts
            const offset = area.offset || k.vec2(0, 0)

            const outline = k.add([
                {
                    draw() {
                        const pos = obj.pos.add(offset)
                        k.drawLines({
                            pts: [
                                ...points.map((p: any) => p.add(pos)),
                                points[0].add(pos)
                            ],
                            pos: k.vec2(0, 0),
                            color: k.rgb(255, 0, 0),
                            width: 2,
                        })
                    },
                },
                k.z(100),
            ])

            obj.onDestroy(() => outline.destroy())
        }
    })
} 