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
import { GRID_ICON_SVG, isTabOverviewTab } from './types'

const HOTKEY_ID = 'toggle-tab-overview'

@Injectable()
export class TabOverviewConfigProvider extends ConfigProvider {
    defaults = {
        hotkeys: {
            [HOTKEY_ID]: ['Ctrl-Shift-O'],
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
