import kaboom from "kaboom"

// Initialize and export Kaboom instance
export const k = kaboom({
    width: window.innerWidth,
    height: window.innerHeight,
    background: [0, 180, 255],
    fullscreen: true,
    scale: 1,
})

// Declare k on window for development purposes
declare global {
    interface Window {
        k: typeof k;
    }
}

window.k = k;

// Handle window resizing
window.addEventListener("resize", () => {
    k.setFullscreen(!k.isFullscreen())
}) 