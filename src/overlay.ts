import { Subscription } from 'rxjs'
import { AppService, BaseTabComponent } from 'tabby-core'
import { renderTabThumbnail } from './renderer'
import { extractTabTerminalInfo, isTabOverviewTab, RESTORE_ICON_SVG, SAVE_ICON_SVG } from './types'
import { formatDefaultWorkspaceName, WorkspaceService, WorkspaceSummary } from './workspaces'

export const OVERLAY_ID = 'tabby-tab-overview-root'
const STYLE_ID = 'tabby-tab-overview-style'
const REFRESH_INTERVAL_MS = 250

const OVERLAY_CSS = `
.tto-root {
    display: flex;
    flex-direction: column;
    color: #e6edf3;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    user-select: none;
}

.tto-root.tto-mode-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(10, 12, 18, 0.88);
    backdrop-filter: blur(18px) saturate(130%);
    -webkit-backdrop-filter: blur(18px) saturate(130%);
    animation: tabby-overview-fade-in 120ms ease-out;
}

.tto-root.tto-mode-tab {
    position: relative;
    width: 100%;
    height: 100%;
    background: rgba(10, 12, 18, 0.96);
}

@keyframes tabby-overview-fade-in {
    from { opacity: 0; transform: scale(1.015); }
    to { opacity: 1; transform: scale(1); }
}

.tto-root .tto-topbar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 14px 28px 8px 28px;
    flex-shrink: 0;
}

.tto-root .tto-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
}

.tto-root .tto-title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: #f0f4f8;
}

.tto-root .tto-count {
    font-size: 12px;
    color: #8b949e;
}

.tto-root .tto-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.tto-root .tto-divider {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.14);
    flex-shrink: 0;
}

.tto-root .tto-ws-controls {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 4px;
}

.tto-root .tto-pill-btn {
    height: 24px;
    padding: 0 9px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #9ba3ae;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.tto-root .tto-pill-btn svg {
    width: 13px;
    height: 13px;
    display: block;
}

.tto-root .tto-pill-btn:hover,
.tto-root .tto-pill-btn.is-active {
    background: rgba(255, 255, 255, 0.13);
    border-color: rgba(255, 255, 255, 0.22);
    color: #f0f4f8;
}

.tto-root .tto-ws-status {
    font-size: 11px;
    color: #8b949e;
    margin-left: 4px;
    white-space: nowrap;
}

.tto-root .tto-ws-status.is-success {
    color: #7ee787;
}

.tto-root .tto-ws-status.is-error {
    color: #ff7b72;
}

.tto-root .tto-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 100;
    width: 300px;
    background: rgba(20, 25, 36, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.65);
    padding: 12px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}

.tto-root .tto-popover-title {
    font-size: 12px;
    font-weight: 600;
    color: #f0f4f8;
    margin-bottom: 8px;
}

.tto-root .tto-ws-input {
    width: 100%;
    box-sizing: border-box;
    background: rgba(10, 12, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 6px;
    padding: 6px 9px;
    color: #e6edf3;
    font-size: 12px;
    font-family: inherit;
    outline: none;
}

.tto-root .tto-ws-input:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
}

.tto-root .tto-popover-hint {
    font-size: 11px;
    color: #8b949e;
    margin-top: 6px;
}

.tto-root .tto-popover-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
}

.tto-root .tto-btn-primary {
    background: rgba(88, 166, 255, 0.22);
    border-color: rgba(88, 166, 255, 0.45);
    color: #e6edf3;
}

.tto-root .tto-btn-primary:hover {
    background: rgba(88, 166, 255, 0.34);
    color: #ffffff;
}

.tto-root .tto-ws-list {
    max-height: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.tto-root .tto-ws-empty {
    font-size: 12px;
    color: #8b949e;
    padding: 12px 4px;
    text-align: center;
}

.tto-root .tto-ws-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    cursor: pointer;
    transition: background 110ms ease, border-color 110ms ease;
}

.tto-root .tto-ws-item:hover {
    background: rgba(88, 166, 255, 0.14);
    border-color: rgba(88, 166, 255, 0.35);
}

.tto-root .tto-ws-item-main {
    flex: 1;
    min-width: 0;
}

.tto-root .tto-ws-item-name {
    font-size: 12px;
    font-weight: 500;
    color: #e6edf3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tto-root .tto-ws-item-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #8b949e;
    margin-top: 2px;
}

.tto-root .tto-ws-pi-badge {
    font-size: 10px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(163, 190, 140, 0.16);
    color: #b5d19b;
    border: 1px solid rgba(163, 190, 140, 0.3);
}

.tto-root .tto-ws-item-del {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #8b949e;
    font-size: 14px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
}

.tto-root .tto-ws-item-del:hover {
    background: rgba(248, 81, 73, 0.22);
    color: #ff7b72;
}

.tto-root .tto-popover-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 11px;
    color: #8b949e;
}

.tto-root .tto-link-btn {
    background: none;
    border: none;
    padding: 0;
    color: #79c0ff;
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
}

.tto-root .tto-link-btn:hover {
    text-decoration: underline;
}

.tto-root .tto-action-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #c9d1d9;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}

.tto-root .tto-action-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
}

.tto-root .tto-pin-btn:hover {
    background: rgba(88, 166, 255, 0.2);
    border-color: rgba(88, 166, 255, 0.45);
    color: #ffffff;
}

.tto-root .tto-grid {
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
    overflow-y: auto;
    padding: 12px 28px 18px;
    display: grid;
    gap: 18px;
}

.tto-root .tto-grid.is-scrollable .tto-card {
    height: 240px;
}

.tto-root .tto-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    background: rgba(22, 27, 38, 0.92);
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.tto-root .tto-card:hover {
    transform: translateY(-2px);
    border-color: rgba(136, 192, 208, 0.6);
}

.tto-root .tto-card.is-selected {
    border-color: #58a6ff;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.35), 0 14px 32px rgba(0, 0, 0, 0.6);
}

.tto-root .tto-card.is-active .tto-card-header {
    background: rgba(88, 166, 255, 0.14);
}

.tto-root .tto-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
}

.tto-root .tto-index {
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.1);
    color: #c9d1d9;
    font-size: 11px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.tto-root .tto-card.is-selected .tto-index {
    background: #58a6ff;
    color: #0d1117;
}

.tto-root .tto-card-title {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 500;
    color: #e6edf3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tto-root .tto-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(88, 166, 255, 0.18);
    color: #79c0ff;
    border: 1px solid rgba(88, 166, 255, 0.35);
    flex-shrink: 0;
}

.tto-root .tto-badge.is-pane {
    background: rgba(163, 190, 140, 0.16);
    color: #b5d19b;
    border-color: rgba(163, 190, 140, 0.3);
}

.tto-root .tto-card-close {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: #8b949e;
    font-size: 15px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 100ms ease, color 100ms ease;
}

.tto-root .tto-card-close:hover {
    background: rgba(248, 81, 73, 0.22);
    color: #ff7b72;
}

.tto-root .tto-card-body {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    background: #131722;
}

.tto-root .tto-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
}

.tto-root .tto-empty {
    margin: auto;
    color: #8b949e;
    font-size: 14px;
}

.tto-root .tto-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 10px 28px 14px;
    font-size: 12px;
    color: #8b949e;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    flex-wrap: wrap;
}

.tto-root .tto-hint kbd {
    display: inline-block;
    padding: 1px 6px;
    margin-right: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #e6edf3;
    font-family: inherit;
    font-size: 11px;
}
`

