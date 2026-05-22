import { GAME_DISPLAY_NAME } from './GameConfig';

export const SHARE_IMAGES = {
  appMessage: 'subpkg_assets/images/share_card_combo_yellow.jpg',
  timeline: 'subpkg_assets/images/share_card_board_ocean.jpg',
} as const;

export const SHARE_TITLES = {
  appMessage: `来玩${GAME_DISPLAY_NAME}，五颗连成线！`,
  timeline: `${GAME_DISPLAY_NAME}，越玩越上头`,
} as const;

export function buildShareQuery(source: string): string {
  return `from=share&source=${encodeURIComponent(source)}`;
}
