import { k } from "../kaboom"

export function createEndScene() {
    return k.scene("end", ({ winner }: { winner: string }) => {
        // Convert shark/seal to Bruce/Robbie for display
        const displayName = winner === "shark" ? "BRUCE" : "ROBBIE";

        k.add([
            k.text(`${displayName} WINS!`, { size: 64 }),
            k.pos(k.center()),
            k.anchor("center"),
        ])

        const restartBtn = k.add([
            k.rect(240, 80),
            k.pos(k.center().add(0, 200)),
            k.anchor("center"),
            k.area(),
            k.color(0, 255, 0),
        ])

        k.add([
            k.text("Play Again", { size: 32 }),
            k.pos(k.center().add(0, 200)),
            k.anchor("center"),
        ])

        restartBtn.onClick(() => {
            k.go("start")
        })
    })
} 