interface CardEntry {
    tab: BaseTabComponent
    cardEl: HTMLElement
    titleEl: HTMLElement
    canvasEl: HTMLCanvasElement
    lastTitle: string
}

export interface TabOverviewViewOptions {
    mode: 'overlay' | 'tab'
    workspaces?: WorkspaceService
    onDismiss?: () => void
    onPin?: () => void
    isKeyboardActive?: () => boolean
}

export class TabOverviewView {
    private rootEl: HTMLElement | null = null
    private gridEl: HTMLElement | null = null
    private countEl: HTMLElement | null = null
    private wsControlsEl: HTMLElement | null = null
    private saveBtnEl: HTMLButtonElement | null = null
    private restoreBtnEl: HTMLButtonElement | null = null
    private wsStatusEl: HTMLElement | null = null
    private wsStatusTimer: number | null = null
    private activePopover: 'save' | 'restore' | null = null
    private popoverEl: HTMLElement | null = null
    private docClickHandler: ((e: MouseEvent) => void) | null = null
    private cards: CardEntry[] = []
    private selectedIndex = 0
    private currentCols = 2
    private paused = false
    private refreshTimer: number | null = null
    private tabsSub: Subscription | null = null
    private activeTabSub: Subscription | null = null
    private titleSubs: Subscription[] = []
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null
    private resizeHandler: (() => void) | null = null

