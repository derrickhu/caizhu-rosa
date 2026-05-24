# 彩珠五连微信小游戏宣传图规范与提示词

参考方向：同级 `game_assets/hot-pot/推广` 的推广图使用高饱和卡通手游广告感、醒目中文标题、玩法元素重组，而不是直接复用截图。玩法亮点：海蓝泡泡背景、9x9 棋盘、彩色玻璃珠、下一步预览、关卡目标、剩余步数、同色爆破/十字清场/万能预备道具。

官方参考：[微信小游戏素材规范](https://game.weixin.qq.com/cgi-bin/minigame/static/minigame_setting/guide.html)

## 素材规格总表

| 类型 | 尺寸 | 格式 | 体积 | 文案 / 品牌 |
|------|------|------|------|-------------|
| **通用素材封面** | 650×250 | JPG/JPEG | **< 80 KB** | **纯玩法，无图标、无游戏名**；`--no-text` |
| 横版宣传图 | 1280×720 | JPG | ≤ 200 KB | 可后期叠中文标题 |
| 竖版宣传图 | 720×1280 | JPG | < 200 KB | 可后期叠中文标题 |
| 分享卡片（项目内） | 500×400 等 | JPG | 按接入约定 | 见 `promo_wechat_share_cards_prompt.md` |

通用素材封面每月后台限改 **3 次**（以微信平台为准）。

## 生图与导出流程

1. 用 Gemini 生成 **16:9** 高清原图（通用封面、横版）或 **9:16**（竖版）；提示词里禁止 AI 写字（通用封面禁止一切文字与 Logo）。
2. 用 `export_wechat_promo.py` 裁剪、压缩并校验，勿直接上传 AI 原图。

```bash
python3 ~/.cursor/skills/wechat-minigame-promo-assets/scripts/export_wechat_promo.py \
  --input ../game_assets/caizhu-rosa/推广/cover_banner_gameplay_v1.png \
  --output ../game_assets/caizhu-rosa/推广/conformed/cover_banner_650x250_gameplay_v1.jpg \
  --type banner \
  --no-text --y-bias 0.42
```

- `banner` → 650×250，<80KB；`landscape` → 1280×720，≤200KB；`portrait` → 720×1280，<200KB
- **落盘（与横竖版一致）**：高清原图 → `game_assets/caizhu-rosa/推广/`；合规终稿 → `game_assets/caizhu-rosa/推广/conformed/`（文件名含尺寸，如 `_650x250`、`_1280x720`）；审核后再拷入 `minigame/`

### 内容共性要求

- 重组玩法元素，**不要**直接贴游戏截图；缩略图也要能认出棋盘与彩珠。
- 禁止：水印、二维码、应用商店角标、截图式 HUD、乱码假字。
- 横/竖版宣传图：中文标题建议生图无字 + 导出脚本 `--title` 叠字；通用素材封面：**全程无字、无图标、无游戏名**。

### 质检清单

- [ ] `export_wechat_promo.py` 输出 `size_ok` 与 `bytes_ok` 均为 true
- [ ] 无乱码、无水印、非纯截图
- [ ] 通用素材封面：无 Logo、无游戏名、无图标

---

## cover_banner_650x250_gameplay（通用素材封面）

导出：`--type banner --no-text`。终稿：`推广/conformed/cover_banner_650x250_<theme>_v1.jpg`；原图：`推广/cover_banner_<theme>_v1.png`。

```text
16:9 ultra-wide promotional illustration for a casual marble line-matching puzzle WeChat Mini Game.

Art style: premium polished 2.5D casual mobile game key art, vibrant cartoon, glossy glass marbles, soft bevels, high saturation, cyan-purple ocean bubble fantasy background with floating beads and sparkles, strong contrast, readable at small thumbnail size. Not photoreal, not a UI screenshot.

Main composition (gameplay only, no branding):
- Center: a large playful 9x9 puzzle board with rounded cream cells and glossy purple frame, tilted slightly for depth
- Hero moment: five red glass marbles in one glowing diagonal line with bright white-gold connection beam, lens flares, and clearing sparkles — clearly shows "connect five same-color marbles"
- Foreground: a few oversized colorful marbles (red, yellow, blue, green, orange) floating at edges with motion blur
- Background: soft layered ocean-blue bubble ribbons, bokeh lights, dreamy atmosphere
- Optional subtle: tiny preview marbles hinting "place three new balls each turn" — keep minimal, no HUD panels

Hard bans:
NO text, NO letters, NO Chinese characters, NO numbers, NO logo, NO app icon, NO game title, NO watermark, NO UI screenshot, NO buttons, NO captions, NO speech bubbles, NO ad badges, NO QR code, NO black or white borders, NO cluttered collage.

Leave clean negative space at far left and far right edges for ultra-wide crop. Full-bleed illustration.
```

---

## 横版 / 竖版宣传图提示词

### landscape_01_combo_bubbles

```text
16:9 horizontal WeChat Mini Game promotional key art for a casual puzzle game named 彩珠五连.

Create one complete designed advertising poster, not a raw UI screenshot. Use the reference game screenshots only to extract highlights: glossy colorful marbles, a square puzzle board, ocean-blue bubble fantasy background, next-piece preview, combo clearing effects.

Art style: premium polished 2.5D casual mobile game ad key art, vibrant cartoon, glossy rounded UI, high saturation, soft bevels, toy-like glass marbles, clean silhouettes, bright cyan and purple ocean bubble background, strong contrast, readable at thumbnail size.

Composition: full-bleed cinematic horizontal banner. Left side has a large playful 9x9 puzzle board tilted slightly in perspective, with five same-color red marbles connecting in a glowing line and bursting into sparkles. Center foreground has oversized glossy marbles flying outward: red, yellow, blue, green, purple, cyan, orange. Right side has a polished headline sticker integrated into the design, with room for all characters to be clear.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 彩珠五连
Subtitle EXACTLY: 一步连消爽翻天

Typography style: bold Chinese mobile game POP title, yellow-to-white fill, deep blue outer outline, small orange shadow, glossy highlight, no extra text.

Important constraints: The design can be inspired by the provided screenshots but must NOT copy the screenshot layout exactly. No ad badge, no QR code, no app store badge, no watermark, no English letters, no fake small UI labels, no random numbers. Only the two Chinese text strings above may appear.
```

## landscape_02_props_power

```text
16:9 horizontal WeChat Mini Game promotional poster for 彩珠五连, a glossy marble puzzle game.

Use the reference screenshots to extract game hooks, then recompose them as advertising art: colorful glass marbles, ocean bubble background, three power-up tools, playful puzzle board, explosive combo feedback.

Art style: high-end casual mobile game ad, vibrant cartoon, glossy 2.5D, rounded shapes, saturated cyan blue and violet lighting, sparkles, confetti, soft shadows, clean commercial poster design.

Composition: full-bleed horizontal hero layout. Center is a dramatic puzzle-board moment where three power-ups are shown as large polished icons: a red bomb for 同色爆破, a cross-shaped beam for 十字清场, and a rainbow marble for 万能预备. The power-ups orbit above the board and send colorful beams through rows and columns. Background has the game's blue underwater-bubble fantasy ribbons and floating beads. Keep the image energetic but uncluttered.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 神奇道具
Subtitle EXACTLY: 一点清屏超解压

Typography style: thick rounded Chinese POP font, bright yellow fill, white inner highlight, dark blue outline, orange drop shadow, sticker-like title plaque.

Constraints: Not a direct screenshot, no UI copy-paste, no English letters, no extra Chinese, no watermark, no logo, no QR code, no app badges, no random numbers.
```

## landscape_03_level_challenge

```text
16:9 horizontal promotional illustration for 彩珠五连, a WeChat Mini Game puzzle challenge.

Use the game screenshots as visual reference only: level panel, target score stars, remaining steps, next marbles, square board, bright ocean bubble background. Rebuild these elements into a polished ad composition.

Art style: premium cartoon mobile game advertising key art, glossy rounded UI, toy-like glass marbles, blue-cyan fantasy bubbles, bright highlights, soft 3D volume, thick clean outlines, readable at small size.

Composition: horizontal cinematic scene. Left and center show a heroic challenge panel floating above a big puzzle board, three glowing star milestones rising upward, an hourglass/step icon shining, and the next marbles queue leading into the board. The board is partially visible with green, blue, purple, yellow and red marbles arranged for a clever move. Right side contains large title text on a curved blue ribbon panel. Add celebratory sparkles and reward coins without clutter.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 闯关挑战
Subtitle EXACTLY: 步步都要想清楚

Typography style: bold Chinese headline, white and yellow fill, deep navy outline, cyan glow, premium mobile game sticker feel.

Constraints: Do not duplicate the screenshot exactly. No English letters, no fake glyphs, no extra small UI text, no watermark, no logo, no QR code, no app store badge.
```

## portrait_01_real_gameplay

```text
9:16 vertical WeChat Mini Game promotional poster for 彩珠五连.

Create one complete designed poster with the artwork and Chinese advertising text together. Use the provided screenshots only as gameplay reference: ocean bubble background, 9x9 square board, glossy colored marbles, top score/next preview, satisfying five-in-a-row clear.

Art style: premium polished casual mobile game ad, vibrant cartoon, glossy rounded UI, high saturation, toy-like glass marbles, soft bevel, strong contrast, clean hierarchy, inspired by hot-pot promo poster framing.

Composition from top to bottom:
1. Thick rounded poster frame in aqua blue and purple, decorated with bubble stickers and small glossy marbles.
2. Top 70% inner artwork: a recomposed game scene with a large square puzzle board in perspective, a glowing five-in-a-row combo of purple marbles, particle burst, score stars and small next-piece queue floating above. It should look like the actual gameplay but more polished and dramatic, not a raw screenshot.
3. Bottom 30% title area: white curved scroll/ribbon with large Chinese headline and smaller subtitle, integrated into the design.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 五连爆爽
Subtitle EXACTLY: 彩珠一摆就上头

Typography style: thick rounded Chinese POP font, yellow fill, white shine, dark blue outer outline, orange shadow, strong thumbnail readability.

Constraints: Only these Chinese text strings. No English letters, no watermark, no logo, no QR code, no app store badges, no random numbers, no ad labels, no messy small text.
```

## portrait_02_props_showcase

```text
9:16 vertical promotional poster for 彩珠五连, a colorful marble puzzle WeChat Mini Game.

Create a designed poster with Chinese text included. Use the reference screenshots to extract the game's real power-up highlights: 同色爆破, 十字清场, 万能预备, glossy marble board, ocean bubble environment.

Art style: high quality 2.5D casual mobile game advertisement, vibrant cartoon, glossy marbles, rounded UI, saturated blue/purple/cyan background, sparkles, clean composition, readable at thumbnail size.

Composition from top to bottom:
1. Aqua rounded poster border with bubble decorations.
2. Top/middle artwork: three oversized power-up icons arranged in a triangular hero composition above a puzzle board: red bomb marble, colorful cross-clear board beam, rainbow reserve marble. The effects clear rows and colors on the board with bright beams and star particles.
3. Bottom title scroll/ribbon area with bold Chinese headline and subtitle.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 道具开挂
Subtitle EXACTLY: 困局一秒反转

Typography style: bold yellow Chinese POP title with deep blue outline, glossy highlights, orange shadow; subtitle white on red-orange ribbon.

Constraints: Do not copy UI screenshots directly. No English letters, no extra Chinese, no random UI labels, no watermark, no logo, no QR code, no app badges.
```

## portrait_03_ocean_collection

```text
9:16 vertical WeChat Mini Game promotional poster for 彩珠五连.

Design one complete poster with artwork and Chinese marketing text together. Extract visual identity from the provided screenshots: sea-blue bubble background, colorful glossy marbles, puzzle board, next marbles preview, relaxing casual puzzle feel.

Art style: premium polished mobile puzzle game ad, vibrant cartoon, glossy toy-like marbles, high saturation, blue ocean fantasy, luminous bubbles, soft 3D bevel, clear foreground/midground/background depth, cute and relaxing.

Composition from top to bottom:
1. Rounded aqua-purple poster frame decorated with floating bubbles and small marbles.
2. Main artwork: a magical ocean bubble stage filled with many collectible marble colors floating like pearls. In the center, a clean puzzle board glows with a clever next move; a rainbow marble and orange/yellow/green/purple marbles float toward the board, showing relaxing strategic play.
3. Bottom white scroll/ribbon with Chinese headline and subtitle.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 珠光泡泡
Subtitle EXACTLY: 轻松消除停不下

Typography style: thick rounded Chinese POP lettering, yellow-white fill, dark blue outline, cyan glow, soft shadow, playful mobile game poster style.

Constraints: Not a direct screenshot, no English letters, no fake unreadable glyphs, no extra text, no watermark, no logo, no QR code, no app store badge, no black border.
```

## portrait_01_real_gameplay_v2_five_connected

```text
9:16 vertical WeChat Mini Game promotional poster for 彩珠五连.

Regenerate the gameplay-focused vertical poster. The key correction: the board MUST clearly show exactly five same-color marbles connected together in one unbroken straight horizontal line, adjacent cell by adjacent cell, no gaps, no different colors between them. This five-in-a-row line must be the main visual focus.

Use the provided modern game screenshot only as gameplay reference: ocean bubble background, 9x9 square grid, glossy colored marbles, top score panel, next marbles preview. Recompose it as a designed advertising poster, not a raw screenshot.

Art style: premium polished casual mobile game ad, vibrant cartoon, glossy rounded UI, high saturation, toy-like glass marbles, soft bevel, strong contrast, clear mobile game typography, blue-cyan bubble fantasy background.

Composition from top to bottom:
1. Aqua and purple rounded poster frame with bubble and marble decorations.
2. Top 70% inner artwork: large square 9x9 puzzle board in perspective. In the center row, place EXACTLY FIVE purple marbles in five neighboring cells, touching horizontally as a continuous line. Put a bright golden clearing glow behind this row, sparkles and small star particles around it. Other marbles must stay away from this row so the five connected marbles are unmistakable.
3. Add a small next-piece preview panel above the board with three small marbles, but do not let it distract from the five connected line.
4. Bottom 30% title ribbon.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 五珠连成线
Subtitle EXACTLY: 老玩家一看就懂

Typography style: thick rounded Chinese POP title, yellow-white fill, dark blue outline, orange shadow, glossy highlight, sticker-like scroll banner.

Strict constraints: the five connected marbles must be obvious. No diagonal five, no separated marbles, no four-in-a-row, no six-in-a-row. No English letters, no watermark, no logo, no QR code, no app store badge, no random numbers, no fake small UI labels.
```

## landscape_04_classic_memory

```text
16:9 horizontal WeChat Mini Game promotional poster for 彩珠五连, inspired by the classic old PC "Lines / five marbles in a row" layout from around 20 years ago.

Use the provided old classic-game reference only for nostalgic layout ideas: central square grid, colored balls, side panels, simple desktop-game feeling. Do NOT copy its characters, watermark, window title bar, English words, or low-quality photo look. Rebuild it as polished modern mobile ad art with a retro memory feeling.

Art style: premium 2.5D casual mobile game advertisement, modern glossy marbles and clean board, with subtle retro computer-game nostalgia: soft CRT glow, warm desk light, blue-gray classic window-panel shapes, 2000s puzzle-game memory, but still vivid and high quality.

Composition: horizontal banner. Center has a large clean 9x9 grid with glossy colored balls. In the exact middle of the board, show five red marbles in one unbroken horizontal line, adjacent and glowing, clearly demonstrating the classic five-in-a-row rule. Left and right sides have simplified nostalgic side panels like an old puzzle game, but redesigned as friendly cartoon UI panels, no English labels. Background blends an old beige computer-room glow with the current game's blue bubble effects. Add tiny sparkles where the five balls clear.

Chinese promotional text must be part of the poster, large and emotional:
Main title EXACTLY: 当年那一局
Subtitle EXACTLY: 五珠一线回青春

Typography style: big readable Chinese title, golden yellow fill, dark navy outline, slight retro pixel shine mixed with modern glossy mobile-game sticker style.

Constraints: no English letters, no watermark, no photo border, no QR code, no app badge, no copied old-game characters, no fake tiny text. The classic five-in-a-row layout must be instantly recognizable.
```

## portrait_04_classic_memory

```text
9:16 vertical WeChat Mini Game promotional poster for 彩珠五连, designed to make players who played classic five-in-a-row marble games 20 years ago instantly remember the old feeling.

Use the provided old classic-game reference only as layout inspiration: square grid with colored balls, nostalgic desktop puzzle-game side panels. Do NOT copy its exact characters, watermark, English labels, window chrome, or blurry photo quality. Combine nostalgia with the current game's polished ocean-bubble marble style.

Art style: polished casual mobile game ad, glossy 2.5D marbles, clean rounded UI, nostalgic retro PC puzzle-game mood, soft CRT glow, warm beige and blue-cyan color blend, high saturation, readable at thumbnail size.

Composition from top to bottom:
1. Top title area with big emotional Chinese headline.
2. Main art: a vertical poster frame showing a classic 9x9 grid centered on screen. The board is flatter and more old-school than the modern version, but with beautiful glossy marbles. In the center row, show exactly five same-color blue marbles in a perfect unbroken horizontal line, adjacent cells, glowing as they are about to disappear.
3. Side decorations hint at old desktop game panels with simple crowned marble mascots, but redesigned and cute, no English text.
4. Bottom ribbon subtitle, with a few bubbles and sparkles linking the old memory to the new mobile version.

Chinese promotional text must be part of the poster, large and readable:
Main title EXACTLY: 二十年前的快乐
Subtitle EXACTLY: 还是五颗连一起

Typography style: bold Chinese poster lettering, warm yellow fill, cream highlights, deep blue outline, subtle retro screen glow, modern sticker shadow.

Strict constraints: exactly five connected blue marbles in one horizontal line must be visible. No English letters, no watermark, no QR code, no app badge, no random small text, no copied screenshot, no blurry camera photo look.
```

## portrait_04_classic_memory_v2_no_text

```text
9:16 vertical promotional artwork for 彩珠五连, inspired by the classic old PC five-in-a-row marble game layout from around 20 years ago.

IMPORTANT: Generate artwork only. Leave clean empty title plaques for later real-font Chinese overlay. Do NOT draw any text, letters, numbers, labels, captions, UI words, logo, watermark, or fake glyphs anywhere.

Use the provided old classic-game reference only as nostalgic layout inspiration: a central square grid with colored balls, simple side panels, old desktop puzzle-game feeling. Do NOT copy its exact characters, watermark, English labels, window chrome, or blurry photo quality. Rebuild it as polished modern mobile promotional artwork.

Art style: polished casual mobile game ad, glossy 2.5D marbles, clean rounded UI, nostalgic retro PC puzzle-game mood, soft CRT glow, warm beige and blue-cyan color blend, high saturation, readable at thumbnail size.

Composition from top to bottom:
1. Top 18%: one large clean cream-and-teal empty title plaque with no text. It must be visually simple and leave enough room for a short Chinese headline later.
2. Middle 60%: a classic 9x9 grid centered on screen. The board is flatter and more old-school than the modern version, but with beautiful glossy marbles. In the center row, show exactly five same-color blue marbles in a perfect unbroken horizontal line, adjacent cells, glowing as they are about to disappear. Keep the five connected marbles very obvious.
3. Left and right sides: cute redesigned marble mascots or side-panel decorations that suggest old desktop puzzle games, but no labels or words.
4. Bottom 22%: one clean white scroll ribbon with no text, reserved for later subtitle overlay. Add a few bubbles and sparkles linking the old memory to the new mobile version.

Strict constraints: NO text, NO Chinese characters, NO English letters, NO numbers, NO logo, NO watermark, NO QR code, NO app badge, NO fake UI labels, NO random glyphs. Exactly five connected blue marbles in one horizontal line must be visible.
```

## portrait_04_classic_memory_v3_gemini_text

```text
9:16 vertical WeChat Mini Game promotional poster for 彩珠五连, with the artwork and Chinese promotional words generated together in one coherent image.

Goal: make players who played classic five-in-a-row marble games around 20 years ago immediately feel nostalgia. The poster should look like a polished modern mobile ad inspired by an old PC puzzle game layout.

Use the provided old classic-game reference only for layout memory: central square grid, colored balls, left and right side panels, old desktop puzzle-game feeling. Do NOT copy its exact characters, watermark, English labels, window title bar, or blurry photo look.

Art style: premium 2.5D casual mobile game ad, glossy marbles, clean rounded UI, retro PC puzzle-game nostalgia, soft CRT glow, warm beige plus blue-cyan bubble accents, high saturation, readable at thumbnail size.

Composition:
1. Top title plaque: a large cream-and-teal plaque with ONLY four Chinese characters, EXACTLY: 当年那局
2. Middle gameplay: a classic 9x9 grid centered on the poster. In the center row, show EXACTLY FIVE blue marbles connected horizontally in five adjacent cells, glowing as a clear five-in-a-row moment. Make this line unmistakable.
3. Left and right side panels: cute redesigned marble mascots on columns, inspired by old desktop puzzle games, but no labels or words.
4. Bottom scroll ribbon: ONLY four Chinese characters, EXACTLY: 还是五连

Typography requirements:
- The top title “当年那局” must be large, centered, complete, not cropped, not stacked.
- The bottom subtitle “还是五连” must be centered on the white scroll ribbon, complete, not cropped, not stacked.
- Use bold rounded Chinese mobile-game POP lettering, cream/yellow fill, dark teal outline, soft shadow, matching the artwork.

Strict text constraints: Generate ONLY these two Chinese strings: 当年那局 and 还是五连. NO other text, NO English letters, NO numbers, NO labels, NO fake glyphs, NO watermark, NO QR code, NO app badge, NO duplicated text, NO overlapping text.
```
