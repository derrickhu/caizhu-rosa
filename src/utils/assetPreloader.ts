import { loadImageTexture } from './imageTexture';

export const IMAGE_ASSETS: readonly string[] = [
  'images/loading_screen.png',
  'images/home_bg_clean.png',
  'images/home_title_cz5.png',
  'images/home_btn_start.png',
  'images/home_btn_classic.png',
  'images/home_btn_rank.png',
  'images/home_btn_skin.png',
  'images/home_btn_settings.png',
  'images/home_btn_rewards.png',
  'images/home_redesign_full.png',
  'images/bg_classic_redesign.png',
  'images/bg_level_redesign.png',
  'images/classic_back_button.png',
  'images/classic_board_base.png',
  'images/classic_board_cell_light.png',
  'images/classic_board_cell_lavender.png',
  'images/classic_score_hud.png',
  'images/level_select_bg.jpg',
  'images/level_select_title.png',
  'images/level_select_star.png',
  'images/level_node_completed.png',
  'images/level_node_current.png',
  'images/level_node_locked.png',
  'images/level_page_next.png',
  'images/level_page_prev.png',
  'images/level_board_base.png',
  'images/level_board_cell_light.png',
  'images/level_board_cell_blue.png',
  'images/level_hud_panel.png',
  'images/level_hourglass_icon.png',
  'images/level_star_icon.png',
  'images/level_next_banner.png',
  'images/level_complete_panel.png',
  'images/rank_panel.png',
  'images/skin_panel.png',
  'images/skin_tab_active.png',
  'images/skin_tab_inactive.png',
  'images/skin_card_empty.png',
  'images/orb_skins_sheet.png',
  'images/prop_icons.png',
  'images/special_wild.png',
  'images/special_bomb.png',
  'images/special_frozen_overlay.png',
  'images/special_chain_overlay.png',
  'images/special_block.png',
  'images/special_timer_bomb.png',
  'images/special_intro_panel.png',
  'images/ui_button_blue.png',
  'images/ui_button_green.png',
  'images/ui_button_orange.png',
  'images/ui_button_purple.png',
  'images/ui_icon_back.png',
  'images/ui_icon_close.png',
  'images/ui_icon_lock.png',
  'images/ui_icon_medal.png',
  'images/ui_icon_rank.png',
  'images/ui_icon_skin.png',
  'images/ui_icon_star.png',
  'images/ui_panel_hud.png',
  'images/ui_panel_popup.png',
  'images/ui_progress_bar.png',
  'images/ui_tab_active.png',
  'images/ui_tab_inactive.png',
];

export async function preloadImageAssets(
  onProgress?: (loaded: number, total: number, path: string) => void,
): Promise<void> {
  const uniqueAssets = Array.from(new Set(IMAGE_ASSETS));
  let loaded = 0;
  let cursor = 0;
  const concurrency = 6;

  const loadNext = async (): Promise<void> => {
    const path = uniqueAssets[cursor];
    cursor += 1;
    if (!path) return;

    await loadImageTexture(path);
    loaded += 1;
    onProgress?.(loaded, uniqueAssets.length, path);
    await loadNext();
  };

  await Promise.all(Array.from({ length: concurrency }, () => loadNext()));
}
