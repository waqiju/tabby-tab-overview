import { Injectable } from '@angular/core'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
    AppService,
    Logger,
    LogService,
    PlatformService,
    RecoveryToken,
    TabRecoveryService,
} from 'tabby-core'
import { extractTabTerminalInfo, isTabOverviewTab } from './types'

export interface WorkspaceTabEntry {
    title: string
    paneCount: number
    hasPiSession: boolean
    piSessions: string[]
    token: RecoveryToken
}

export interface WorkspaceSnapshot {
    v: 1
    id: string
    name: string
    createdAt: string
    tabCount: number
    piSessionCount: number
    tabs: WorkspaceTabEntry[]
}

export interface WorkspaceSummary {
    id: string
    name: string
    createdAt: string
    tabCount: number
    piSessionCount: number
    filePath: string
}

export interface RestoreResult {
    total: number
    restored: number
    skippedDuplicates: number
    failed: number
}

export interface RestoreWorkspaceOptions {
    staggerMs?: number
    onProgress?: (done: number, total: number) => void
}

const DEFAULT_STAGGER_MS = 250
const SNAPSHOT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const VOLATILE_TOKEN_KEYS = new Set(['tabColor', 'disableDynamicTitle'])

function pad2(n: number): string {
    return String(n).padStart(2, '0')
}

export function formatDefaultWorkspaceName(date: Date = new Date()): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function generateSnapshotId(date: Date = new Date()): string {
    const stamp = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
    const suffix = crypto.randomBytes(2).toString('hex')
    return `${stamp}-${suffix}`
}

/**
 * Recursively collects unique pi session identifiers (sessionFile or sessionId) from any recovery token.
 */
export function extractPiSessionsFromToken(token: unknown): string[] {
    const sessions = new Set<string>()
    const visited = new WeakSet<object>()

    const walk = (node: unknown): void => {
        if (!node || typeof node !== 'object') {
            return
        }
        if (visited.has(node)) {
            return
        }
        visited.add(node)

        if (Array.isArray(node)) {
            for (const item of node) {
                walk(item)
            }
            return
        }

        const record = node as Record<string, unknown>
        const piResume = record.piResume
        if (piResume && typeof piResume === 'object' && !Array.isArray(piResume)) {
            const pr = piResume as Record<string, unknown>
            const id = typeof pr.sessionFile === 'string' && pr.sessionFile.length > 0
                ? pr.sessionFile
                : typeof pr.sessionId === 'string' && pr.sessionId.length > 0
                    ? pr.sessionId
                    : null
            if (id) {
                sessions.add(id)
            }
        }

        for (const value of Object.values(record)) {
            walk(value)
        }
    }

    walk(token)
    return Array.from(sessions)
}

/**
 * Computes a deterministic canonical JSON string for deduplicating non-pi tabs.
 */
export function computeTokenFingerprint(token: unknown): string {
    const normalize = (node: unknown): unknown => {
        if (node === null || typeof node !== 'object') {
            return node
        }
        if (Array.isArray(node)) {
            return node.map(item => normalize(item))
        }
        const record = node as Record<string, unknown>
        const sorted: Record<string, unknown> = {}
        const keys = Object.keys(record).sort()
        for (const key of keys) {
            if (VOLATILE_TOKEN_KEYS.has(key)) {
                continue
            }
            const val = record[key]
            if (val === undefined) {
                continue
            }
            sorted[key] = normalize(val)
        }
        return sorted
    }

    return JSON.stringify(normalize(token))
}

/**
 * Filters saved tabs against currently open tabs for Append + Smart Deduplication.
 */
