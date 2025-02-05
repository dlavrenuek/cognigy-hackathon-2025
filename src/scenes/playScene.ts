import { k } from "../kaboom"

export function createPlayScene() {
    return k.scene("play", () => {
        // Game state
        const GAME_SPEED = 100
        const sceneWidth = k.width() * 4;
        const playerStartPosY = k.height() / 2;
        const wavesCount = 7;
        let cameraPos = 0
        const phase = 1;

        // Add after game state constants
        const JUMP_FORCE = 800;
        const GRAVITY = 1200;

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

        // Create gradient background layers
        for (let i = 0; i < bgLayers; i++) {
            k.add([
                k.rect(sceneWidth, layerHeight),
                k.pos(-k.width()/2, i * layerHeight * 0.6),
                k.color(...bgColors[i]),
                k.z(-2),
            ])
        }

        const waves: ReturnType<typeof k.add>[] = [];;

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
                    startY: playerStartPosY + i*i * 3 - 0,  // Store initial Y position
                    amplitude: i * 5,           // How far it moves up/down
                    frequency: Math.random() * 3,          // How fast it moves
                    speed: GAME_SPEED * (0.2 + i * 0.4)
                }
            ]))
        }

        // Add obstacles
        const obstacles: ReturnType<typeof k.add>[] = [];
        const obstacleCount = 5;
        
        for (let i = 0; i < obstacleCount; i++) {
            obstacles.push(k.add([
                k.sprite("obstacle", {
                    width: 100,
                    height: 100,
                }),
                k.pos(
                    // Space obstacles evenly across the scene
                    k.width() / 2 + (sceneWidth / (obstacleCount + 1)) / 2 * (i + 1) + Math.random() * 50,
                    playerStartPosY
                ),
                k.area(),
                k.z(1),
                "obstacle",
                {
                    startY: playerStartPosY + 60,
                    amplitude: 5,
                    frequency: 2 + Math.random() * 2,
                    speed: GAME_SPEED * 1.2
                }
            ]))
        }

        // Modify player setup to include velocity and jumping state
        const shark = k.add([
            k.sprite("shark", { 
                width: 200,
                height: 200,
            }),
            k.pos(k.width() * 0.33 / 2 - 100, playerStartPosY),
            k.area(),
            k.width(200),
            k.height(200),
            k.fixed(),
            k.z(1),
            "shark",
            {
                startY: playerStartPosY,
                amplitude: 10,
                frequency: 3,
                speed: GAME_SPEED,
                velocity: 0,
                isJumping: false,
            },
        ])

        const seal = k.add([
            k.sprite("seal", {
                width: 200,
                height: 200,
            }),
            k.pos(k.width() * 0.5 - 100, playerStartPosY),
            k.area(),
            k.width(200),
            k.height(200),
            k.fixed(),
            k.z(1),
            "seal",
            {
                startY: playerStartPosY,
                amplitude: 10,
                frequency: 5,
                speed: GAME_SPEED,
                velocity: 0,
                isJumping: false,
            },
        ])

        // Implement jump function
        const jump = (player: ReturnType<typeof k.add>) => {
            if (!player.isJumping) {
                player.velocity = -JUMP_FORCE;
                player.isJumping = true;
            }
        }

        // Basic movement controls
        k.onKeyPress("space", () => {
            jump(shark);
            jump(seal);
        })

        // Modify oscillate function to not affect jumping characters
        const oscillate = (obj: ReturnType<typeof k.add>) => {
            if (!obj.isJumping) {
                obj.pos.y = obj.startY + Math.sin(k.time() * obj.frequency) * obj.amplitude;
            }
        }

        const move = (obj: ReturnType<typeof k.add>) => {
            obj.pos.x -= obj.speed * k.dt()
        }

        // Add physics update function
        const updatePhysics = (player: ReturnType<typeof k.add>) => {
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
            });

            // Update obstacles
            obstacles.forEach(oscillate);
            obstacles.forEach(move);

            // Can add logic here for shark catching up to seal
            // For example, if shark's relative position catches up to seal's
        })
    })
} 