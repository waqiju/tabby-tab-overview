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

const HOTKEY_ID = 'toggle-tab-overview'

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
        app: AppService,
        hotkeys: HotkeysService,
    ) {
        this.overlay = new TabOverviewOverlay(app)
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
