

let backgroundPlaying = false;

export const startBackgroundMusic = () => {
    if (!backgroundPlaying) {
        const audio = new Audio('sounds/background-music.mp3');
        audio.loop = true;
        audio.play().catch(e => console.log("Audio play failed:", e));
        backgroundPlaying = true;
    }
}

export const playJumpSound = () => {
    const audio = new Audio('sounds/retro-jump.mp3');
    audio.volume = 0.1;
    audio.play().catch(e => console.log("Audio play failed:", e));
}