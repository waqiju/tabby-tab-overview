import { Subscription } from 'rxjs'
import { AppService, BaseTabComponent } from 'tabby-core'
import { renderTabThumbnail } from './renderer'
import { extractTabTerminalInfo } from './types'

const OVERLAY_ID = 'tabby-tab-overview-root'
const STYLE_ID = 'tabby-tab-overview-style'
const REFRESH_INTERVAL_MS = 250

const OVERLAY_CSS = `
#${OVERLAY_ID} {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    background: rgba(10, 12, 18, 0.88);
    backdrop-filter: blur(18px) saturate(130%);
    -webkit-backdrop-filter: blur(18px) saturate(130%);
    color: #e6edf3;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    user-select: none;
    animation: tabby-overview-fade-in 120ms ease-out;
}

@keyframes tabby-overview-fade-in {
    from { opacity: 0; transform: scale(1.015); }
    to { opacity: 1; transform: scale(1); }
}

#${OVERLAY_ID} .tto-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 156px 8px 28px;
    flex-shrink: 0;
}

#${OVERLAY_ID} .tto-title-wrap {
    display: flex;
    align-items: baseline;
    gap: 12px;
}

#${OVERLAY_ID} .tto-title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: #f0f4f8;
}

#${OVERLAY_ID} .tto-count {
    font-size: 12px;
    color: #8b949e;
}

#${OVERLAY_ID} .tto-close-overlay {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #c9d1d9;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
}

#${OVERLAY_ID} .tto-close-overlay:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #ffffff;
}

#${OVERLAY_ID} .tto-grid {
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
    overflow-y: auto;
    padding: 12px 28px 18px;
    display: grid;
    gap: 18px;
}

#${OVERLAY_ID} .tto-grid.is-scrollable .tto-card {
    height: 240px;
}

#${OVERLAY_ID} .tto-card {
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

#${OVERLAY_ID} .tto-card:hover {
    transform: translateY(-2px);
    border-color: rgba(136, 192, 208, 0.6);
}

#${OVERLAY_ID} .tto-card.is-selected {
    border-color: #58a6ff;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.35), 0 14px 32px rgba(0, 0, 0, 0.6);
}

#${OVERLAY_ID} .tto-card.is-active .tto-card-header {
    background: rgba(88, 166, 255, 0.14);
}

#${OVERLAY_ID} .tto-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
}

#${OVERLAY_ID} .tto-index {
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

#${OVERLAY_ID} .tto-card.is-selected .tto-index {
    background: #58a6ff;
    color: #0d1117;
}

#${OVERLAY_ID} .tto-card-title {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 500;
    color: #e6edf3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

#${OVERLAY_ID} .tto-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(88, 166, 255, 0.18);
    color: #79c0ff;
    border: 1px solid rgba(88, 166, 255, 0.35);
    flex-shrink: 0;
}

#${OVERLAY_ID} .tto-badge.is-pane {
    background: rgba(163, 190, 140, 0.16);
    color: #b5d19b;
    border-color: rgba(163, 190, 140, 0.3);
}

#${OVERLAY_ID} .tto-card-close {
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

#${OVERLAY_ID} .tto-card-close:hover {
    background: rgba(248, 81, 73, 0.22);
    color: #ff7b72;
}

#${OVERLAY_ID} .tto-card-body {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    background: #131722;
}

#${OVERLAY_ID} .tto-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
}

#${OVERLAY_ID} .tto-empty {
    margin: auto;
    color: #8b949e;
    font-size: 14px;
}

#${OVERLAY_ID} .tto-footer {
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

#${OVERLAY_ID} .tto-hint kbd {
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
    canvasEl: HTMLCanvasElement
}

export class TabOverviewOverlay {
    private rootEl: HTMLElement | null = null
    private gridEl: HTMLElement | null = null
    private countEl: HTMLElement | null = null
    private cards: CardEntry[] = []
    private selectedIndex = 0
    private currentCols = 2
    private refreshTimer: number | null = null
    private tabsSub: Subscription | null = null
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null
    private resizeHandler: (() => void) | null = null

    constructor(private app: AppService) {}

    isOpen(): boolean {
        return this.rootEl !== null
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

        this.ensureStyle()

        const activeIdx = this.app.activeTab ? this.app.tabs.indexOf(this.app.activeTab) : 0
        this.selectedIndex = activeIdx >= 0 ? activeIdx : 0

        const root = document.createElement('div')
        root.id = OVERLAY_ID
        root.addEventListener('click', (e) => {
            if (e.target === root || e.target === this.gridEl) {
                this.close()
            }
        })

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

        const closeBtn = document.createElement('button')
        closeBtn.className = 'tto-close-overlay'
        closeBtn.type = 'button'
        closeBtn.textContent = 'Esc'
        closeBtn.title = 'Close overview'
        closeBtn.addEventListener('click', () => this.close())

        topbar.appendChild(titleWrap)
        topbar.appendChild(closeBtn)

        const grid = document.createElement('div')
        grid.className = 'tto-grid'
        this.gridEl = grid

        const footer = document.createElement('div')
        footer.className = 'tto-footer'
        footer.innerHTML = `
            <span class="tto-hint"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> Navigate</span>
            <span class="tto-hint"><kbd>Enter</kbd> / Click Switch</span>
            <span class="tto-hint"><kbd>1</kbd>-<kbd>9</kbd> Quick Jump</span>
            <span class="tto-hint"><kbd>Del</kbd> Close Tab</span>
            <span class="tto-hint"><kbd>Esc</kbd> Dismiss</span>
        `

        root.appendChild(topbar)
        root.appendChild(grid)
        root.appendChild(footer)
        document.body.appendChild(root)

        this.rootEl = root
        this.rebuildGrid()

        // Render thumbnails on next animation frame after layout settles
        requestAnimationFrame(() => this.refreshThumbnails())

        this.refreshTimer = window.setInterval(() => {
            this.refreshThumbnails()
        }, REFRESH_INTERVAL_MS)

        this.tabsSub = this.app.tabsChanged$.subscribe(() => {
            if (this.isOpen()) {
                this.rebuildGrid()
                requestAnimationFrame(() => this.refreshThumbnails())
            }
        })

        this.keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e)
        window.addEventListener('keydown', this.keydownHandler, { capture: true })

        this.resizeHandler = () => {
            if (this.isOpen()) {
                requestAnimationFrame(() => this.refreshThumbnails())
            }
        }
        window.addEventListener('resize', this.resizeHandler)
    }

    close(): void {
        if (this.refreshTimer !== null) {
            clearInterval(this.refreshTimer)
            this.refreshTimer = null
        }
        if (this.tabsSub) {
            this.tabsSub.unsubscribe()
            this.tabsSub = null
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
        this.app.activeTab?.emitFocused()
    }

    private ensureStyle(): void {
        if (document.getElementById(STYLE_ID)) {
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

    private rebuildGrid(): void {
        if (!this.gridEl || !this.countEl) {
            return
        }

        const tabs = this.app.tabs
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
            this.cards.push({ tab, cardEl: card, canvasEl: canvas })
        })
    }

    private refreshThumbnails(): void {
        if (!this.isOpen()) {
            return
        }
        for (const entry of this.cards) {
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
        this.close()
    }

    private async closeTabAt(index: number): Promise<void> {
        const tab = this.app.tabs[index]
        if (!tab) {
            return
        }
        await this.app.closeTab(tab, true)
        if (this.isOpen()) {
            this.rebuildGrid()
            requestAnimationFrame(() => this.refreshThumbnails())
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.isOpen()) {
            return
        }

        const consume = () => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
        }

        if (e.key === 'Escape') {
            consume()
            this.close()
            return
        }

        if (e.key === 'Enter') {
            consume()
            const target = this.app.tabs[this.selectedIndex]
            if (target) {
                this.activateTab(target)
            } else {
                this.close()
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

        if (e.key === 'Delete' || e.key === 'Backspace') {
            consume()
            void this.closeTabAt(this.selectedIndex)
            return
        }

        if (!e.ctrlKey && !e.altKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
            const idx = Number(e.key) - 1
            if (idx < this.app.tabs.length) {
                consume()
                this.activateTab(this.app.tabs[idx])
            }
        }
    }
}
