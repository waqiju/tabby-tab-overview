import { Subscription } from 'rxjs'
import { AppService, BaseTabComponent } from 'tabby-core'
import { renderTabThumbnail } from './renderer'
import { extractTabTerminalInfo, isTabOverviewTab } from './types'

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
    onDismiss?: () => void
    onPin?: () => void
    isKeyboardActive?: () => boolean
}

export class TabOverviewView {
    private rootEl: HTMLElement | null = null
    private gridEl: HTMLElement | null = null
    private countEl: HTMLElement | null = null
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
        topbar.appendChild(titleWrap)

        if (this.options.mode === 'overlay') {
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
    }

    setPaused(paused: boolean): void {
        if (this.paused === paused) {
            return
        }
        this.paused = paused
        if (paused) {
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
        if (this.rootEl) {
            this.rootEl.remove()
            this.rootEl = null
        }
        this.gridEl = null
        this.countEl = null
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

        if (this.options.mode === 'tab') {
            const target = e.target
            if (
                target instanceof HTMLInputElement ||
                (target instanceof HTMLTextAreaElement && !target.classList.contains('xterm-helper-textarea'))
            ) {
                return
            }
        }

        const consume = () => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
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
