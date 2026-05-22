// 在 sharedCanvas 上绘制好友榜：前三领奖台 + 第4名起细行列表（风格对齐全服榜）

var utils = require('./utils.js');

var PODIUM_SHEET = 'images/rank_top_podium_sheet.png';
var PODIUM_FRAMES = {
  top1: { x: 467, y: 4, w: 494, h: 832 },
  top2: { x: 4, y: 88, w: 451, h: 663 },
  top3: { x: 973, y: 104, w: 436, h: 632 },
};

var PODIUM_ZONE_H = 300;
var ROW_HEIGHT = 56;
var ROW_GAP = 6;
var PADDING_X = 24;
var AVATAR_RADIUS_ROW = 22;
var IMAGE_CACHE = {};

var ASSETS = {
  podiumSheet: null,
  podiumReady: false,
  podiumLoading: false,
};

function setRedrawTrigger(redrawFn) {
  IMAGE_CACHE.__onLoad = redrawFn;
}

function clearCache() {
  for (var k in IMAGE_CACHE) {
    if (k !== '__onLoad') {
      delete IMAGE_CACHE[k];
    }
  }
}

function clearCanvas(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.restore();
}

function drawEmptyState(ctx, w, h, message) {
  clearCanvas(ctx, w, h);
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var lines = String(message || '').split('\n');
  var lineH = 30;
  var startY = h / 2 - ((lines.length - 1) * lineH) / 2;
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, startY + i * lineH);
  }
}

function computeCanvasHeight(entryCount) {
  var listCount = Math.max(0, (entryCount || 0) - 3);
  return PODIUM_ZONE_H + listCount * (ROW_HEIGHT + ROW_GAP) + 20;
}

function loadPodiumSheet(done) {
  if (ASSETS.podiumReady && ASSETS.podiumSheet) {
    done(true);
    return;
  }
  if (ASSETS.podiumLoading) {
    done(false);
    return;
  }
  if (!wx || !wx.createImage) {
    done(false);
    return;
  }
  ASSETS.podiumLoading = true;
  var img = wx.createImage();
  img.onload = function () {
    ASSETS.podiumSheet = img;
    ASSETS.podiumReady = true;
    ASSETS.podiumLoading = false;
    done(true);
  };
  img.onerror = function () {
    ASSETS.podiumReady = false;
    ASSETS.podiumLoading = false;
    done(false);
  };
  img.src = PODIUM_SHEET;
}

