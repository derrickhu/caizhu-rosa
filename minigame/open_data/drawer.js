// 好友榜：canvas 尺寸只读，按主域传入的 listWidth / rowHeight 换算像素布局

var utils = require('./utils.js');

var DESIGN_W = 750;

var ROW_PANEL = 'images/rank_row_panel.png';
var ROW_PANEL_BORDER = { left: 64, top: 20, right: 64, bottom: 20 };

var LIST_TOP = 8;
var PADDING_X = 30;
var FONT_FAMILY = 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif';

var IMAGE_CACHE = {};
var ASSETS = { rowPanel: null, rowReady: false, rowLoading: false };

function setRedrawTrigger(redrawFn) {
  IMAGE_CACHE.__onLoad = redrawFn;
}

function clearCache() {
  for (var k in IMAGE_CACHE) {
    if (k !== '__onLoad') delete IMAGE_CACHE[k];
  }
}

function prepCtx(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.imageSmoothingQuality === 'string') {
    ctx.imageSmoothingQuality = 'high';
  }
}

function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

/**
 * 与全服榜行高对齐：主域显示时 scale=listW/cw，故 canvas 上 rowH = targetRowH * cw / listW。
 *
 * 列布局采用「相对前一列依次排版」策略，避免按 k 各自缩放后互相穿插。
 * 所有 X 都是「相对行起点 x」的偏移（除 valueX 是 canvasW 上的绝对 x，与原代码保持兼容）。
 *   rankX        : 名次列居中 x（相对 x）
 *   avatarCx     : 头像圆心 x（相对 x）
 *   nameX        : 昵称左对齐 x（相对 x）
 *   valueX       : 分数右对齐 x（canvas 绝对 x）
 */
function getLayout(canvasW, listW, targetRowH) {
  var k = canvasW > 0 ? canvasW / DESIGN_W : 1;
  var rowH = Math.max(40, Math.round(targetRowH * canvasW / listW));
  var rowGap = Math.max(4, Math.round(8 * k));
  var pad = Math.max(12, Math.round(PADDING_X * k));

  var avatarR = Math.max(16, Math.round(24 * k));
  var rankColW = Math.max(36, Math.round(48 * k));
  var rankX = Math.round(rankColW / 2);
  var avatarCx = rankColW + avatarR + Math.max(6, Math.round(8 * k));
  var nameX = avatarCx + avatarR + Math.max(12, Math.round(16 * k));
  var valueX = canvasW - pad - Math.max(6, Math.round(8 * k));

  return {
    pad: pad,
    rowH: rowH,
    rowGap: rowGap,
    rowW: canvasW - pad * 2,
    avatarR: avatarR,
    avatarCx: avatarCx,
    rankX: rankX,
    nameX: nameX,
    valueX: valueX,
    fontRankMedal: Math.max(18, Math.round(20 * k)) + 'px ' + FONT_FAMILY,
    fontRankNum: 'bold ' + Math.max(14, Math.round(16 * k)) + 'px ' + FONT_FAMILY,
    fontName: 'bold ' + Math.max(15, Math.round(17 * k)) + 'px ' + FONT_FAMILY,
    fontValue: 'bold ' + Math.max(16, Math.round(18 * k)) + 'px ' + FONT_FAMILY,
    fontUnit: Math.max(10, Math.round(11 * k)) + 'px ' + FONT_FAMILY,
  };
}

function computeContentHeight(entryCount, layout) {
  var n = Math.max(0, entryCount || 0);
  if (n === 0) return 120;
  return LIST_TOP + n * (layout.rowH + layout.rowGap) + 16;
}

function loadRowPanel(done) {
  if (ASSETS.rowReady && ASSETS.rowPanel) {
    done(true);
    return;
  }
  if (ASSETS.rowLoading) {
    done(false);
    return;
  }
  if (!wx || !wx.createImage) {
    done(false);
    return;
  }
  ASSETS.rowLoading = true;
  var img = wx.createImage();
  img.onload = function () {
    ASSETS.rowPanel = img;
    ASSETS.rowReady = true;
    ASSETS.rowLoading = false;
    done(true);
  };
  img.onerror = function () {
    ASSETS.rowReady = false;
    ASSETS.rowLoading = false;
    done(false);
  };
  img.src = ROW_PANEL;
}

