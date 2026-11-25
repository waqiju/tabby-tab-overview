import { Injectable, NgModule, OnDestroy } from '@angular/core'
import { Subject, takeUntil } from 'rxjs'
import {
    AppService,
    ConfigProvider,
    HotkeyDescription,
    HotkeyProvider,
    HotkeysService,
    TabRecoveryProvider,
    ToolbarButton,
    ToolbarButtonProvider,
} from 'tabby-core'
import { TabOverviewOverlay } from './overlay'
import { TabOverviewRecoveryProvider, TabOverviewTabComponent } from './overviewTab'
import { GRID_ICON_SVG, isSplitTab, isTabOverviewTab, isTerminalTab } from './types'

const HOTKEY_ID = 'toggle-tab-overview'
const CTRL_ENTER_HOTKEY_ID = 'send-ctrl-enter'

@Injectable()
export class TabOverviewConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            [HOTKEY_ID]: ['Ctrl-Shift-O'],
            [CTRL_ENTER_HOTKEY_ID]: ['Ctrl-Enter'],
        },
    }
}

@Injectable()
export class TabOverviewHotkeyProvider extends HotkeyProvider {
    async provide(): Promise<HotkeyDescription[]> {
        return [
            {
                id: HOTKEY_ID,
                name: 'Toggle Tab Overview (Thumbnail Grid)',
            },
            {
                id: CTRL_ENTER_HOTKEY_ID,
                name: 'Send Ctrl+Enter (CSI 13;5u)',
            },
        ]
    }
}

@Injectable()
export class TabOverviewService implements OnDestroy {
    private overlay: TabOverviewOverlay
    private destroyed$ = new Subject<void>()

    constructor(
        private app: AppService,
        hotkeys: HotkeysService,
    ) {
        this.overlay = new TabOverviewOverlay(app, () => this.pinAsTab())
        hotkeys.hotkey$
            .pipe(takeUntil(this.destroyed$))
            .subscribe((id) => {
                if (id === HOTKEY_ID) {
                    this.toggle()
                } else if (id === CTRL_ENTER_HOTKEY_ID) {
                    this.sendCtrlEnter()
                }
            })
    }

    toggle(): void {
        this.overlay.toggle()
    }

    pinAsTab(): void {
        this.overlay.close()
        const existing = this.app.tabs.find(t => isTabOverviewTab(t))
        if (existing) {
            this.app.selectTab(existing)
            return
        }
        const tab = this.app.openNewTabRaw({ type: TabOverviewTabComponent })
        this.app.selectTab(tab)
    }

    private sendCtrlEnter(): void {
        if (this.overlay.isOpen()) {
            return
        }
        const activeEl = document.activeElement
        if (
            activeEl instanceof HTMLInputElement ||
            (activeEl instanceof HTMLTextAreaElement && !activeEl.classList.contains('xterm-helper-textarea'))
        ) {
            return
        }
        const activeTab = this.app.activeTab
        if (!activeTab) {
            return
        }
        const focusedTab = isSplitTab(activeTab) ? activeTab.getFocusedTab() : activeTab
        if (isTerminalTab(focusedTab) && typeof focusedTab.sendInput === 'function') {
            focusedTab.sendInput('\x1b[13;5u')
        }
    }

    ngOnDestroy(): void {
        this.destroyed$.next()
        this.destroyed$.complete()
        this.overlay.close()
    }
}

@Injectable()
export class TabOverviewToolbarButtonProvider extends ToolbarButtonProvider {
    constructor(private overview: TabOverviewService) {
        super()
    }

    provide(): ToolbarButton[] {
        return [
            {
                icon: GRID_ICON_SVG,
                title: 'Tab Overview (Ctrl+Shift+O)',
                weight: 5,
                click: () => this.overview.toggle(),
            },
        ]
    }
}

@NgModule({
    declarations: [
        TabOverviewTabComponent,
    ],
    providers: [
        { provide: ConfigProvider, useClass: TabOverviewConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: TabOverviewHotkeyProvider, multi: true },
        { provide: ToolbarButtonProvider, useClass: TabOverviewToolbarButtonProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: TabOverviewRecoveryProvider, multi: true },
        TabOverviewService,
    ],
})
export default class TabOverviewModule {
    constructor(_service: TabOverviewService) {}
}
