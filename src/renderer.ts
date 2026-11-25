import { BaseTabComponent } from 'tabby-core'
import { extractTabTerminalInfo, XTermBufferCell, XTermTheme } from './types'

const DEFAULT_THEME: Required<Pick<
    XTermTheme,
    | 'foreground'
    | 'background'
    | 'cursor'
    | 'black'
    | 'red'
    | 'green'
    | 'yellow'
    | 'blue'
    | 'magenta'
    | 'cyan'
    | 'white'
    | 'brightBlack'
    | 'brightRed'
    | 'brightGreen'
    | 'brightYellow'
    | 'brightBlue'
    | 'brightMagenta'
    | 'brightCyan'
    | 'brightWhite'
>> = {
    foreground: '#d8dee9',
    background: '#131722',
    cursor: '#88c0d0',
    black: '#2e3440',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#d08770',
    brightGreen: '#b5d19b',
    brightYellow: '#f0d89e',
    brightBlue: '#8fbcbb',
    brightMagenta: '#c7a4c2',
    brightCyan: '#9bd1de',
    brightWhite: '#eceff4',
}

const ANSI_16_KEYS: (keyof typeof DEFAULT_THEME)[] = [
    'black',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
    'white',
    'brightBlack',
    'brightRed',
    'brightGreen',
    'brightYellow',
    'brightBlue',
    'brightMagenta',
    'brightCyan',
    'brightWhite',
]

function paletteIndexToColor(index: number, theme: XTermTheme): string {
    if (index >= 0 && index < 16) {
        const key = ANSI_16_KEYS[index]
        return theme[key] || DEFAULT_THEME[key]
    }
    if (index >= 16 && index <= 231) {
        const c = index - 16
        const bIdx = c % 6
        const gIdx = Math.floor(c / 6) % 6
        const rIdx = Math.floor(c / 36) % 6
        const mapLevel = (v: number) => (v === 0 ? 0 : 55 + v * 40)
        return `rgb(${mapLevel(rIdx)},${mapLevel(gIdx)},${mapLevel(bIdx)})`
    }
    if (index >= 232 && index <= 255) {
        const level = 8 + (index - 232) * 10
        return `rgb(${level},${level},${level})`
    }
    return DEFAULT_THEME.foreground
}

function rgbIntToColor(rgb: number): string {
    const r = (rgb >>> 16) & 0xff
    const g = (rgb >>> 8) & 0xff
    const b = rgb & 0xff
    return `rgb(${r},${g},${b})`
}

function resolveCellColors(
    cell: XTermBufferCell,
    theme: XTermTheme,
): { fg: string; bg: string | null } {
    const defaultFg = theme.foreground || DEFAULT_THEME.foreground
    const defaultBg = theme.background || DEFAULT_THEME.background

    let fg = defaultFg
    if (cell.isFgRGB()) {
        fg = rgbIntToColor(cell.getFgColor())
    } else if (cell.isFgPalette()) {
        fg = paletteIndexToColor(cell.getFgColor(), theme)
    }

    let bg: string | null = null
    if (cell.isBgRGB()) {
        bg = rgbIntToColor(cell.getBgColor())
    } else if (cell.isBgPalette()) {
        bg = paletteIndexToColor(cell.getBgColor(), theme)
    }

    if (cell.isInverse()) {
        const oldFg = fg
        fg = bg ?? defaultBg
        bg = oldFg
    }

    return { fg, bg }
}

function syncCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number; ctx: CanvasRenderingContext2D | null } {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const host = canvas.parentElement
    const cssWidth = Math.max(160, Math.floor(host?.clientWidth || canvas.clientWidth || 360))
    const cssHeight = Math.max(100, Math.floor(host?.clientHeight || canvas.clientHeight || 220))
    const targetW = Math.floor(cssWidth * dpr)
    const targetH = Math.floor(cssHeight * dpr)

    if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
        return { width: cssWidth, height: cssHeight, ctx: null }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { width: cssWidth, height: cssHeight, ctx }
}