    constructor(
        private app: AppService,
        private options: TabOverviewViewOptions,
    ) {}

    mount(container: HTMLElement): void {
        if (this.rootEl) {
            return
        }

        this.ensureStyle()

        const displayTabs = this.getDisplayTabs()
        const activeIdx = this.app.activeTab ? displayTabs.indexOf(this.app.activeTab) : 0
        this.selectedIndex = activeIdx >= 0 ? activeIdx : 0

        const root = document.createElement('div')
        root.className = `tto-root ${this.options.mode === 'overlay' ? 'tto-mode-overlay' : 'tto-mode-tab'}`
        if (this.options.mode === 'overlay') {
            root.id = OVERLAY_ID
            root.addEventListener('click', (e) => {
                if (e.target === root || e.target === this.gridEl) {
                    this.options.onDismiss?.()
                }
            })
        }

        const topbar = document.createElement('div')
        topbar.className = 'tto-topbar'

        const titleWrap = document.createElement('div')
        titleWrap.className = 'tto-title-wrap'

        const title = document.createElement('span')
        title.className = 'tto-title'
        title.textContent = 'Tab Overview'

        const count = document.createElement('span')
        count.className = 'tto-count'
        this.countEl = count

        titleWrap.appendChild(title)
        titleWrap.appendChild(count)

        let statusEl: HTMLSpanElement | null = null
        if (this.options.workspaces) {
            const wsControls = document.createElement('div')
            wsControls.className = 'tto-ws-controls'

            const saveBtn = document.createElement('button')
            saveBtn.className = 'tto-pill-btn'
            saveBtn.type = 'button'
            saveBtn.title = 'Save Workspace Snapshot (Ctrl+Shift+S)'
            saveBtn.innerHTML = SAVE_ICON_SVG
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                this.togglePopover('save')
            })

