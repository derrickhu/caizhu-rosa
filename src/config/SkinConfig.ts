export type SkinCategory = 'orb' | 'background';

export type UnlockCondition =
  | { type: 'default' }
  | { type: 'classicScore'; score: number }
  | { type: 'levelReached'; level: number }
  | { type: 'ad'; adUnitId: string }
  | { type: 'future'; label: string };

export interface BaseSkinDef {
  id: string;
  category: SkinCategory;
  name: string;
  description: string;
  unlock: UnlockCondition;
}

export interface OrbSkinDef extends BaseSkinDef {
  category: 'orb';
  sheetRow: number;
}

export interface BackgroundSkinDef extends BaseSkinDef {
  category: 'background';
  imagePath: string;
  previewPath: string;
}

export type SkinDef = OrbSkinDef | BackgroundSkinDef;

export const DEFAULT_ORB_SKIN_ID = 'glass';
export const DEFAULT_BACKGROUND_SKIN_ID = 'default-bg';

export const DEFAULT_CLASSIC_BACKGROUND = 'subpkg_assets/images/bg_classic_redesign.png';
export const DEFAULT_LEVEL_BACKGROUND = 'subpkg_assets/images/bg_level_redesign.png';

export const ORB_SKINS: readonly OrbSkinDef[] = [
  {
    id: 'glass',
    category: 'orb',
    name: '经典玻璃',
    description: '默认彩珠皮肤',
    sheetRow: 0,
    unlock: { type: 'default' },
  },
  {
    id: 'jelly',
    category: 'orb',
    name: '果冻弹珠',
    description: '经典最高分 300 解锁',
    sheetRow: 1,
    unlock: { type: 'classicScore', score: 300 },
  },
  {
    id: 'gem',
    category: 'orb',
    name: '宝石璀璨',
    description: '通关到第 8 关解锁',
    sheetRow: 2,
    unlock: { type: 'levelReached', level: 8 },
  },
  {
    id: 'candy',
    category: 'orb',
    name: '糖果缤纷',
    description: '看广告解锁',
    sheetRow: 3,
    unlock: { type: 'ad', adUnitId: 'ad_skin_orb_candy' },
  },
  {
    id: 'ocean',
    category: 'orb',
    name: '海洋之声',
    description: '通关到第 15 关解锁',
    sheetRow: 4,
    unlock: { type: 'levelReached', level: 15 },
  },
];

export const BACKGROUND_SKINS: readonly BackgroundSkinDef[] = [
  {
    id: 'default-bg',
    category: 'background',
    name: '默认背景',
    description: '经典/关卡默认背景',
    imagePath: DEFAULT_LEVEL_BACKGROUND,
    previewPath: DEFAULT_LEVEL_BACKGROUND,
    unlock: { type: 'default' },
  },
  {
    id: 'classic-blue',
    category: 'background',
    name: '经典蓝调',
    description: '经典最高分 500 解锁',
    imagePath: DEFAULT_CLASSIC_BACKGROUND,
    previewPath: DEFAULT_CLASSIC_BACKGROUND,
    unlock: { type: 'classicScore', score: 500 },
  },
  {
    id: 'candy-ocean',
    category: 'background',
    name: '梦幻海洋',
    description: '通关到第 6 关解锁',
    imagePath: DEFAULT_LEVEL_BACKGROUND,
    previewPath: DEFAULT_LEVEL_BACKGROUND,
    unlock: { type: 'levelReached', level: 6 },
  },
  {
    id: 'sweet-home',
    category: 'background',
    name: '甜蜜糖果',
    description: '看广告解锁',
    imagePath: 'subpkg_assets/images/home_bg_clean.png',
    previewPath: 'subpkg_assets/images/home_bg_clean.png',
    unlock: { type: 'ad', adUnitId: 'ad_skin_bg_sweet' },
  },
  {
    id: 'event-bg',
    category: 'background',
    name: '活动限定',
    description: '后续活动解锁',
    imagePath: DEFAULT_LEVEL_BACKGROUND,
    previewPath: DEFAULT_LEVEL_BACKGROUND,
    unlock: { type: 'future', label: '后续活动解锁' },
  },
];

export const ALL_SKINS: readonly SkinDef[] = [
  ...ORB_SKINS,
  ...BACKGROUND_SKINS,
];

export function getSkinById(id: string): SkinDef | undefined {
  return ALL_SKINS.find((skin) => skin.id === id);
}
