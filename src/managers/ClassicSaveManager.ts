import { BOARD_SIZE } from '@/config/GameConfig';
import { CLASSIC_SAVED_GAME_KEY } from '@/config/CloudConfig';
import { PersistService } from '@/core/PersistService';
import { BoardManager } from '@/managers/BoardManager';

const SAVE_VERSION = 1;

export interface ClassicSavedGame {
  version: typeof SAVE_VERSION;
  savedAt: number;
  state: ReturnType<typeof BoardManager.exportState>;
}

class ClassicSaveManagerClass {
  hasSavedGame(): boolean {
    return this._read() !== null;
  }

  saveInProgress(): void {
    if (BoardManager.gameOver || BoardManager.isLevelMode) return;
    const payload: ClassicSavedGame = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: BoardManager.exportState(),
    };
    PersistService.writeJSON(CLASSIC_SAVED_GAME_KEY, payload);
  }

  /** @returns true if a valid saved game was restored */
  tryResume(): boolean {
    const saved = this._read();
    if (!saved) return false;

    BoardManager.loadClassicState(saved.state);
    return true;
  }

  clear(): void {
    PersistService.remove(CLASSIC_SAVED_GAME_KEY);
  }

  private _read(): ClassicSavedGame | null {
    const raw = PersistService.readJSON<ClassicSavedGame>(CLASSIC_SAVED_GAME_KEY);
    if (!raw || raw.version !== SAVE_VERSION || !raw.state) return null;
    if (!this._isValidState(raw.state)) {
      this.clear();
      return null;
    }
    return raw;
  }

  private _isValidState(state: ClassicSavedGame['state']): boolean {
    const { grid, nextPieces, score, bestScore } = state;
    if (!Array.isArray(grid) || grid.length !== BOARD_SIZE) return false;
    if (!grid.every(row => Array.isArray(row) && row.length === BOARD_SIZE)) return false;
    if (!Array.isArray(nextPieces)) return false;
    if (typeof score !== 'number' || typeof bestScore !== 'number') return false;
    return true;
  }
}

export const ClassicSaveManager = new ClassicSaveManagerClass();