function drawPodiumFrame(ctx, frameKey, x, y, w) {
  var f = PODIUM_FRAMES[frameKey];
  var h = w * f.h / f.w;
  if (ASSETS.podiumReady && ASSETS.podiumSheet) {
    ctx.drawImage(ASSETS.podiumSheet, f.x, f.y, f.w, f.h, x, y, w, h);
    return h;
  }
  // 资源未加载时的简易占位框
  ctx.save();
  var colors = { top1: '#E8B923', top2: '#B8C4D4', top3: '#C98A52' };
  ctx.fillStyle = colors[frameKey] || '#94A3B8';
  ctx.globalAlpha = 0.35;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.restore();
  return h;
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

function drawPodiumCard(ctx, placement, metricLabel) {
  var entry = placement.entry;
  if (!entry) {
    drawPodiumFrame(ctx, placement.frame, placement.x, placement.y, placement.w);
    return;
  }

  var frameH = drawPodiumFrame(ctx, placement.frame, placement.x, placement.y, placement.w);
  var isTop1 = placement.frame === 'top1';
  var avatarR = isTop1 ? 40 : 34;
  var avatarY = placement.y + (isTop1 ? 100 : 50);
  var avatarX = placement.x + placement.w / 2;

  utils.drawCircleAvatar(
    ctx,
    entry.avatarUrl,
    avatarX,
    avatarY,
    avatarR,
    IMAGE_CACHE,
    entry.nickname,
  );

  ctx.save();
  ctx.fillStyle = '#1E3A5F';
  ctx.font = 'bold ' + (isTop1 ? 20 : 17) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  var nick = utils.truncateNickname(entry.nickname || '微信好友', 6);
  ctx.strokeText(nick, avatarX, avatarY + avatarR + 6);
  ctx.fillText(nick, avatarX, avatarY + avatarR + 6);
  ctx.restore();

  var valueText = metricLabel === '星'
    ? ('★ ' + utils.formatNumber(entry.value))
    : utils.formatNumber(entry.value);
  ctx.save();
  ctx.fillStyle = '#FFF8E7';
  ctx.font = 'bold ' + (isTop1 ? 26 : 22) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.strokeStyle = '#7A3A08';
  ctx.lineWidth = 4;
  var nameLineH = isTop1 ? 24 : 20;
  var scoreY = avatarY + avatarR * 2 + 6 + nameLineH + (isTop1 ? 10 : 8);
  ctx.strokeText(valueText, avatarX, scoreY);
  ctx.fillText(valueText, avatarX, scoreY);
  ctx.restore();

  if (entry.isMe) {
    ctx.save();
    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('我', avatarX, placement.y + frameH - 18);
    ctx.restore();
  }
}

function drawPodiumTop3(ctx, w, entries, metricLabel) {
  var top3 = entries.slice(0, 3);
  var sideW = 165;
  var centerW = 190;
  var placements = [
    { entry: top3[1], x: 56, y: 80, frame: 'top2', w: sideW },
    { entry: top3[0], x: (w - centerW) / 2, y: 0, frame: 'top1', w: centerW },
    { entry: top3[2], x: w - sideW - 64, y: 78, frame: 'top3', w: sideW },
  ];
  for (var i = 0; i < placements.length; i++) {
    drawPodiumCard(ctx, placements[i], metricLabel);
  }
}

function drawCompactRow(ctx, x, y, w, entry, rank, isMe, metricLabel) {
  ctx.save();
  roundRect(ctx, x, y, w, ROW_HEIGHT, 12);
  ctx.fillStyle = isMe ? 'rgba(255, 248, 225, 0.95)' : 'rgba(237, 245, 255, 0.92)';
  ctx.fill();
  ctx.strokeStyle = isMe ? 'rgba(250, 204, 21, 0.75)' : 'rgba(147, 197, 253, 0.55)';
  ctx.lineWidth = isMe ? 2 : 1;
  ctx.stroke();
  ctx.restore();

  var cy = y + ROW_HEIGHT / 2;

  ctx.save();
  if (rank <= 3) {
    ctx.font = '22px sans-serif';
    ctx.fillText(rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉', x + 26, cy + 1);
  } else {
    ctx.fillStyle = '#0B4A8B';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(rank), x + 26, cy);
  }
  ctx.restore();

  var avatarX = x + 58 + AVATAR_RADIUS_ROW;
  utils.drawCircleAvatar(ctx, entry.avatarUrl, avatarX, cy, AVATAR_RADIUS_ROW, IMAGE_CACHE, entry.nickname);

  ctx.save();
  ctx.fillStyle = '#102F64';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  var name = utils.truncateNickname(entry.nickname || '微信好友', 10);
  ctx.fillText(name, avatarX + AVATAR_RADIUS_ROW + 12, cy);
  ctx.restore();

  if (isMe) {
    ctx.save();
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 11px sans-serif';
    var tagX = avatarX + AVATAR_RADIUS_ROW + 12 + ctx.measureText(name).width + 6;
    ctx.fillStyle = '#FACC15';
    roundRect(ctx, tagX, cy - 9, 22, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#1F2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('我', tagX + 11, cy);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = '#0B4A8B';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  var valueText = metricLabel === '星'
    ? ('★ ' + utils.formatNumber(entry.value))
    : utils.formatNumber(entry.value);
  ctx.fillText(valueText, x + w - 14, cy - 6);
  if (metricLabel === '星') {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText('星', x + w - 14, cy + 12);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText('分', x + w - 14, cy + 12);
  }
  ctx.restore();
}

function drawFriendList(ctx, w, h, entries, metricLabel, viewport) {
  clearCanvas(ctx, w, h);

  if (!entries || entries.length === 0) {
    drawEmptyState(ctx, w, h, '还没有好友数据\n邀请好友一起玩吧');
    return;
  }

  var listStartY = (viewport && viewport.listStartY) || PODIUM_ZONE_H;
  var rowW = w - PADDING_X * 2;

  function paint() {
    drawPodiumTop3(ctx, w, entries, metricLabel);
    for (var i = 3; i < entries.length; i++) {
      var y = listStartY + (i - 3) * (ROW_HEIGHT + ROW_GAP);
      if (y + ROW_HEIGHT < 0 || y > h + 80) continue;
      drawCompactRow(
        ctx,
        PADDING_X,
        y,
        rowW,
        entries[i],
        i + 1,
        entries[i].isMe,
        metricLabel,
      );
    }
  }

  loadPodiumSheet(function () {
    clearCanvas(ctx, w, h);
    if (!entries || entries.length === 0) {
      drawEmptyState(ctx, w, h, '还没有好友数据\n邀请好友一起玩吧');
      return;
    }
    paint();
  });
}

module.exports = {
  drawFriendList: drawFriendList,
  drawEmptyState: drawEmptyState,
  setRedrawTrigger: setRedrawTrigger,
  clearCache: clearCache,
  computeCanvasHeight: computeCanvasHeight,
  PODIUM_ZONE_H: PODIUM_ZONE_H,
};