            const restoreBtn = document.createElement('button')
            restoreBtn.className = 'tto-pill-btn'
            restoreBtn.type = 'button'
            restoreBtn.title = 'Restore Workspace Snapshot'
            restoreBtn.innerHTML = RESTORE_ICON_SVG
            restoreBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                this.togglePopover('restore')
            })

            statusEl = document.createElement('span')
            statusEl.className = 'tto-ws-status'

            wsControls.appendChild(saveBtn)
            wsControls.appendChild(restoreBtn)

            this.wsControlsEl = wsControls
            this.saveBtnEl = saveBtn
            this.restoreBtnEl = restoreBtn
            this.wsStatusEl = statusEl

            titleWrap.appendChild(wsControls)
        }

        topbar.appendChild(titleWrap)

        if (this.options.mode === 'overlay') {
            if (this.options.workspaces) {
                const divider = document.createElement('span')
                divider.className = 'tto-divider'
                topbar.appendChild(divider)
            }

            const actions = document.createElement('div')
            actions.className = 'tto-actions'

            if (this.options.onPin) {
                const pinBtn = document.createElement('button')
                pinBtn.className = 'tto-action-btn tto-pin-btn'
                pinBtn.type = 'button'
                pinBtn.textContent = 'Pin'
                pinBtn.title = 'Pin as standalone tab'
                pinBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    this.options.onPin?.()
                })
                actions.appendChild(pinBtn)
            }

            const closeBtn = document.createElement('button')
            closeBtn.className = 'tto-action-btn tto-close-overlay'
            closeBtn.type = 'button'
            closeBtn.textContent = 'Esc'
            closeBtn.title = 'Close overview'
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                this.options.onDismiss?.()
            })
            actions.appendChild(closeBtn)

            topbar.appendChild(actions)
        }

        if (statusEl) {
            topbar.appendChild(statusEl)
        }

        const grid = document.createElement('div')
        grid.className = 'tto-grid'
        this.gridEl = grid

        const footer = document.createElement('div')
        footer.className = 'tto-footer'
        const escHint = this.options.mode === 'overlay'
            ? '<span class="tto-hint"><kbd>Esc</kbd> Dismiss</span>'
            : ''
        footer.innerHTML = `
            <span class="tto-hint"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> Navigate</span>
            <span class="tto-hint"><kbd>Enter</kbd> / Click Switch</span>
            <span class="tto-hint"><kbd>1</kbd>-<kbd>9</kbd> Quick Jump</span>
            <span class="tto-hint"><kbd>Del</kbd> Close Tab</span>
            ${escHint}
        `

        root.appendChild(topbar)
        root.appendChild(grid)
        root.appendChild(footer)
        container.appendChild(root)

        this.rootEl = root
        this.rebuildGrid()

        requestAnimationFrame(() => this.refreshThumbnails())
        this.startRefreshTimer()

        this.tabsSub = this.app.tabsChanged$.subscribe(() => {
            if (this.rootEl && !this.paused) {
                this.rebuildGrid()
                requestAnimationFrame(() => this.refreshThumbnails())
            }
        })

        this.activeTabSub = this.app.activeTabChange$.subscribe(() => {
            if (this.rootEl && !this.paused) {
                this.rebuildGrid()
                requestAnimationFrame(() => this.refreshThumbnails())
            }
        })

        this.keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e)
        window.addEventListener('keydown', this.keydownHandler, { capture: true })

        this.resizeHandler = () => {
            if (this.rootEl && !this.paused) {
                requestAnimationFrame(() => this.refreshThumbnails())
            }
        }
        window.addEventListener('resize', this.resizeHandler)

        this.docClickHandler = (e: MouseEvent) => {
            if (!this.activePopover || !this.wsControlsEl) {
                return
            }
            const target = e.target as Node | null
            if (target && this.wsControlsEl.contains(target)) {
                return
            }
            this.closePopover()
        }
        document.addEventListener('click', this.docClickHandler)
    }

    setPaused(paused: boolean): void {
        if (this.paused === paused) {
            return
        }
        this.paused = paused
        if (paused) {
            this.closePopover()
            this.stopRefreshTimer()
            return
        }
        if (this.rootEl) {
            this.rebuildGrid()
            requestAnimationFrame(() => this.refreshThumbnails())
            this.startRefreshTimer()
        }
    }

    destroy(): void {
        this.closePopover()
        if (this.wsStatusTimer !== null) {
            clearTimeout(this.wsStatusTimer)
            this.wsStatusTimer = null
        }
        this.stopRefreshTimer()
        this.clearTitleSubs()
        if (this.tabsSub) {
            this.tabsSub.unsubscribe()
            this.tabsSub = null
        }
        if (this.activeTabSub) {
            this.activeTabSub.unsubscribe()
            this.activeTabSub = null
        }
        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler, { capture: true })
            this.keydownHandler = null
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler)
            this.resizeHandler = null
        }
        if (this.docClickHandler) {
            document.removeEventListener('click', this.docClickHandler)
            this.docClickHandler = null
        }
        if (this.rootEl) {
            this.rootEl.remove()
            this.rootEl = null
        }
        this.gridEl = null
        this.countEl = null
        this.wsControlsEl = null
        this.saveBtnEl = null
        this.restoreBtnEl = null
        this.wsStatusEl = null
        this.cards = []
    }

    private startRefreshTimer(): void {
        if (this.paused || this.refreshTimer !== null) {
            return
        }
        this.refreshTimer = window.setInterval(() => {
            this.refreshThumbnails()
        }, REFRESH_INTERVAL_MS)
    }

    private stopRefreshTimer(): void {
        if (this.refreshTimer !== null) {
            clearInterval(this.refreshTimer)
            this.refreshTimer = null
        }
    }

    private clearTitleSubs(): void {
        for (const sub of this.titleSubs) {
            sub.unsubscribe()
        }
        this.titleSubs = []
    }

    private getDisplayTabs(): BaseTabComponent[] {
        return this.app.tabs.filter(tab => !isTabOverviewTab(tab))
    }

    private ensureStyle(): void {
        const existing = document.getElementById(STYLE_ID)
        if (existing) {
            if (existing.textContent !== OVERLAY_CSS) {
                existing.textContent = OVERLAY_CSS
            }
            return
        }
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = OVERLAY_CSS
        document.head.appendChild(style)
    }

    private computeGridColumns(count: number): number {
        if (count <= 1) return 1
        if (count <= 4) return 2
        if (count <= 9) return 3
        if (count <= 16) return 4
        return 5
    }

    private syncCardTitle(entry: CardEntry): void {
        const { title } = extractTabTerminalInfo(entry.tab)
        if (title !== entry.lastTitle) {
            entry.lastTitle = title
            entry.titleEl.textContent = title
            entry.titleEl.title = title
        }
    }

    private rebuildGrid(): void {
        if (!this.gridEl || !this.countEl) {
            return
        }

        this.clearTitleSubs()

        const tabs = this.getDisplayTabs()
        this.countEl.textContent = `${tabs.length} ${tabs.length === 1 ? 'tab' : 'tabs'}`

        if (this.selectedIndex >= tabs.length) {
            this.selectedIndex = Math.max(0, tabs.length - 1)
        }

        this.currentCols = this.computeGridColumns(tabs.length)
        this.gridEl.style.gridTemplateColumns = `repeat(${this.currentCols}, minmax(0, 1fr))`
        if (tabs.length <= 16 && tabs.length > 0) {
            const rows = Math.ceil(tabs.length / this.currentCols)
            this.gridEl.classList.remove('is-scrollable')
            this.gridEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`
            this.gridEl.style.alignContent = 'stretch'
        } else {
            this.gridEl.classList.add('is-scrollable')
            this.gridEl.style.gridTemplateRows = ''
            this.gridEl.style.alignContent = 'start'
        }
        this.gridEl.innerHTML = ''
        this.cards = []

        if (tabs.length === 0) {
            const empty = document.createElement('div')
            empty.className = 'tto-empty'
            empty.textContent = 'No open tabs'
            this.gridEl.appendChild(empty)
            return
        }

        tabs.forEach((tab, index) => {
            const info = extractTabTerminalInfo(tab)

            const card = document.createElement('div')
            card.className = 'tto-card'
            if (tab === this.app.activeTab) {
                card.classList.add('is-active')
            }
            if (index === this.selectedIndex) {
                card.classList.add('is-selected')
            }

            const header = document.createElement('div')
            header.className = 'tto-card-header'

            const idxBadge = document.createElement('span')
            idxBadge.className = 'tto-index'
            idxBadge.textContent = String(index + 1)

            const titleEl = document.createElement('span')
            titleEl.className = 'tto-card-title'
            titleEl.textContent = info.title
            titleEl.title = info.title

            header.appendChild(idxBadge)
            header.appendChild(titleEl)

            if (info.paneCount > 1) {
                const paneBadge = document.createElement('span')
                paneBadge.className = 'tto-badge is-pane'
                paneBadge.textContent = `${info.paneCount} panes`
                header.appendChild(paneBadge)
            }

            if (tab === this.app.activeTab) {
                const activeBadge = document.createElement('span')
                activeBadge.className = 'tto-badge'
                activeBadge.textContent = 'Active'
                header.appendChild(activeBadge)
            }

            const closeBtn = document.createElement('button')
            closeBtn.className = 'tto-card-close'
            closeBtn.type = 'button'
            closeBtn.textContent = '×'
            closeBtn.title = 'Close tab'
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                void this.closeTabAt(index)
            })
            header.appendChild(closeBtn)

            const body = document.createElement('div')
            body.className = 'tto-card-body'

            const canvas = document.createElement('canvas')
            canvas.className = 'tto-canvas'
            body.appendChild(canvas)

            card.appendChild(header)
            card.appendChild(body)

            card.addEventListener('mouseenter', () => {
                this.setSelectedIndex(index, false)
            })
            card.addEventListener('click', () => {
                this.activateTab(tab)
            })

            this.gridEl!.appendChild(card)
            const entry: CardEntry = {
                tab,
                cardEl: card,
                titleEl,
                canvasEl: canvas,
                lastTitle: info.title,
            }
            this.cards.push(entry)

            if (tab.titleChange$) {
                this.titleSubs.push(
                    tab.titleChange$.subscribe(() => {
                        this.syncCardTitle(entry)
                    }),
                )
            }
        })
    }

    private refreshThumbnails(): void {
        if (!this.rootEl || this.paused) {
            return
        }
        for (const entry of this.cards) {
            this.syncCardTitle(entry)
            renderTabThumbnail(entry.tab, entry.canvasEl)
        }
    }

    private setSelectedIndex(nextIndex: number, scrollIntoView = true): void {
        if (this.cards.length === 0) {
            return
        }
        const clamped = Math.max(0, Math.min(this.cards.length - 1, nextIndex))
        if (clamped === this.selectedIndex && this.cards[clamped]?.cardEl.classList.contains('is-selected')) {
            return
        }
        this.cards[this.selectedIndex]?.cardEl.classList.remove('is-selected')
        this.selectedIndex = clamped
        const targetCard = this.cards[this.selectedIndex]?.cardEl
        if (targetCard) {
            targetCard.classList.add('is-selected')
            if (scrollIntoView) {
                targetCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }

    private activateTab(tab: BaseTabComponent): void {
        this.app.selectTab(tab)
        if (this.options.mode === 'overlay') {
            this.options.onDismiss?.()
        }
    }

    private setWsStatus(text: string, tone: 'neutral' | 'success' | 'error' = 'neutral', autoClearMs = 4000): void {
        if (!this.wsStatusEl) {
            return
        }
        if (this.wsStatusTimer !== null) {
            clearTimeout(this.wsStatusTimer)
            this.wsStatusTimer = null
        }
        this.wsStatusEl.textContent = text
        this.wsStatusEl.classList.remove('is-success', 'is-error')
        if (tone === 'success') {
            this.wsStatusEl.classList.add('is-success')
        } else if (tone === 'error') {
            this.wsStatusEl.classList.add('is-error')
        }
        if (autoClearMs > 0 && text) {
            this.wsStatusTimer = window.setTimeout(() => {
                if (this.wsStatusEl) {
                    this.wsStatusEl.textContent = ''
                    this.wsStatusEl.classList.remove('is-success', 'is-error')
                }
                this.wsStatusTimer = null
            }, autoClearMs)
        }
    }

    private closePopover(): void {
        if (this.popoverEl) {
            this.popoverEl.remove()
            this.popoverEl = null
        }
        this.activePopover = null
        this.saveBtnEl?.classList.remove('is-active')
        this.restoreBtnEl?.classList.remove('is-active')
    }

    private togglePopover(kind: 'save' | 'restore'): void {
        if (this.activePopover === kind) {
            this.closePopover()
            return
        }
        this.closePopover()
        if (!this.wsControlsEl || !this.options.workspaces) {
            return
        }
        this.activePopover = kind
        if (kind === 'save') {
            this.saveBtnEl?.classList.add('is-active')
            this.renderSavePopover()
        } else {
            this.restoreBtnEl?.classList.add('is-active')
            this.renderRestorePopover()
        }
    }

    private renderSavePopover(): void {
        if (!this.wsControlsEl || !this.options.workspaces) {
            return
        }
        const workspaces = this.options.workspaces
        const popover = document.createElement('div')
        popover.className = 'tto-popover'
        popover.addEventListener('click', e => e.stopPropagation())

        const title = document.createElement('div')
        title.className = 'tto-popover-title'
        title.textContent = 'Save Workspace Snapshot'

        const input = document.createElement('input')
        input.className = 'tto-ws-input'
        input.type = 'text'
        input.value = formatDefaultWorkspaceName(new Date())
        input.placeholder = 'Workspace name'

        const tabCount = this.getDisplayTabs().length
        const hint = document.createElement('div')
        hint.className = 'tto-popover-hint'
        hint.textContent = `${tabCount} ${tabCount === 1 ? 'tab' : 'tabs'} will be saved`

        const actions = document.createElement('div')
        actions.className = 'tto-popover-actions'

        const cancelBtn = document.createElement('button')
        cancelBtn.className = 'tto-action-btn'
        cancelBtn.type = 'button'
        cancelBtn.textContent = 'Cancel'
        cancelBtn.addEventListener('click', () => this.closePopover())

        const confirmBtn = document.createElement('button')
        confirmBtn.className = 'tto-action-btn tto-btn-primary'
        confirmBtn.type = 'button'
        confirmBtn.textContent = 'Save'

        const submitSave = async () => {
            confirmBtn.disabled = true
            try {
                const summary = await workspaces.saveWorkspace(input.value)
                this.closePopover()
                this.setWsStatus(`Saved "${summary.name}" ✓`, 'success')
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Save failed'
                this.closePopover()
                this.setWsStatus(message, 'error')
            }
        }

        confirmBtn.addEventListener('click', () => {
            void submitSave()
        })
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                void submitSave()
            } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                this.closePopover()
            }
        })

        actions.appendChild(cancelBtn)
        actions.appendChild(confirmBtn)

        popover.appendChild(title)
        popover.appendChild(input)
        popover.appendChild(hint)
        popover.appendChild(actions)

        this.wsControlsEl.appendChild(popover)
        this.popoverEl = popover

        requestAnimationFrame(() => {
            input.focus()
            input.select()
        })
    }

    private formatSnapshotTime(iso: string): string {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) {
            return iso
        }
        return formatDefaultWorkspaceName(d)
    }

    private renderRestorePopover(): void {
        if (!this.wsControlsEl || !this.options.workspaces) {
            return
        }
        const workspaces = this.options.workspaces
        if (this.popoverEl) {
            this.popoverEl.remove()
            this.popoverEl = null
        }

        const popover = document.createElement('div')
        popover.className = 'tto-popover'
        popover.addEventListener('click', e => e.stopPropagation())

        const title = document.createElement('div')
        title.className = 'tto-popover-title'
        title.textContent = 'Restore Workspace Snapshot'
        popover.appendChild(title)

        const list = document.createElement('div')
        list.className = 'tto-ws-list'

        const summaries: WorkspaceSummary[] = workspaces.listWorkspaces()
        if (summaries.length === 0) {
            const empty = document.createElement('div')
            empty.className = 'tto-ws-empty'
            empty.textContent = 'No saved snapshots yet'
            list.appendChild(empty)
        } else {
            for (const item of summaries) {
                const row = document.createElement('div')
                row.className = 'tto-ws-item'

                const main = document.createElement('div')
                main.className = 'tto-ws-item-main'

                const nameEl = document.createElement('div')
                nameEl.className = 'tto-ws-item-name'
                nameEl.textContent = item.name
                nameEl.title = item.name

                const metaEl = document.createElement('div')
                metaEl.className = 'tto-ws-item-meta'

                const metaText = document.createElement('span')
                metaText.textContent = `${this.formatSnapshotTime(item.createdAt)} · ${item.tabCount} ${item.tabCount === 1 ? 'tab' : 'tabs'}`
                metaEl.appendChild(metaText)

                if (item.piSessionCount > 0) {
                    const piBadge = document.createElement('span')
                    piBadge.className = 'tto-ws-pi-badge'
                    piBadge.textContent = `${item.piSessionCount} pi`
                    metaEl.appendChild(piBadge)
                }

                main.appendChild(nameEl)
                main.appendChild(metaEl)

                const delBtn = document.createElement('button')
                delBtn.className = 'tto-ws-item-del'
                delBtn.type = 'button'
                delBtn.textContent = '×'
                delBtn.title = 'Delete snapshot'
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation()
                    workspaces.deleteWorkspace(item.id)
                    this.renderRestorePopover()
                })

                row.appendChild(main)
                row.appendChild(delBtn)

                row.addEventListener('click', () => {
                    this.closePopover()
                    void this.runRestore(item)
                })

                list.appendChild(row)
            }
        }

        popover.appendChild(list)

        const footer = document.createElement('div')
        footer.className = 'tto-popover-footer'

        const dedupHint = document.createElement('span')
        dedupHint.textContent = 'Appends & skips open tabs'

        const folderBtn = document.createElement('button')
        folderBtn.className = 'tto-link-btn'
        folderBtn.type = 'button'
        folderBtn.textContent = 'Open folder'
        folderBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            workspaces.openWorkspacesFolder()
        })

        footer.appendChild(dedupHint)
        footer.appendChild(folderBtn)
        popover.appendChild(footer)

        this.wsControlsEl.appendChild(popover)
        this.popoverEl = popover
    }

    private async runRestore(item: WorkspaceSummary): Promise<void> {
        const workspaces = this.options.workspaces
        if (!workspaces) {
            return
        }
        this.setWsStatus(`Restoring "${item.name}"…`, 'neutral', 0)
        try {
            const result = await workspaces.restoreWorkspace(item.id, {
                onProgress: (done, total) => {
                    this.setWsStatus(`Restoring ${done}/${total}…`, 'neutral', 0)
                },
            })
            if (result.restored === 0 && result.skippedDuplicates > 0 && result.failed === 0) {
                this.setWsStatus(`All ${result.skippedDuplicates} already open`, 'success')
                return
            }
            const parts = [`Restored ${result.restored}`]
            if (result.skippedDuplicates > 0) {
                parts.push(`${result.skippedDuplicates} skipped`)
            }
            if (result.failed > 0) {
                parts.push(`${result.failed} failed`)
            }
            this.setWsStatus(parts.join(' · '), result.failed > 0 ? 'error' : 'success')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Restore failed'
            this.setWsStatus(message, 'error')
        }
    }

    private async closeTabAt(index: number): Promise<void> {
        const tab = this.getDisplayTabs()[index]
        if (!tab) {
            return
        }
        await this.app.closeTab(tab, true)
        if (this.rootEl && !this.paused) {
            this.rebuildGrid()
            requestAnimationFrame(() => this.refreshThumbnails())
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.rootEl || this.paused) {
            return
        }
        if (this.options.isKeyboardActive && !this.options.isKeyboardActive()) {
            return
        }

        const consume = () => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
        }

        if (this.activePopover) {
            if (e.key === 'Escape') {
                consume()
                this.closePopover()
            }
            return
        }

        if (this.options.mode === 'tab') {
            const target = e.target
            if (
                target instanceof HTMLInputElement ||
                (target instanceof HTMLTextAreaElement && !target.classList.contains('xterm-helper-textarea'))
            ) {
                return
            }
        }

        if (e.key === 'Escape') {
            if (this.options.mode === 'overlay') {
                consume()
                this.options.onDismiss?.()
            }
            return
        }

        if (e.key === 'Enter') {
            consume()
            const target = this.getDisplayTabs()[this.selectedIndex]
            if (target) {
                this.activateTab(target)
            } else if (this.options.mode === 'overlay') {
                this.options.onDismiss?.()
            }
            return
        }

        if (e.key === 'ArrowRight') {
            consume()
            this.setSelectedIndex(this.selectedIndex + 1)
            return
        }

        if (e.key === 'ArrowLeft') {
            consume()
            this.setSelectedIndex(this.selectedIndex - 1)
            return
        }

        if (e.key === 'ArrowDown') {
            consume()
            this.setSelectedIndex(Math.min(this.cards.length - 1, this.selectedIndex + this.currentCols))
            return
        }

        if (e.key === 'ArrowUp') {
            consume()
            this.setSelectedIndex(Math.max(0, this.selectedIndex - this.currentCols))
            return
        }

        if (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace')) {
            consume()
            void this.closeTabAt(this.selectedIndex)
            return
        }

        if (!e.ctrlKey && !e.altKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
            const idx = Number(e.key) - 1
            const displayTabs = this.getDisplayTabs()
            if (idx < displayTabs.length) {
                consume()
                this.activateTab(displayTabs[idx])
            }
        }
    }
}

export class TabOverviewOverlay {
    private view: TabOverviewView | null = null

    constructor(
        private app: AppService,
        private onPin?: () => void,
        private workspaces?: WorkspaceService,
    ) {}

    isOpen(): boolean {
        return this.view !== null
    }

    toggle(): void {
        if (this.isOpen()) {
            this.close()
        } else {
            this.open()
        }
    }

    open(): void {
        if (this.isOpen()) {
            return
        }
        const view = new TabOverviewView(this.app, {
            mode: 'overlay',
            workspaces: this.workspaces,
            onDismiss: () => this.close(),
            onPin: this.onPin,
        })
        this.view = view
        view.mount(document.body)
    }

    close(): void {
        if (!this.view) {
            return
        }
        this.view.destroy()
        this.view = null
        this.app.activeTab?.emitFocused()
    }
}
