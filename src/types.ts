import { BaseTabComponent } from 'tabby-core'

export interface XTermTheme {
    foreground?: string
    background?: string
    cursor?: string
    black?: string
    red?: string
    green?: string
    yellow?: string
    blue?: string
    magenta?: string
    cyan?: string
    white?: string
    brightBlack?: string
    brightRed?: string
    brightGreen?: string
    brightYellow?: string
    brightBlue?: string
    brightMagenta?: string
    brightCyan?: string
    brightWhite?: string
}

export interface XTermBufferCell {
    getChars(): string
    getWidth(): number
    isBold(): number
    isItalic(): number
    isDim(): number
    isInverse(): number
    isInvisible(): number
    isFgDefault(): boolean
    isFgPalette(): boolean
    isFgRGB(): boolean
    getFgColor(): number
    isBgDefault(): boolean
    isBgPalette(): boolean
    isBgRGB(): boolean
    getBgColor(): number
}

export interface XTermBufferLine {
    length: number
    getCell(x: number, cell?: XTermBufferCell): XTermBufferCell | undefined
}

export interface XTermBuffer {
    readonly cursorX: number
    readonly cursorY: number
    readonly viewportY: number
    readonly baseY: number
    readonly length: number
    getLine(y: number): XTermBufferLine | undefined
    getNullCell(): XTermBufferCell
}

export interface XTermInstance {
    readonly cols: number
    readonly rows: number
    readonly buffer: {
        readonly active: XTermBuffer
    }
    readonly options?: {
        theme?: XTermTheme
        fontFamily?: string
    }
}

export interface TerminalTabLike extends BaseTabComponent {
    frontend?: {
        xterm?: XTermInstance
    }
}

export interface SplitTabLike extends BaseTabComponent {
    getAllTabs(): BaseTabComponent[]
    getFocusedTab(): BaseTabComponent | null
}

export interface TabTerminalInfo {
    terminalTab: TerminalTabLike | null
    paneCount: number
    title: string
}

export function isSplitTab(tab: BaseTabComponent): tab is SplitTabLike {
    const candidate = tab as Partial<SplitTabLike>
    return typeof candidate.getAllTabs === 'function' && typeof candidate.getFocusedTab === 'function'
}

export function isTerminalTab(tab: BaseTabComponent | null | undefined): tab is TerminalTabLike {
    if (!tab) {
        return false
    }
    const candidate = tab as TerminalTabLike
    return Boolean(candidate.frontend && candidate.frontend.xterm && candidate.frontend.xterm.buffer?.active)
}

export function extractTabTerminalInfo(tab: BaseTabComponent): TabTerminalInfo {
    if (isSplitTab(tab)) {
        const allTabs = tab.getAllTabs()
        const focused = tab.getFocusedTab() ?? allTabs[0] ?? null
        const terminalTab = isTerminalTab(focused)
            ? focused
            : (allTabs.find(t => isTerminalTab(t)) as TerminalTabLike | undefined) ?? null
        const title = tab.customTitle || tab.title || focused?.customTitle || focused?.title || 'Terminal'
        return {
            terminalTab,
            paneCount: Math.max(1, allTabs.length),
            title,
        }
    }

    const terminalTab = isTerminalTab(tab) ? tab : null
    const title = tab.customTitle || tab.title || 'Tab'
    return {
        terminalTab,
        paneCount: 1,
        title,
    }
}