export function planRestoreEntries(
    savedTabs: WorkspaceTabEntry[],
    openTokens: RecoveryToken[],
): { toRestore: WorkspaceTabEntry[]; skippedDuplicates: number } {
    const openPiSessions = new Set<string>()
    const openNonPiCounts = new Map<string, number>()

    for (const token of openTokens) {
        const piSessions = extractPiSessionsFromToken(token)
        if (piSessions.length > 0) {
            for (const session of piSessions) {
                openPiSessions.add(session)
            }
        } else {
            const fp = computeTokenFingerprint(token)
            openNonPiCounts.set(fp, (openNonPiCounts.get(fp) ?? 0) + 1)
        }
    }

    const toRestore: WorkspaceTabEntry[] = []
    let skippedDuplicates = 0

    for (const entry of savedTabs) {
        const extracted = extractPiSessionsFromToken(entry.token)
        const piSessions = extracted.length > 0 ? extracted : entry.piSessions

        if (piSessions.length > 0) {
            const allAlreadyOpen = piSessions.every(s => openPiSessions.has(s))
            if (allAlreadyOpen) {
                skippedDuplicates += 1
                continue
            }
            for (const s of piSessions) {
                openPiSessions.add(s)
            }
            toRestore.push(entry)
            continue
        }

        const fp = computeTokenFingerprint(entry.token)
        const remaining = openNonPiCounts.get(fp) ?? 0
        if (remaining > 0) {
            openNonPiCounts.set(fp, remaining - 1)
            skippedDuplicates += 1
            continue
        }
        toRestore.push(entry)
    }

    return { toRestore, skippedDuplicates }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

@Injectable()
export class WorkspaceService {
    private logger: Logger
    private restoring = false

    constructor(
        private app: AppService,
        private tabRecovery: TabRecoveryService,
        private platform: PlatformService,
        log: LogService,
    ) {
        this.logger = log.create('tabOverviewWorkspaces')
    }

    getWorkspacesDir(): string {
        const configPath = this.platform.getConfigPath()
        if (configPath) {
            return path.join(path.dirname(configPath), 'workspaces')
        }
        return path.join(os.homedir(), '.tabby-workspaces')
    }

    openWorkspacesFolder(): void {
        const dir = this.getWorkspacesDir()
        fs.mkdirSync(dir, { recursive: true })
        this.platform.openPath(dir)
    }

    isRestoring(): boolean {
        return this.restoring
    }

    async saveWorkspace(customName?: string): Promise<WorkspaceSummary> {
        const displayTabs = this.app.tabs.filter(tab => !isTabOverviewTab(tab))
        if (displayTabs.length === 0) {
            throw new Error('No open tabs to save')
        }

        const entries: WorkspaceTabEntry[] = []
        let piSessionCount = 0

        for (const tab of displayTabs) {
            const token = await this.tabRecovery.getFullRecoveryToken(tab)
            if (!token) {
                continue
            }
            const info = extractTabTerminalInfo(tab)
            const piSessions = extractPiSessionsFromToken(token)
            piSessionCount += piSessions.length
            entries.push({
                title: info.title,
                paneCount: info.paneCount,
                hasPiSession: piSessions.length > 0,
                piSessions,
                token,
            })
        }

        if (entries.length === 0) {
            throw new Error('No recoverable tabs to save')
        }

        const now = new Date()
        const id = generateSnapshotId(now)
        const name = customName?.trim() || formatDefaultWorkspaceName(now)
        const snapshot: WorkspaceSnapshot = {
            v: 1,
            id,
            name,
            createdAt: now.toISOString(),
            tabCount: entries.length,
            piSessionCount,
            tabs: entries,
        }

        const dir = this.getWorkspacesDir()
        fs.mkdirSync(dir, { recursive: true })
        const filePath = path.join(dir, `${id}.json`)
        const tmpPath = `${filePath}.tmp`
        fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
        fs.renameSync(tmpPath, filePath)

        this.logger.info(`Saved workspace "${name}" (${entries.length} tabs, ${piSessionCount} pi) -> ${filePath}`)

        return {
            id,
            name,
            createdAt: snapshot.createdAt,
            tabCount: snapshot.tabCount,
            piSessionCount: snapshot.piSessionCount,
            filePath,
        }
    }

    listWorkspaces(): WorkspaceSummary[] {
        const dir = this.getWorkspacesDir()
        if (!fs.existsSync(dir)) {
            return []
        }

        const files = fs.readdirSync(dir).filter(name => name.endsWith('.json'))
        const summaries: WorkspaceSummary[] = []

        for (const fileName of files) {
            const filePath = path.join(dir, fileName)
            try {
                const raw = fs.readFileSync(filePath, 'utf8')
                const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>
                if (
                    parsed?.v !== 1 ||
                    typeof parsed.id !== 'string' ||
                    typeof parsed.name !== 'string' ||
                    typeof parsed.createdAt !== 'string' ||
                    !Array.isArray(parsed.tabs)
                ) {
                    continue
                }
                summaries.push({
                    id: parsed.id,
                    name: parsed.name,
                    createdAt: parsed.createdAt,
                    tabCount: typeof parsed.tabCount === 'number' ? parsed.tabCount : parsed.tabs.length,
                    piSessionCount: typeof parsed.piSessionCount === 'number'
                        ? parsed.piSessionCount
                        : parsed.tabs.reduce((acc, t) => acc + (t.piSessions?.length ?? 0), 0),
                    filePath,
                })
            } catch (err) {
                this.logger.warn(`Skipping unreadable workspace file ${fileName}`, err)
            }
        }

        summaries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        return summaries
    }

    deleteWorkspace(id: string): boolean {
        if (!SNAPSHOT_ID_PATTERN.test(id)) {
            return false
        }
        const filePath = path.join(this.getWorkspacesDir(), `${id}.json`)
        if (!fs.existsSync(filePath)) {
            return false
        }
        fs.unlinkSync(filePath)
        this.logger.info(`Deleted workspace snapshot ${id}`)
        return true
    }

    async restoreWorkspace(id: string, options?: RestoreWorkspaceOptions): Promise<RestoreResult> {
        if (this.restoring) {
            throw new Error('Workspace restore already in progress')
        }
        if (!SNAPSHOT_ID_PATTERN.test(id)) {
            throw new Error('Invalid workspace snapshot id')
        }

        const filePath = path.join(this.getWorkspacesDir(), `${id}.json`)
        if (!fs.existsSync(filePath)) {
            throw new Error('Workspace snapshot not found')
        }

        const raw = fs.readFileSync(filePath, 'utf8')
        const snapshot = JSON.parse(raw) as WorkspaceSnapshot
        if (snapshot?.v !== 1 || !Array.isArray(snapshot.tabs)) {
            throw new Error('Invalid workspace snapshot format')
        }

        this.restoring = true
        try {
            const openTabs = this.app.tabs.filter(tab => !isTabOverviewTab(tab))
            const openTokenResults = await Promise.all(
                openTabs.map(tab => this.tabRecovery.getFullRecoveryToken(tab)),
            )
            const openTokens = openTokenResults.filter((t): t is RecoveryToken => Boolean(t))

            const { toRestore, skippedDuplicates } = planRestoreEntries(snapshot.tabs, openTokens)
            const staggerMs = options?.staggerMs ?? DEFAULT_STAGGER_MS
            const prevActiveTab = this.app.activeTab

            let restored = 0
            let failed = 0

            for (let i = 0; i < toRestore.length; i++) {
                const entry = toRestore[i]
                try {
                    const clonedToken = JSON.parse(JSON.stringify(entry.token)) as RecoveryToken
                    const params = await this.tabRecovery.recoverTab(clonedToken)
                    if (params) {
                        this.app.openNewTabRaw(params)
                        restored += 1
                    } else {
                        failed += 1
                    }
                } catch (err) {
                    failed += 1
                    this.logger.warn(`Failed to restore tab "${entry.title}"`, err)
                }

                if (prevActiveTab && isTabOverviewTab(prevActiveTab) && this.app.activeTab !== prevActiveTab) {
                    this.app.selectTab(prevActiveTab)
                }

                options?.onProgress?.(i + 1, toRestore.length)

                if (i < toRestore.length - 1 && staggerMs > 0) {
                    await delay(staggerMs)
                }
            }

            this.logger.info(
                `Restored workspace "${snapshot.name}": restored=${restored}, skipped=${skippedDuplicates}, failed=${failed}`,
            )

            return {
                total: snapshot.tabs.length,
                restored,
                skippedDuplicates,
                failed,
            }
        } finally {
            this.restoring = false
        }
    }
}
