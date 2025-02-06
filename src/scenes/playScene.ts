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
        let splitLine: any

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

        const handleStart = () => k.go("play");

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
                const transitionComplete = phase1.update()

                if (phase1.isComplete() && !isTransitioning) {
                    isTransitioning = true
                    phase1.startTransition()
                    phase1.splitLine.destroy()
                }

                if (transitionComplete) {
                    // Create phase 2 with existing objects
                    phase2 = createPhase2(phase1)

                    // Don't cleanup phase1 objects since we're reusing them
                    phase1 = null
                    currentPhase = 2
                    isTransitioning = false
                }
            } else if (currentPhase === 2 && phase2) {
                const result = phase2.update()

                if (result) {
                    if (!isPaused) {

                        isPaused = true;
                        addListener("start", handleStart);
    
                        k.add([
                            k.text(`${result.toUpperCase()} WINS!`, { size: 64 }),
                            k.pos(k.center()),
                            k.anchor("center"),
                            k.fixed(),
                            k.z(100),
                        ])
                
                        const restartBtn = k.add([
                            k.rect(240, 80),
                            k.pos(k.center().add(0, 200)),
                            k.anchor("center"),
                            k.area(),
                            k.color(0, 255, 0),
                            k.fixed(),
                            k.z(100),
                        ])
                
                        k.add([
                            k.text("Play Again", { size: 32 }),
                            k.pos(k.center().add(0, 200)),
                            k.anchor("center"),
                            k.fixed(),
                            k.z(100),
                        ])
                
                        restartBtn.onClick(() => {
                            k.go("start")
                        })
                    }

                   // k.go("end", { winner: result })
                }
            }
        })

        // Cleanup on scene exit
        k.onSceneLeave(() => {
            removeListener("shark", handleShark)
            removeListener("seal", handleSeal)
            removeListener("start", handleStart);
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

        // Add easing function if not already present
        function easeInOutCubic(x: number): number {
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
        }
    })
} 