function drawNineSlice(ctx, img, x, y, w, h, border) {
  var iw = img.width;
  var ih = img.height;
  var l = border.left;
  var t = border.top;
  var r = border.right;
  var b = border.bottom;
  var cw = iw - l - r;
  var ch = ih - t - b;
  var dw = w - l - r;
  var dh = h - t - b;

  ctx.drawImage(img, 0, 0, l, t, x, y, l, t);
  ctx.drawImage(img, l, 0, cw, t, x + l, y, dw, t);
  ctx.drawImage(img, iw - r, 0, r, t, x + w - r, y, r, t);
  ctx.drawImage(img, 0, t, l, ch, x, y + t, l, dh);
  ctx.drawImage(img, l, t, cw, ch, x + l, y + t, dw, dh);
  ctx.drawImage(img, iw - r, t, r, ch, x + w - r, y + t, r, dh);
  ctx.drawImage(img, 0, ih - b, l, b, x, y + h - b, l, b);
  ctx.drawImage(img, l, ih - b, cw, b, x + l, y + h - b, dw, b);
  ctx.drawImage(img, iw - r, ih - b, r, b, x + w - r, y + h - b, r, b);
}

function drawRowPanelFallback(ctx, x, y, w, h, isMe) {
  roundRect(ctx, x, y, w, h, 12);
  var grad = ctx.createLinearGradient(x, y, x, y + h);
  if (isMe) {
    grad.addColorStop(0, '#FFF9E6');
    grad.addColorStop(1, '#FFF3C4');
  } else {
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#E8F4FF');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = isMe ? 'rgba(250, 204, 21, 0.9)' : 'rgba(96, 165, 250, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function strokeFillText(ctx, text, x, y, fill, stroke, lineW, font) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = lineW;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

function drawCompactRow(ctx, x, y, layout, entry, rank, isMe, metricLabel) {
  var w = layout.rowW;
  var h = layout.rowH;
  if (ASSETS.rowReady && ASSETS.rowPanel) {
    drawNineSlice(ctx, ASSETS.rowPanel, x, y, w, h, ROW_PANEL_BORDER);
  } else {
    drawRowPanelFallback(ctx, x, y, w, h, isMe);
  }

  var cy = y + h / 2;

  ctx.save();
  if (rank <= 3) {
    ctx.font = layout.fontRankMedal;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉', x + layout.rankX, cy);
  } else {
    strokeFillText(
      ctx,
      String(rank),
      x + layout.rankX,
      cy,
      '#0B4A8B',
      '#FFFFFF',
      2,
      layout.fontRankNum,
    );
  }
  ctx.restore();

  var avatarX = x + layout.avatarCx;
  utils.drawCircleAvatar(ctx, entry.avatarUrl, avatarX, cy, layout.avatarR, IMAGE_CACHE, entry.nickname);

  ctx.save();
  ctx.fillStyle = '#102F64';
  ctx.font = layout.fontName;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  var name = utils.truncateNickname(entry.nickname || '微信好友', 8);
  ctx.fillText(name, x + layout.nameX, cy);
  ctx.restore();

  if (isMe) {
    ctx.save();
    var tagX = x + layout.nameX + ctx.measureText(name).width + 4;
    ctx.fillStyle = '#FACC15';
    roundRect(ctx, tagX, cy - 8, 20, 15, 4);
    ctx.fill();
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 10px ' + FONT_FAMILY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('我', tagX + 10, cy);
    ctx.restore();
  }

  var valueText = utils.formatNumber(entry.value) + (metricLabel === '星' ? ' 星' : ' 分');

  ctx.save();
  ctx.fillStyle = '#0B4A8B';
  ctx.font = layout.fontValue;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeText(valueText, layout.valueX, cy);
  ctx.fillText(valueText, layout.valueX, cy);
  ctx.restore();
}

function drawTopMessage(ctx, w, h, message, layout) {
  prepCtx(ctx);
  clearCanvas(ctx, w, h);
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.font = layout ? layout.fontName : ('16px ' + FONT_FAMILY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  var lines = String(message || '').split('\n');
  var lineH = 24;
  var startY = LIST_TOP + 8;
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, startY + i * lineH);
  }
}

function drawFriendList(ctx, w, h, entries, metricLabel, listW, targetRowH, outCanvas) {
  var layout = getLayout(w, listW, targetRowH);

  if (!entries || entries.length === 0) {
    drawTopMessage(ctx, w, h, '还没有好友数据\n邀请好友一起玩吧', layout);
    if (outCanvas) outCanvas.contentHeight = 120;
    return;
  }

  function paint() {
    prepCtx(ctx);
    clearCanvas(ctx, w, h);
    for (var i = 0; i < entries.length; i++) {
      var rowY = LIST_TOP + i * (layout.rowH + layout.rowGap);
      drawCompactRow(ctx, layout.pad, rowY, layout, entries[i], i + 1, entries[i].isMe, metricLabel);
    }
    if (outCanvas) {
      outCanvas.contentHeight = computeContentHeight(entries.length, layout);
    }
  }

  loadRowPanel(function () {
    paint();
  });
}

module.exports = {
  drawFriendList: drawFriendList,
  drawEmptyState: drawTopMessage,
  setRedrawTrigger: setRedrawTrigger,
  clearCache: clearCache,
  computeContentHeight: computeContentHeight,
  getLayout: getLayout,
  LIST_TOP: LIST_TOP,
};