function renderPlaceholder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    title: string,
    subtitle: string,
): void {
    ctx.fillStyle = '#151924'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    ctx.strokeRect(12, 12, width - 24, height - 24)

    ctx.fillStyle = '#e5e9f0'
    ctx.font = '600 14px "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title.slice(0, 36), width / 2, height / 2 - 10)

    ctx.fillStyle = '#8892a6'
    ctx.font = '12px "Segoe UI", system-ui, sans-serif'
    ctx.fillText(subtitle, width / 2, height / 2 + 14)
}

export function renderTabThumbnail(tab: BaseTabComponent, canvas: HTMLCanvasElement): void {
    const { width, height, ctx } = syncCanvasSize(canvas)
    if (!ctx) {
        return
    }

    const info = extractTabTerminalInfo(tab)
    const xterm = info.terminalTab?.frontend?.xterm
    if (!xterm || !xterm.buffer?.active) {
        renderPlaceholder(ctx, width, height, info.title, 'Non-terminal tab')
        return
    }

    const theme: XTermTheme = xterm.options?.theme ?? {}
    const bg = theme.background || DEFAULT_THEME.background
    const cursorColor = theme.cursor || DEFAULT_THEME.cursor

    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const cols = Math.max(1, xterm.cols)
    const rows = Math.max(1, xterm.rows)
    const padX = 8
    const padY = 8
    const availW = Math.max(1, width - padX * 2)
    const availH = Math.max(1, height - padY * 2)

    // Preserve a realistic monospace cell ratio (~1 : 2.05) inside the card
    const cellAspect = 0.5
    let cellH = availH / rows
    let cellW = cellH * cellAspect
    if (cellW * cols > availW) {
        cellW = availW / cols
        cellH = cellW / cellAspect
    }

    const gridW = cellW * cols
    const gridH = cellH * rows
    const originX = padX + (availW - gridW) / 2
    const originY = padY + (availH - gridH) / 2

    const fontSize = Math.max(3.5, Math.min(14, cellH * 0.84))
    const fontFamily = xterm.options?.fontFamily || 'Consolas, "Cascadia Mono", monospace'

    const buffer = xterm.buffer.active
    const reusableCell = buffer.getNullCell()
    const baseY = buffer.baseY

    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    let lastFontKey = ''
    let lastAlpha = 1

    for (let row = 0; row < rows; row++) {
        const line = buffer.getLine(baseY + row)
        if (!line) {
            continue
        }

        const y = originY + row * cellH
        const lineLen = Math.min(cols, line.length)

        for (let col = 0; col < lineLen; col++) {
            const cell = line.getCell(col, reusableCell)
            if (!cell) {
                continue
            }

            const charWidth = cell.getWidth()
            if (charWidth === 0) {
                continue
            }

            const { fg, bg: cellBg } = resolveCellColors(cell, theme)
            const x = originX + col * cellW

            if (cellBg) {
                ctx.globalAlpha = 1
                ctx.fillStyle = cellBg
                ctx.fillRect(x, y, cellW * charWidth + 0.4, cellH + 0.4)
            }

            if (cell.isInvisible()) {
                continue
            }

            const chars = cell.getChars()
            if (!chars || chars === ' ') {
                continue
            }

            const alpha = cell.isDim() ? 0.55 : 1
            if (alpha !== lastAlpha) {
                ctx.globalAlpha = alpha
                lastAlpha = alpha
            }

            const bold = cell.isBold() ? 'bold ' : ''
            const italic = cell.isItalic() ? 'italic ' : ''
            const fontKey = `${italic}${bold}${fontSize.toFixed(1)}px ${fontFamily}`
            if (fontKey !== lastFontKey) {
                ctx.font = fontKey
                lastFontKey = fontKey
            }

            ctx.fillStyle = fg
            ctx.fillText(chars, x, y + (cellH - fontSize) * 0.4)
        }
    }

    ctx.globalAlpha = 1

    // Draw cursor block on live screen
    if (
        buffer.cursorX >= 0 &&
        buffer.cursorX < cols &&
        buffer.cursorY >= 0 &&
        buffer.cursorY < rows
    ) {
        const cx = originX + buffer.cursorX * cellW
        const cy = originY + buffer.cursorY * cellH
        ctx.fillStyle = cursorColor
        ctx.globalAlpha = 0.72
        ctx.fillRect(cx, cy, Math.max(2, cellW), Math.max(2, cellH))
        ctx.globalAlpha = 1
    }
}
