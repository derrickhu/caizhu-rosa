import {
  BEST_SCORE_KEY,
  CLASSIC_RANKS_KEY,
  CLOUD_SYNC_ALLOWLIST,
  CLOUD_SYNC_META_KEY,
  CLOUD_SYNC_SCHEMA_VERSION,
  LEVEL_PROGRESS_KEY,
  PROP_INVENTORY_KEY,
  SEEN_SPECIAL_INTROS_KEY,
  SKIN_STATE_KEY,
  USER_PROFILE_KEY,
} from '@/config/CloudConfig';
import { Platform } from '@/core/PlatformService';

export interface CloudSyncMeta {
  updatedAt: number;
  dirty: boolean;
  lastSyncAt: number;
  remoteUpdatedAt: number;
}

export interface PersistSnapshot {
  schemaVersion: number;
  updatedAt: number;
  baseRemoteUpdatedAt: number;
  payload: Record<string, string>;
  payloadKeys: string[];
  sizeBytes: number;
}

type DirtyListener = (changedKeys: string[]) => void;
export type CloudImportReason = 'startup' | 'startup-late' | 'stale-update' | 'manual';

export interface CloudImportInfo {
  reason: CloudImportReason;
  updatedAt: number;
  changedKeys: string[];
  payloadKeys: string[];
}

type CloudImportListener = (info: CloudImportInfo) => void;

interface WriteOptions {
  markDirty?: boolean;
}

class PersistServiceClass {
  private readonly allowlist = new Set<string>(CLOUD_SYNC_ALLOWLIST);
  private readonly dirtyListeners = new Set<DirtyListener>();
  private readonly importListeners = new Set<CloudImportListener>();
  private dirtyTrackingSuspended = 0;

  isCloudSyncKey(key: string): boolean {
    return this.allowlist.has(key);
  }

  readRaw(key: string): string | null {
    return Platform.getStorageSync(key);
  }

