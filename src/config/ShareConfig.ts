import { GAME_DISPLAY_NAME } from './GameConfig';

export const SHARE_IMAGES = {
  appMessage: 'subpkg_assets/images/share_card_combo_yellow.jpg',
  timeline: 'subpkg_assets/images/share_card_board_ocean.jpg',
  /** 经典模式破纪录炫耀分享 */
  classicRecord: 'subpkg_assets/images/share_card_classic_record.jpg',
} as const;

export const SHARE_TITLES = {
  appMessage: `来玩${GAME_DISPLAY_NAME}，五颗连成线！`,
  timeline: `${GAME_DISPLAY_NAME}，越玩越上头`,
} as const;

export function buildShareQuery(source: string): string {
  return `from=share&source=${encodeURIComponent(source)}`;
}

/** 破纪录分享文案（title 可带动态分数，炫耀+挑战好友） */
export function buildClassicRecordShareTitle(score: number): string {
  return `经典模式 ${score} 分新纪录！不服来比比？`;
}
