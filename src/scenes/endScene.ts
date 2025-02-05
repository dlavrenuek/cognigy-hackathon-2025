import { k } from "../game"

export function createEndScene() {
    return k.scene("end", ({ winner }: { winner: string }) => {
        k.add([
            k.text(`${winner.toUpperCase()} WINS!`, { size: 64 }),
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