  readJSON<T>(key: string): T | null {
    const raw = this.readRaw(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`[Persist] JSON parse failed key=${key}`, error);
      return null;
    }
  }

  writeRaw(key: string, value: string, options: WriteOptions = {}): void {
    Platform.setStorageSync(key, value);
    if (options.markDirty !== false) {
      this.onDataChanged([key]);
    }
  }

  writeJSON(key: string, value: unknown, options: WriteOptions = {}): void {
    this.writeRaw(key, JSON.stringify(value), options);
  }

  remove(key: string, options: WriteOptions = {}): void {
    Platform.removeStorageSync(key);
    if (options.markDirty !== false) {
      this.onDataChanged([key]);
    }
  }

  subscribe(listener: DirtyListener): () => void {
    this.dirtyListeners.add(listener);
    return () => this.dirtyListeners.delete(listener);
  }

  subscribeCloudImport(listener: CloudImportListener): () => void {
    this.importListeners.add(listener);
    return () => this.importListeners.delete(listener);
  }

  withSuppressedDirtyTracking<T>(runner: () => T): T {
    this.dirtyTrackingSuspended += 1;
    try {
      return runner();
    } finally {
      this.dirtyTrackingSuspended = Math.max(0, this.dirtyTrackingSuspended - 1);
    }
  }

  getCloudSyncMeta(): CloudSyncMeta {
    const parsed = this.readJSON<Partial<CloudSyncMeta>>(CLOUD_SYNC_META_KEY);
    if (parsed && typeof parsed.updatedAt === 'number') {
      return {
        updatedAt: parsed.updatedAt,
        dirty: !!parsed.dirty,
        lastSyncAt: typeof parsed.lastSyncAt === 'number' ? parsed.lastSyncAt : 0,
        remoteUpdatedAt: typeof parsed.remoteUpdatedAt === 'number' ? parsed.remoteUpdatedAt : 0,
      };
    }
    return {
      updatedAt: 0,
      dirty: false,
      lastSyncAt: 0,
      remoteUpdatedAt: 0,
    };
  }

  isCloudDirty(): boolean {
    return this.getCloudSyncMeta().dirty;
  }

  touchCloudMeta(updatedAt = Date.now()): CloudSyncMeta {
    const prev = this.getCloudSyncMeta();
    const next = {
      updatedAt,
      dirty: true,
      lastSyncAt: prev.lastSyncAt,
      remoteUpdatedAt: prev.remoteUpdatedAt,
    };
    this.writeMeta(next);
    return next;
  }

  markCloudSynced(updatedAt: number): void {
    const prev = this.getCloudSyncMeta();
    this.writeMeta({
      updatedAt: updatedAt > 0 ? updatedAt : prev.updatedAt,
      dirty: false,
      lastSyncAt: Date.now(),
      remoteUpdatedAt: updatedAt > 0 ? updatedAt : prev.remoteUpdatedAt,
    });
  }

  hasAnyLocalCloudData(): boolean {
    return CLOUD_SYNC_ALLOWLIST.some((key) => this.readRaw(key) !== null);
  }

  exportCloudSnapshot(): PersistSnapshot {
    const meta = this.getCloudSyncMeta();
    const payload: Record<string, string> = {};
    let sizeBytes = 0;
    for (const key of CLOUD_SYNC_ALLOWLIST) {
      const raw = this.readRaw(key);
      if (raw === null) {
        continue;
      }
      payload[key] = raw;
      sizeBytes += raw.length;
    }
    const payloadKeys = Object.keys(payload);
    return {
      schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
      updatedAt: meta.updatedAt,
      baseRemoteUpdatedAt: meta.remoteUpdatedAt,
      payload,
      payloadKeys,
      sizeBytes,
    };
  }

  importCloudSnapshot(snapshot: {
    updatedAt?: number;
    payload?: Record<string, unknown>;
    reason?: CloudImportReason;
  }): void {
    const payload = snapshot.payload || {};
    const mergedPayload = this.mergeCloudPayload(payload);
    const updatedAt = typeof snapshot.updatedAt === 'number' ? snapshot.updatedAt : Date.now();
    const changedKeys: string[] = [];

    this.withSuppressedDirtyTracking(() => {
      for (const key of CLOUD_SYNC_ALLOWLIST) {
        if (Object.prototype.hasOwnProperty.call(mergedPayload, key)) {
          const value = mergedPayload[key];
          if (value === undefined || value === null) {
            if (this.readRaw(key) !== null) {
              changedKeys.push(key);
            }
            Platform.removeStorageSync(key);
          } else {
            const raw = typeof value === 'string' ? value : JSON.stringify(value);
            if (this.readRaw(key) !== raw) {
              changedKeys.push(key);
            }
            Platform.setStorageSync(key, raw);
          }
        } else {
          if (this.readRaw(key) !== null) {
            changedKeys.push(key);
          }
          Platform.removeStorageSync(key);
        }
      }
      this.writeMeta({
        updatedAt,
        dirty: false,
        lastSyncAt: Date.now(),
        remoteUpdatedAt: updatedAt,
      });
    });

    const payloadKeys = Object.keys(mergedPayload);
    for (const listener of this.importListeners) {
      try {
        listener({
          reason: snapshot.reason || 'manual',
          updatedAt,
          changedKeys,
          payloadKeys,
        });
      } catch (error) {
        console.warn('[Persist] cloud import listener failed', error);
      }
    }
  }

  private onDataChanged(changedKeys: string[]): void {
    if (this.dirtyTrackingSuspended > 0) {
      return;
    }
    const syncKeys = changedKeys.filter((key) => this.isCloudSyncKey(key));
    if (syncKeys.length === 0) {
      return;
    }
    const updatedAt = Date.now();
    const prev = this.getCloudSyncMeta();
    this.writeMeta({
      updatedAt,
      dirty: true,
      lastSyncAt: prev.lastSyncAt,
      remoteUpdatedAt: prev.remoteUpdatedAt,
    });
    for (const listener of this.dirtyListeners) {
      try {
        listener(syncKeys);
      } catch (error) {
        console.warn('[Persist] dirty listener failed', error);
      }
    }
  }

  private writeMeta(meta: CloudSyncMeta): void {
    this.withSuppressedDirtyTracking(() => {
      Platform.setStorageSync(CLOUD_SYNC_META_KEY, JSON.stringify(meta));
    });
  }

  private mergeCloudPayload(remotePayload: Record<string, unknown>): Record<string, unknown> {
    const next: Record<string, unknown> = { ...remotePayload };
    this.mergeLevelProgress(next, remotePayload);
    this.mergeClassicRanks(next, remotePayload);
    this.mergeBestScore(next, remotePayload);
    this.mergeSkinState(next, remotePayload);
    this.mergePropInventory(next, remotePayload);
    this.mergeSeenIntros(next, remotePayload);
    this.mergeUserProfile(next, remotePayload);
    return next;
  }

  private mergeUserProfile(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = this.parseJSONValue<{ nickname?: string; avatarUrl?: string; updatedAt?: number }>(
      this.readRaw(USER_PROFILE_KEY),
    );
    const remote = this.parseJSONValue<{ nickname?: string; avatarUrl?: string; updatedAt?: number }>(
      remotePayload[USER_PROFILE_KEY],
    );
    if (!local && !remote) return;
    const localTs = Number(local?.updatedAt || 0);
    const remoteTs = Number(remote?.updatedAt || 0);
    const localAvatar = this.sanitizeAvatarUrl(local?.avatarUrl);
    const remoteAvatar = this.sanitizeAvatarUrl(remote?.avatarUrl);
    const localValid = !!local && (!!String(local.nickname || '') || !!localAvatar);
    const remoteValid = !!remote && (!!String(remote.nickname || '') || !!remoteAvatar);
    const winner = remoteValid && (!localValid || remoteTs > localTs)
      ? remote
      : (localValid ? local : remote || local);
    if (!winner) return;
    next[USER_PROFILE_KEY] = JSON.stringify({
      nickname: String(winner.nickname || ''),
      avatarUrl: this.sanitizeAvatarUrl(winner.avatarUrl),
      updatedAt: Math.max(localTs, remoteTs),
    });
  }

  private sanitizeAvatarUrl(url: unknown): string {
    const value = String(url || '').trim();
    if (/^(wxfile:|ttfile:|blob:)/i.test(value)) return '';
    return value;
  }

  private mergeLevelProgress(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = this.parseJSONValue<any>(this.readRaw(LEVEL_PROGRESS_KEY));
    const remote = this.parseJSONValue<any>(remotePayload[LEVEL_PROGRESS_KEY]);
    if (!local && !remote) return;

    const levels: Record<string, { stars: number; bestScore: number }> = {};
    for (const source of [remote?.levels, local?.levels]) {
      if (!source || typeof source !== 'object') continue;
      for (const [id, rec] of Object.entries(source as Record<string, any>)) {
        const prev = levels[id] || { stars: 0, bestScore: 0 };
        levels[id] = {
          stars: Math.max(prev.stars, Number(rec?.stars || 0)),
          bestScore: Math.max(prev.bestScore, Number(rec?.bestScore || 0)),
        };
      }
    }
    next[LEVEL_PROGRESS_KEY] = JSON.stringify({
      levels,
      maxUnlocked: Math.max(Number(remote?.maxUnlocked || 1), Number(local?.maxUnlocked || 1)),
    });
  }

  private mergeClassicRanks(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = this.parseJSONValue<any[]>(this.readRaw(CLASSIC_RANKS_KEY));
    const remote = this.parseJSONValue<any[]>(remotePayload[CLASSIC_RANKS_KEY]);
    if (!local && !remote) return;

    const merged = [...(remote || []), ...(local || [])]
      .filter((item) => item && Number(item.score) > 0)
      .map((item) => ({ score: Number(item.score), date: String(item.date || '') }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    next[CLASSIC_RANKS_KEY] = JSON.stringify(merged);
  }

  private mergeBestScore(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = Number(this.readRaw(BEST_SCORE_KEY) || 0);
    const remote = Number(this.stringValue(remotePayload[BEST_SCORE_KEY]) || 0);
    const best = Math.max(
      Number.isFinite(local) ? local : 0,
      Number.isFinite(remote) ? remote : 0,
      this.bestScoreFromRanks(this.readRaw(CLASSIC_RANKS_KEY)),
      this.bestScoreFromRanks(remotePayload[CLASSIC_RANKS_KEY]),
    );
    if (best > 0 || this.readRaw(BEST_SCORE_KEY) !== null || remotePayload[BEST_SCORE_KEY] !== undefined) {
      next[BEST_SCORE_KEY] = String(best);
    }
  }

  private mergeSkinState(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = this.parseJSONValue<any>(this.readRaw(SKIN_STATE_KEY));
    const remote = this.parseJSONValue<any>(remotePayload[SKIN_STATE_KEY]);
    if (!local && !remote) return;

    next[SKIN_STATE_KEY] = JSON.stringify({
      selectedOrbSkinId: remote?.selectedOrbSkinId || local?.selectedOrbSkinId || 'glass',
      selectedBackgroundSkinId: remote?.selectedBackgroundSkinId || local?.selectedBackgroundSkinId || 'default-bg',
      adUnlockedIds: Array.from(new Set([
        ...this.stringArray(remote?.adUnlockedIds),
        ...this.stringArray(local?.adUnlockedIds),
      ])),
    });
  }

  private mergePropInventory(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = this.parseJSONValue<Record<string, number>>(this.readRaw(PROP_INVENTORY_KEY));
    const remote = this.parseJSONValue<Record<string, number>>(remotePayload[PROP_INVENTORY_KEY]);
    if (!local && !remote) return;

    const merged: Record<string, number> = { ...(remote || local || {}) };
    if (Number(local?._starterGranted || 0) > 0 || Number(remote?._starterGranted || 0) > 0) {
      merged._starterGranted = 1;
    }
    next[PROP_INVENTORY_KEY] = JSON.stringify(merged);
  }

  private mergeSeenIntros(next: Record<string, unknown>, remotePayload: Record<string, unknown>): void {
    const local = this.parseJSONValue<string[]>(this.readRaw(SEEN_SPECIAL_INTROS_KEY));
    const remote = this.parseJSONValue<string[]>(remotePayload[SEEN_SPECIAL_INTROS_KEY]);
    if (!local && !remote) return;

    next[SEEN_SPECIAL_INTROS_KEY] = JSON.stringify(Array.from(new Set([
      ...this.stringArray(remote),
      ...this.stringArray(local),
    ])));
  }

  private parseJSONValue<T>(value: unknown): T | null {
    const raw = this.stringValue(value);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value);
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private bestScoreFromRanks(value: unknown): number {
    const records = this.parseJSONValue<Array<{ score?: number }>>(value);
    if (!records) return 0;
    return records.reduce((best, record) => Math.max(best, Number(record?.score || 0)), 0);
  }
}

export const PersistService = new PersistServiceClass();
