/** 游戏展示名（首页标题、日志、分享等） */
export const GAME_DISPLAY_NAME = '彩珠五连';

/** 新闻出版署《健康游戏忠告》全文（须在加载/启动画面显著位置登载） */
export const HEALTH_GAME_ADVISORY =
  '抵制不良游戏，拒绝盗版游戏。\n' +
  '注意自我保护，谨防受骗上当。\n' +
  '适度游戏益脑，沉迷游戏伤身。\n' +
  '合理安排时间，享受健康生活。';

export const BOARD_SIZE = 9;
export const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE; // 81

/**
 * Ball color palette — optimized for maximum visual differentiation.
 * Each entry: [main, highlight, shadow] for glass marble rendering.
 */
export const BALL_PALETTE: readonly [main: number, hi: number, shadow: number][] = [
  [0xDC3545, 0xFF6B7A, 0x8B0000], // red
  [0xFFC107, 0xFFE066, 0xB8860B], // yellow
  [0x0D6EFD, 0x6EA8FE, 0x003580], // blue
  [0x198754, 0x5DD39E, 0x004D25], // green
  [0x8B5CF6, 0xB794F6, 0x4C1D95], // purple
  [0xFD7E14, 0xFFB066, 0xC05600], // orange
  [0x0DCAF0, 0x6EDFF6, 0x087990], // cyan
];

export const BALL_COLORS = BALL_PALETTE.map(p => p[0]);

export const COLOR_NAMES = ['红', '黄', '蓝', '绿', '紫', '橙', '青'] as const;

export const CLASSIC_COLOR_COUNT = 7;
export const MIN_LINE_LENGTH = 5;
export const BALLS_PER_TURN = 3;
export const INITIAL_BALLS = 5;

/** Score for eliminating exactly N balls in a line */
export function scoreForLine(count: number): number {
  if (count < MIN_LINE_LENGTH) return 0;
  if (count === 5) return 10;
  if (count === 6) return 16;
  if (count === 7) return 28;
  if (count === 8) return 46;
  return 70 + (count - 9) * 30;
}

export const CELL_GAP = 2;

/** Pushes score / preview / board / prop bar down to reduce empty space under the safe area */
export const PLAYFIELD_VERTICAL_OFFSET = 72;

export function computeBoardLayout(
  logicWidth: number, logicHeight: number, safeTop: number,
  opts?: { sidePadding?: number; maxCellSize?: number; bottomPadding?: number },
) {
  const topBarHeight = 120;
  const previewHeight = 60;
  const bottomPadding = opts?.bottomPadding ?? 200;
  const sidePadding = opts?.sidePadding ?? 20;
  const cellSizeCap = opts?.maxCellSize ?? 72;

  const availableWidth = logicWidth - sidePadding * 2;
  const availableHeight =
    logicHeight - safeTop - topBarHeight - previewHeight - bottomPadding - PLAYFIELD_VERTICAL_OFFSET;

  const maxCellSize = Math.min(
    Math.floor((availableWidth - CELL_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE),
    Math.floor((availableHeight - CELL_GAP * (BOARD_SIZE - 1)) / BOARD_SIZE)
  );

  const cellSize = Math.min(maxCellSize, cellSizeCap);
  const boardPixelSize = cellSize * BOARD_SIZE + CELL_GAP * (BOARD_SIZE - 1);

  const boardX = Math.floor((logicWidth - boardPixelSize) / 2);
  const boardY = safeTop + topBarHeight + previewHeight + PLAYFIELD_VERTICAL_OFFSET;

  return {
    cellSize,
    boardPixelSize,
    boardX,
    boardY,
    topBarY: safeTop + PLAYFIELD_VERTICAL_OFFSET,
    previewY: safeTop + topBarHeight + PLAYFIELD_VERTICAL_OFFSET,
  };
}
