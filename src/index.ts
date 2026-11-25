import { Injectable, NgModule, OnDestroy } from '@angular/core'
import { Subject, takeUntil } from 'rxjs'
import {
    AppService,
    ConfigProvider,
    HotkeyDescription,
    HotkeyProvider,
    HotkeysService,
    ToolbarButton,
    ToolbarButtonProvider,
} from 'tabby-core'
import { TabOverviewOverlay } from './overlay'
import { isSplitTab, isTerminalTab } from './types'

const HOTKEY_ID = 'toggle-tab-overview'
const CTRL_ENTER_HOTKEY_ID = 'send-ctrl-enter'

const GRID_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
  <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2"/>
  <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2"/>
  <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2"/>
  <rect x="9" y="9" width="5.5" height="5.5" rx="1.2"/>
</svg>`

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
        this.overlay = new TabOverviewOverlay(app)
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
    providers: [
        { provide: ConfigProvider, useClass: TabOverviewConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: TabOverviewHotkeyProvider, multi: true },
        { provide: ToolbarButtonProvider, useClass: TabOverviewToolbarButtonProvider, multi: true },
        TabOverviewService,
    ],
})
export default class TabOverviewModule {
    constructor(_service: TabOverviewService) {}
}
