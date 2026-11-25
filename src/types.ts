import { BaseTabComponent } from 'tabby-core'

export const GRID_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
  <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2"/>
  <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2"/>
  <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2"/>
  <rect x="9" y="9" width="5.5" height="5.5" rx="1.2"/>
</svg>`

export const SAVE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2.5 3.5a1 1 0 0 1 1-1h7.2L13.5 5.3V12.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/>
  <path d="M5.2 2.5v3.2h4.8V2.5"/>
  <path d="M5 13.5V9.2h6v4.3"/>
</svg>`

export const RESTORE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 4.2v3.3h3.3"/>
  <path d="M3.3 7.5A5.2 5.2 0 1 1 4.4 11.7"/>
  <path d="M8 5.3v3l2 1.2"/>
</svg>`

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
    sendInput?(data: string): void
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

export function isTabOverviewTab(tab: BaseTabComponent | null | undefined): boolean {
    if (!tab) {
        return false
    }
    if ((tab as { isTabOverviewTab?: boolean }).isTabOverviewTab === true) {
        return true
    }
    if (isSplitTab(tab)) {
        const allTabs = tab.getAllTabs()
        return allTabs.length > 0 && allTabs.every(t => (t as { isTabOverviewTab?: boolean }).isTabOverviewTab === true)
    }
    return false
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
