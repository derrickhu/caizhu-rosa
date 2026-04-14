/** Special ball type markers stored in the grid as negative numbers */
export const WILD_BALL = -1;
export const BOMB_BALL = -2;

export function isSpecialBall(value: number | null): boolean {
  return value !== null && value < 0;
}

export function isWildBall(value: number | null): boolean {
  return value === WILD_BALL;
}

export function isBombBall(value: number | null): boolean {
  return value === BOMB_BALL;
}

export function isNormalColor(value: number | null): boolean {
  return value !== null && value >= 0;
}

/** Prop types available in-game */
export enum PropType {
  PositionPreview = 'positionPreview',
  Undo = 'undo',
  RemoveBall = 'removeBall',
  RerollColors = 'rerollColors',
  ExtraLimit = 'extraLimit',
}

export interface PropDef {
  type: PropType;
  name: string;
  icon: string;
  description: string;
  /** Max uses per game session */
  maxPerGame: number;
  /** Ad unit ID placeholder — fill with real ID when monetizing */
  adUnitId: string;
}

export const PROP_DEFS: Record<PropType, PropDef> = {
  [PropType.PositionPreview]: {
    type: PropType.PositionPreview,
    name: '落点预览',
    icon: '👁',
    description: '查看下轮新球的落点位置',
    maxPerGame: 1,
    adUnitId: 'adunit-preview',
  },
  [PropType.Undo]: {
    type: PropType.Undo,
    name: '撤回一步',
    icon: '↩',
    description: '撤销上一步移动',
    maxPerGame: 1,
    adUnitId: 'adunit-undo',
  },
  [PropType.RemoveBall]: {
    type: PropType.RemoveBall,
    name: '移除珠子',
    icon: '✖',
    description: '点击移除任意一颗珠子',
    maxPerGame: 1,
    adUnitId: 'adunit-remove',
  },
  [PropType.RerollColors]: {
    type: PropType.RerollColors,
    name: '重选颜色',
    icon: '🔄',
    description: '重新随机下轮球的颜色',
    maxPerGame: 2,
    adUnitId: 'adunit-reroll',
  },
  [PropType.ExtraLimit]: {
    type: PropType.ExtraLimit,
    name: '续命',
    icon: '➕',
    description: '限步关+3步 / 限时关+15秒',
    maxPerGame: 1,
    adUnitId: 'adunit-extra',
  },
};

export const EXTRA_STEPS = 3;
export const EXTRA_TIME = 15;

export const ALL_PROPS = Object.values(PROP_DEFS);
