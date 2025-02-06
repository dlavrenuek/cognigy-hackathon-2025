import { k } from "../kaboom"

export const GAME_CONSTANTS = {
    // Game mechanics
    GAME_SPEED: 150,
    JUMP_FORCE: 1000,
    GRAVITY: 2500,
    DEBUG_COLLISIONS: true,

    // Screen layout
    SCENE_WIDTH: k.width() * 4,
    PLAYER_START_Y: k.height() * 0.7,
    SPLIT_LINE_X: k.width() / 3,

    // Wave configuration
    WAVES_COUNT: 7,

    // Background colors
    BG_COLORS: [
        [51, 196, 255],     // Light blue at top
        [77, 204, 255],
        [102, 212, 255],
        [128, 220, 255],
        [153, 228, 255],
        [179, 236, 255]     // Very light blue at bottom
    ],

    // Phase configuration
    PHASE_TRANSITION_BUFFER: k.width() * 0.2, // Extra buffer after last obstacle before phase 2

    // Obstacle configuration
    OBSTACLE_COUNT: 5,
    OBSTACLE_TYPES: ["boulder", "iceberg", "barrel"],
    OBSTACLE_SIZE: 100,
    OBSTACLE_SPACING: k.width() / 1.5, // Base spacing between obstacles
    OBSTACLE_RANDOM_OFFSET: 1000,      // Random additional spacing
}

export const COLLISION_SHAPES = {
    SHARK: [
        k.vec2(-70, 0),     // Left tip
        k.vec2(-40, -30),   // Top fin
        k.vec2(-10, -40),   // Upper body
        k.vec2(30, -25),    // Head top
        k.vec2(70, 0),      // Nose
        k.vec2(30, 25),     // Head bottom
        k.vec2(-10, 40),    // Lower body
        k.vec2(-40, 30),    // Bottom fin
    ],

    SEAL: [
        k.vec2(-70, 0),     // Tail
        k.vec2(-40, -35),   // Upper body
        k.vec2(0, -45),     // Head top
        k.vec2(40, -30),    // Face top
        k.vec2(70, 0),      // Nose
        k.vec2(40, 30),     // Face bottom
        k.vec2(0, 45),      // Head bottom
        k.vec2(-40, 35),    // Lower body
    ],

    OBSTACLE: [
        k.vec2(-40, 0),     // Left
        k.vec2(-30, -35),   // Top-left
        k.vec2(0, -45),     // Top
        k.vec2(30, -35),    // Top-right
        k.vec2(40, 0),      // Right
        k.vec2(30, 35),     // Bottom-right
        k.vec2(0, 45),      // Bottom
        k.vec2(-30, 35),    // Bottom-left
    ]
} 