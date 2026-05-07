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
  {
    id: 'galaxy',
    category: 'orb',
    name: '星河流光',
    description: '通关到第 20 关解锁',
    sheetRow: 5,
    unlock: { type: 'levelReached', level: 20 },
  },
  {
    id: 'frost',
    category: 'orb',
    name: '冰晶雪花',
    description: '经典最高分 1000 解锁',
    sheetRow: 6,
    unlock: { type: 'classicScore', score: 1000 },
  },
  {
    id: 'flower',
    category: 'orb',
    name: '花漾琉璃',
    description: '看广告解锁',
    sheetRow: 7,
    unlock: { type: 'ad', adUnitId: 'ad_skin_orb_flower' },
  },
  {
    id: 'lava',
    category: 'orb',
    name: '熔岩能量',
    description: '后续活动解锁',
    sheetRow: 8,
    unlock: { type: 'future', label: '后续活动解锁' },
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
    id: 'arcade-wave',
    category: 'background',
    name: '碧蓝波纹',
    description: '到达第 4 关解锁',
    imagePath: 'subpkg_assets/images/bg_skin_arcade_wave_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_arcade_wave_1k.png',
    unlock: { type: 'levelReached', level: 4 },
  },
  {
    id: 'starlight-stream',
    category: 'background',
    name: '星辉流线',
    description: '到达第 8 关解锁',
    imagePath: 'subpkg_assets/images/bg_skin_starlight_stream_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_starlight_stream_1k.png',
    unlock: { type: 'levelReached', level: 8 },
  },
  {
    id: 'crystal-tide',
    category: 'background',
    name: '水晶潮汐',
    description: '经典 800 分解锁',
    imagePath: 'subpkg_assets/images/bg_skin_crystal_tide_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_crystal_tide_1k.png',
    unlock: { type: 'classicScore', score: 800 },
  },
  {
    id: 'neon-bubble',
    category: 'background',
    name: '霓虹泡泡',
    description: '到达第 12 关解锁',
    imagePath: 'subpkg_assets/images/bg_skin_neon_bubble_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_neon_bubble_1k.png',
    unlock: { type: 'levelReached', level: 12 },
  },
  {
    id: 'emerald-flow',
    category: 'background',
    name: '翠绿光流',
    description: '看广告解锁',
    imagePath: 'subpkg_assets/images/bg_skin_emerald_flow_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_emerald_flow_1k.png',
    unlock: { type: 'ad', adUnitId: 'ad_skin_bg_emerald_flow' },
  },
  {
    id: 'sunset-splash',
    category: 'background',
    name: '暖橙浪花',
    description: '经典 1500 分解锁',
    imagePath: 'subpkg_assets/images/bg_skin_sunset_splash_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_sunset_splash_1k.png',
    unlock: { type: 'classicScore', score: 1500 },
  },
  {
    id: 'prism-orbit',
    category: 'background',
    name: '棱镜轨道',
    description: '看广告解锁',
    imagePath: 'subpkg_assets/images/bg_skin_prism_orbit_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_prism_orbit_1k.png',
    unlock: { type: 'ad', adUnitId: 'ad_skin_bg_prism_orbit' },
  },
  {
    id: 'aurora-surf',
    category: 'background',
    name: '极光浪影',
    description: '后续活动解锁',
    imagePath: 'subpkg_assets/images/bg_skin_aurora_surf_1k.png',
    previewPath: 'subpkg_assets/images/bg_skin_aurora_surf_1k.png',
    unlock: { type: 'future', label: '后续活动解锁' },
  },
  {
    id: 'cloud-candy-dream',
    category: 'background',
    name: '棉花糖云空',
    description: '看广告解锁',
    imagePath: 'subpkg_assets/images/bg_skin_cloud_candy_2d_1k_test.png',
    previewPath: 'subpkg_assets/images/bg_skin_cloud_candy_2d_1k_test.png',
    unlock: { type: 'ad', adUnitId: 'ad_skin_bg_cloud_candy_dream' },
  },
  {
    id: 'warm-toy-glow',
    category: 'background',
    name: '暖光玩具桌',
    description: '看广告解锁',
    imagePath: 'subpkg_assets/images/bg_skin_warm_toy_1k_test.png',
    previewPath: 'subpkg_assets/images/bg_skin_warm_toy_1k_test.png',
    unlock: { type: 'ad', adUnitId: 'ad_skin_bg_warm_toy_glow' },
  },
];

export const ALL_SKINS: readonly SkinDef[] = [
  ...ORB_SKINS,
  ...BACKGROUND_SKINS,
];

export function getSkinById(id: string): SkinDef | undefined {
  return ALL_SKINS.find((skin) => skin.id === id);
}
