/** Prop types available in-game */
export enum PropType {
  ColorBlast = 'colorBlast',
  CrossClear = 'crossClear',
  WildNext = 'wildNext',
}

export const PROP_REWARDED_AD_UNIT_ID = 'adunit-fab969e9ff8cd7d7';

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
  [PropType.ColorBlast]: {
    type: PropType.ColorBlast,
    name: '同色爆破',
    icon: '💥',
    description: '随机消除棋盘上一种颜色的全部珠子',
    maxPerGame: 1,
    adUnitId: PROP_REWARDED_AD_UNIT_ID,
  },
  [PropType.CrossClear]: {
    type: PropType.CrossClear,
    name: '十字清场',
    icon: '✚',
    description: '点击一个格子，消除所在行和列的珠子',
    maxPerGame: 1,
    adUnitId: PROP_REWARDED_AD_UNIT_ID,
  },
  [PropType.WildNext]: {
    type: PropType.WildNext,
    name: '万能预备',
    icon: '🌈',
    description: '把下一轮出现的珠子全部变成万能珠',
    maxPerGame: 1,
    adUnitId: PROP_REWARDED_AD_UNIT_ID,
  },
};

export const ALL_PROPS = Object.values(PROP_DEFS);
