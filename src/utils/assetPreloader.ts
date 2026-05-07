import { loadImageTexture } from './imageTexture';

export const IMAGE_ASSETS: readonly string[] = [
  'images/loading_screen.png',
  'subpkg_assets/images/home_bg_clean.png',
  'subpkg_assets/images/home_title_cz5.png',
  'subpkg_assets/images/home_btn_start.png',
  'subpkg_assets/images/home_btn_classic.png',
  'subpkg_assets/images/home_btn_rank.png',
  'subpkg_assets/images/home_btn_skin.png',
  'subpkg_assets/images/home_btn_settings.png',
  'subpkg_assets/images/home_btn_rewards.png',
  'subpkg_assets/images/home_redesign_full.png',
  'subpkg_assets/images/bg_classic_redesign.png',
  'subpkg_assets/images/bg_level_redesign.png',
  'subpkg_assets/images/bg_skin_arcade_wave_1k.png',
  'subpkg_assets/images/bg_skin_starlight_stream_1k.png',
  'subpkg_assets/images/bg_skin_crystal_tide_1k.png',
  'subpkg_assets/images/bg_skin_neon_bubble_1k.png',
  'subpkg_assets/images/bg_skin_emerald_flow_1k.png',
  'subpkg_assets/images/bg_skin_sunset_splash_1k.png',
  'subpkg_assets/images/bg_skin_prism_orbit_1k.png',
  'subpkg_assets/images/bg_skin_aurora_surf_1k.png',
  'subpkg_assets/images/bg_skin_cloud_candy_2d_1k_test.png',
  'subpkg_assets/images/bg_skin_warm_toy_1k_test.png',
  'subpkg_assets/images/classic_back_button.png',
  'subpkg_assets/images/classic_board_base.png',
  'subpkg_assets/images/classic_board_cell_light.png',
  'subpkg_assets/images/classic_board_cell_lavender.png',
  'subpkg_assets/images/classic_score_hud.png',
  'subpkg_assets/images/level_select_bg.jpg',
  'subpkg_assets/images/level_select_title.png',
  'subpkg_assets/images/level_select_star.png',
  'subpkg_assets/images/level_node_completed.png',
  'subpkg_assets/images/level_node_current.png',
  'subpkg_assets/images/level_node_locked.png',
  'subpkg_assets/images/level_page_next.png',
  'subpkg_assets/images/level_page_prev.png',
  'subpkg_assets/images/level_board_base.png',
  'subpkg_assets/images/level_board_cell_light.png',
  'subpkg_assets/images/level_board_cell_blue.png',
  'subpkg_assets/images/level_hud_panel.png',
  'subpkg_assets/images/level_hourglass_icon.png',
  'subpkg_assets/images/level_star_icon.png',
  'subpkg_assets/images/level_next_banner.png',
  'subpkg_assets/images/level_complete_panel.png',
  'subpkg_assets/images/rank_panel.png',
  'subpkg_assets/images/avatar_default.png',
  'subpkg_assets/images/rank_title_banner.png',
  'subpkg_assets/images/rank_tab_mode_active_blue.png',
  'subpkg_assets/images/rank_tab_mode_inactive.png',
  'subpkg_assets/images/rank_tab_mode_active_green.png',
  'subpkg_assets/images/rank_tab_scope_active.png',
  'subpkg_assets/images/rank_tab_scope_inactive.png',
  'subpkg_assets/images/rank_btn_auth.png',
  'subpkg_assets/images/rank_top1_panel.png',
  'subpkg_assets/images/rank_top2_panel.png',
  'subpkg_assets/images/rank_top3_panel.png',
  'subpkg_assets/images/rank_my_rank_panel.png',
  'subpkg_assets/images/rank_back_normal.png',
  'subpkg_assets/images/rank_back_pressed.png',
  'subpkg_assets/images/rank_row_panel.png',
  'subpkg_assets/images/skin_panel.png',
  'subpkg_assets/images/skin_tab_active.png',
  'subpkg_assets/images/skin_tab_inactive.png',
  'subpkg_assets/images/skin_card_empty.png',
  'subpkg_assets/images/orb_skins_sheet.png',
  'subpkg_assets/images/prop_icons.png',
  'subpkg_assets/images/special_wild.png',
  'subpkg_assets/images/special_bomb.png',
  'subpkg_assets/images/special_frozen_overlay.png',
  'subpkg_assets/images/special_chain_overlay.png',
  'subpkg_assets/images/special_block.png',
  'subpkg_assets/images/special_timer_bomb.png',
  'subpkg_assets/images/special_intro_panel.png',
  'subpkg_assets/images/ui_button_blue.png',
  'subpkg_assets/images/ui_button_green.png',
  'subpkg_assets/images/ui_button_orange.png',
  'subpkg_assets/images/ui_button_purple.png',
  'subpkg_assets/images/ui_icon_back.png',
  'subpkg_assets/images/ui_icon_close.png',
  'subpkg_assets/images/ui_icon_lock.png',
  'subpkg_assets/images/ui_icon_medal.png',
  'subpkg_assets/images/ui_icon_rank.png',
  'subpkg_assets/images/ui_icon_skin.png',
  'subpkg_assets/images/ui_icon_star.png',
  'subpkg_assets/images/ui_panel_hud.png',
  'subpkg_assets/images/ui_panel_popup.png',
  'subpkg_assets/images/ui_progress_bar.png',
  'subpkg_assets/images/ui_tab_active.png',
  'subpkg_assets/images/ui_tab_inactive.png',
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
