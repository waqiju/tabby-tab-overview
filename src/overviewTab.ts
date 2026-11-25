import { AfterViewInit, Component, ElementRef, Injectable, Injector, OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'
import {
    AppService,
    BaseTabComponent,
    NewTabParameters,
    RecoveryToken,
    TabRecoveryProvider,
} from 'tabby-core'
import { OVERLAY_ID, TabOverviewView } from './overlay'
import { GRID_ICON_SVG } from './types'

const OVERVIEW_TAB_RECOVERY_TYPE = 'tabby-tab-overview-tab'

@Component({
    selector: 'tabby-tab-overview-tab',
    template: '<div class="tto-tab-host"></div>',
    styles: [
        ':host { display: flex; flex: 1; width: 100%; height: 100%; overflow: hidden; }',
        '.tto-tab-host { flex: 1; width: 100%; height: 100%; display: flex; }',
    ],
})
export class TabOverviewTabComponent extends BaseTabComponent implements AfterViewInit, OnDestroy {
    readonly isTabOverviewTab = true
    private view: TabOverviewView | null = null
    private visibilitySub: Subscription | null = null

    constructor(
        injector: Injector,
        private app: AppService,
        private elementRef: ElementRef<HTMLElement>,
    ) {
        super(injector)
        this.setTitle('Tab Overview')
        this.icon = GRID_ICON_SVG
    }

    ngAfterViewInit(): void {
        if (!this.title) {
            this.setTitle('Tab Overview')
        }
        if (!this.icon) {
            this.icon = GRID_ICON_SVG
        }

        const host = this.elementRef.nativeElement.querySelector('.tto-tab-host') as HTMLElement | null
        if (!host) {
            return
        }

        const view = new TabOverviewView(this.app, {
            mode: 'tab',
            isKeyboardActive: () => this.app.activeTab === this && !document.getElementById(OVERLAY_ID),
        })
        this.view = view
        view.mount(host)

        this.visibilitySub = this.visibility$.subscribe((visible) => {
            this.view?.setPaused(!visible)
        })
    }

    async getRecoveryToken(): Promise<RecoveryToken> {
        return {
            type: OVERVIEW_TAB_RECOVERY_TYPE,
        }
    }

    ngOnDestroy(): void {
        if (this.visibilitySub) {
            this.visibilitySub.unsubscribe()
            this.visibilitySub = null
        }
        if (this.view) {
            this.view.destroy()
            this.view = null
        }
        super.ngOnDestroy()
    }
}

@Injectable()
export class TabOverviewRecoveryProvider extends TabRecoveryProvider<TabOverviewTabComponent> {
    async applicableTo(recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === OVERVIEW_TAB_RECOVERY_TYPE
    }

    async recover(_recoveryToken: RecoveryToken): Promise<NewTabParameters<TabOverviewTabComponent>> {
        return {
            type: TabOverviewTabComponent,
        }
    }
}
