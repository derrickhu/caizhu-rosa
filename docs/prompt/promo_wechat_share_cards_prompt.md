# 彩珠五连微信分享卡片提示词

目标：生成 2 张风格不同的微信小游戏分享卡片，用于 `wx.onShareAppMessage` 和 `wx.onShareTimeline`。最终接入游戏包内资源，导出为 `500x400 JPG`。

## share_card_combo_yellow

```text
Create one 4:3 horizontal WeChat mini-game share card for 彩珠五连, a colorful five-in-a-row marble puzzle game.

Style: premium polished casual mobile game share image, warm golden yellow and orange theme, glossy 2D cartoon marbles, thick clean outlines, high contrast, simple and readable.

Composition:
- Full-bleed warm golden yellow / orange gradient background.
- Center-left has a large rainbow magic marble with 6 colorful glossy marbles around it in a controlled cluster, not spread to edges.
- Add short white-gold clearing beams behind the center marble, showing satisfying five-in-a-row clearing power.
- Right side has a clean rounded title sticker area with Chinese text.
- Keep all important elements inside safe margins for WeChat share preview cropping.

Chinese text must be part of the poster, large and readable:
Main title EXACTLY: 彩珠五连
Subtitle EXACTLY: 五珠成线 爽快消除

Typography: bold rounded Chinese POP lettering, white/yellow fill, dark brown outline, orange shadow, complete readable characters.

Strict constraints: Generate only these Chinese strings. NO English letters, NO extra Chinese, NO numbers, NO watermark, NO QR code, NO app store badge, NO fake glyphs, NO messy tiny UI text.
```

## share_card_board_ocean

```text
Create one 4:3 horizontal WeChat mini-game share card for 彩珠五连, a colorful five-in-a-row marble puzzle game.

Style: clean ocean-blue casual puzzle game advertising card, glossy 2.5D marbles, fresh cyan/navy background, high contrast, polished but uncluttered.

Composition:
- Full-bleed ocean cyan to deep blue gradient background with a few large soft bubbles.
- Center shows a simplified tilted puzzle board, only a few grid cells visible, with exactly five same-color red marbles connected in one clear horizontal line.
- Add a small next-marble preview and sparkle clearing effect, but keep the board simple and readable.
- Left or top-left has a large title sticker area with Chinese text.
- Keep the composition bold and clean, suitable for a small WeChat share card preview.

Chinese text must be part of the poster, large and readable:
Main title EXACTLY: 五珠连线
Subtitle EXACTLY: 老玩家都懂的快乐

Typography: thick rounded Chinese mobile-game POP font, yellow-white fill, deep blue outline, soft cyan glow, complete readable characters.

Strict constraints: the five connected red marbles must be obvious. Generate only these Chinese strings. NO English letters, NO extra Chinese, NO numbers, NO watermark, NO QR code, NO app store badge, NO fake glyphs, NO messy tiny UI text.
```
