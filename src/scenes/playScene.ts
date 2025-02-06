import { k } from "../kaboom"
import { addListener, removeListener } from "../events.ts";

type Obj = ReturnType<typeof k.add>;
export function createPlayScene() {
    return k.scene("play", () => {
        // Game state
        const GAME_SPEED = 100
        const sceneWidth = k.width() * 4;
        const playerStartPosY = k.height() * 0.7;  // Move down to 70% of screen height
        const wavesCount = 7;
        let cameraPos = 0
        let phase = 1;
        let isPaused = false;

        // Add after game state constants
        const JUMP_FORCE = 750;
        const GRAVITY = 1200;

        // Add after the game state constants
        const DEBUG_COLLISIONS = true;

        // Split screen setup
        const splitLine = k.add([
            k.rect(10, k.height()),
            k.pos(k.width() / 3, 0),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(10)
        ])

        // Background gradient setup
        const bgColors = [
            [51, 196, 255],     // Light blue at top
            [77, 204, 255],
            [102, 212, 255],
            [128, 220, 255],
            [153, 228, 255],
            [179, 236, 255]     // Very light blue at bottom
        ];

        const bgLayers = bgColors.length;
        const layerHeight = k.height() / bgLayers;


        // Add this helper function before creating objects
        const drawCollisionShape = (obj: Obj) => {
            if (!DEBUG_COLLISIONS) return;

            const area = obj.area;
            if (!area || !area.shape || !(area.shape instanceof k.Polygon)) return;

            const points = area.shape.pts;
            const offset = area.offset || k.vec2(0, 0);

            // Create debug outline
            const outline = k.add([
                {
                    draw() {
                        const pos = obj.pos.add(offset);
                        k.drawLines({
                            pts: [
                                ...points.map((p: k.Vec2) => p.add(pos)),
                                points[0].add(pos)
                            ],
                            pos: k.vec2(0, 0),
                            color: k.rgb(255, 0, 0),
                            width: 2,
                        })
                    },
                },
                k.z(100), // Draw above everything
            ]);

            // Make the outline follow the object
            obj.onDestroy(() => outline.destroy());
        }

        // Create gradient background layers
        for (let i = 0; i < bgLayers; i++) {
            k.add([
                k.rect(sceneWidth, layerHeight),
                k.pos(-k.width() / 2, i * layerHeight * 0.6),
                k.color(...bgColors[i]),
                k.z(-2),
            ])
        }

        const waves: Obj[] = [];;

        // Waves layer
        for (let i = 0; i < wavesCount; i++) {
            waves.push(k.add([
                k.sprite("waves1", {
                    width: sceneWidth * 5,  // Same width as background
                    height: 240,  // Take up most of the screen height
                    tiled: true,  // Tile the sprite to fill the area
                }),
                k.scale(i * 0.08 + 0.2),
                k.pos(-k.width() + i * Math.random() * 100, 200 - playerStartPosY + i * 30), // Start at same x as bg, slightly down from top
                k.z(i),
                k.opacity(1 - i * (0.5 / wavesCount)),  // Make slightly transparent
                {
                    startY: playerStartPosY + i * i * 3 - 100,  // Store initial Y position
                    amplitude: i * 5,           // How far it moves up/down
                    frequency: Math.random() * 3,          // How fast it moves
                    speed: GAME_SPEED * (0.2 + i * 0.4)
                }
            ]))
        }

        // Add this before obstacles creation
        const obstacleTypes = ["boulder", "iceberg", "barrel"];

        // Add obstacles
        const obstacles: Obj[] = [];
        const obstacleCount = 5;

        // Modify the obstacle creation loop
        for (let i = 0; i < obstacleCount; i++) {
            const randomObstacle = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

            obstacles.push(k.add([
                k.sprite(randomObstacle, {
                    width: 100,
                    height: 100,
                }),
                k.anchor("center"),
                k.pos(
                    k.width() / 2 + (sceneWidth / (obstacleCount + 1)) / 1.5 * (i + 1) + Math.random() * 50,
                    playerStartPosY
                ),
                k.area({
                    shape: new k.Polygon([
                        k.vec2(-40, 0),     // Left
                        k.vec2(-30, -35),   // Top-left
                        k.vec2(0, -45),     // Top
                        k.vec2(30, -35),    // Top-right
                        k.vec2(40, 0),      // Right
                        k.vec2(30, 35),     // Bottom-right
                        k.vec2(0, 45),      // Bottom
                        k.vec2(-30, 35),    // Bottom-left
                    ])
                }),
                k.z(1),
                "obstacle",
                {
                    startY: playerStartPosY,
                    amplitude: 5,
                    frequency: 2 + Math.random() * 2,
                    speed: GAME_SPEED * 3
                }
            ]))
            drawCollisionShape(obstacles[obstacles.length - 1]);
        }

        // Modify player setup to include velocity and jumping state
        const shark = k.add([
            k.sprite("shark", {
                width: 200,
                height: 200,
            }),
            k.anchor("center"),
            k.pos(-k.width() * 0.4, playerStartPosY),
            k.area({
                shape: new k.Polygon([
                    k.vec2(-70, 0),     // Left tip
                    k.vec2(-40, -30),   // Top fin
                    k.vec2(-10, -40),   // Upper body
                    k.vec2(30, -25),    // Head top
                    k.vec2(70, 0),      // Nose
                    k.vec2(30, 25),     // Head bottom
                    k.vec2(-10, 40),    // Lower body
                    k.vec2(-40, 30),    // Bottom fin
                ])
            }),
            k.width(200),
            k.height(200),
            k.z(1),
            "shark",
            {
                startY: playerStartPosY,
                amplitude: 10,
                frequency: 3,
                speed: -GAME_SPEED,
                velocity: 0,
                isJumping: false,
            },
        ])
        drawCollisionShape(shark);

        const seal = k.add([
            k.sprite("seal", {
                width: 200,
                height: 200,
            }),
            k.anchor("center"),
            k.pos(0, playerStartPosY),
            k.area({
                shape: new k.Polygon([
                    k.vec2(-70, 0),     // Tail
                    k.vec2(-40, -35),   // Upper body
                    k.vec2(0, -45),     // Head top
                    k.vec2(40, -30),    // Face top
                    k.vec2(70, 0),      // Nose
                    k.vec2(40, 30),     // Face bottom
                    k.vec2(0, 45),      // Head bottom
                    k.vec2(-40, 35),    // Lower body
                ])
            }),
            k.width(200),
            k.height(200),
            k.z(1),
            "seal",
            {
                startY: playerStartPosY,
                amplitude: 10,
                frequency: 5,
                speed: -GAME_SPEED,
                velocity: 0,
                isJumping: false,
            },
        ])
        drawCollisionShape(seal);

        shark.play("idle")
        seal.play("idle")
        // After player setup, before jump function

        // Collision handling
        const handleCollision = (player: Obj, obstacle: Obj) => {
            // Flash the player red
            player.use(k.color(255, 0, 0))

            /*
            obstacle.use(k.color(255, 0, 0))

            k.add([
                k.rect(player.width, player.height),
                k.pos(player.pos.x, player.pos.y),
                k.color(255, 0, 0),
                k.z(-1),
            ])
            
            isPaused = true;
            */

            // Short delay before ending game
            k.wait(0.5, () => {
                // Determine winner (opposite of who hit the obstacle)
                const winner = player.is("shark") ? "seal" : "shark"
                k.go("end", { winner })
            })
        }

        // Add collision detection for shark
        shark.onCollide("obstacle", (obstacle: Obj) => {
            handleCollision(shark, obstacle)
        })

        // Add collision detection for seal
        seal.onCollide("obstacle", (obstacle: Obj) => {
            console.log("collision?", seal.pos, obstacle.pos, k.width());
            handleCollision(seal, obstacle)
        })

        // Implement jump function
        const jump = (player: Obj) => {
            if (!player.isJumping) {
                player.velocity = -JUMP_FORCE;
                player.isJumping = true;
            }
        }

        // Modify the keyboard controls section
        // Remove the env check and enable keyboard controls by default
        k.onKeyPress("left", () => jump(shark));
        k.onKeyPress("right", () => jump(seal));

        // Event listener setup for main control method
        const handleShark = () => jump(shark);
        const handleSeal = () => jump(seal);

        addListener("shark", handleShark);
        addListener("seal", handleSeal);

        // Modify oscillate function to not affect jumping characters
        const oscillate = (obj: Obj) => {
            if (!obj.isJumping) {
                obj.pos.y = obj.startY + Math.sin(k.time() * obj.frequency) * obj.amplitude;
            }
        }

        const move = (obj: Obj) => {
            obj.pos.x -= obj.speed * k.dt()
        }

        // Add physics update function
        const updatePhysics = (player: Obj) => {
            if (player.isJumping) {
                // Apply gravity
                player.velocity += GRAVITY * k.dt();
                player.pos.y += player.velocity * k.dt();

                // Check if landed
                if (player.pos.y >= player.startY) {
                    player.pos.y = player.startY;
                    player.velocity = 0;
                    player.isJumping = false;
                }
            }
        }

        // Game loop
        k.onUpdate(() => {
            if (isPaused) return
            // Move camera/scene instead of characters
            cameraPos += GAME_SPEED * k.dt()
            k.camPos(k.vec2(cameraPos, k.height() / 2))

            // Check win conditions - now based on camera position
            if (cameraPos >= k.width() * 2) { // Example end point
                k.go("end", { winner: "seal" })
            }

            waves.forEach(oscillate);
            waves.forEach(move);

            // Update physics for players
            [shark, seal].forEach(player => {
                updatePhysics(player);
                if (!player.isJumping) {
                    oscillate(player);
                }
                move(player);
            });

            // Update obstacles
            obstacles.forEach(obstacle => {
                oscillate(obstacle);
                move(obstacle);

                // Check if obstacle is off screen and should be destroyed
                if (obstacle.pos.x < cameraPos - k.width()) {
                    obstacle.destroy()
                }
            });

            // Can add logic here for shark catching up to seal
            // For example, if shark's relative position catches up to seal's
        })

        k.onSceneLeave(() => {
            removeListener("shark", handleShark);
            removeListener("seal", handleSeal);
        })


    })
} 