// 在 sharedCanvas 上绘制好友榜列表（经典/关卡两种 metric）。

var utils = require('./utils.js');

var ROW_HEIGHT = 88;
var ROW_GAP = 8;
var PADDING_X = 28;
var AVATAR_RADIUS = 28;
var IMAGE_CACHE = {};

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
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0, 0, w, h);
  ctx.restore();
}

function drawEmptyState(ctx, w, h, message) {
  clearCanvas(ctx, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var lines = String(message || '').split('\n');
  var lineH = 32;
  var startY = h / 2 - ((lines.length - 1) * lineH) / 2;
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, startY + i * lineH);
  }
}

function drawRow(ctx, x, y, w, entry, rank, isMe, metricLabel) {
  // 背景胶囊
  ctx.save();
  ctx.beginPath();
  var r = 16;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + ROW_HEIGHT - r);
  ctx.quadraticCurveTo(x + w, y + ROW_HEIGHT, x + w - r, y + ROW_HEIGHT);
  ctx.lineTo(x + r, y + ROW_HEIGHT);
  ctx.quadraticCurveTo(x, y + ROW_HEIGHT, x, y + ROW_HEIGHT - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = isMe ? 'rgba(37,99,235,0.32)' : 'rgba(255,255,255,0.10)';
  ctx.fill();
  if (isMe) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(96,165,250,0.6)';
    ctx.stroke();
  }
  ctx.restore();

  // Rank
  ctx.save();
  ctx.fillStyle = rank <= 3 ? '#FACC15' : 'rgba(255,255,255,0.72)';
  ctx.font = (rank <= 3 ? 'bold 26px' : 'bold 22px') + ' sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(rank), x + 32, y + ROW_HEIGHT / 2);
  ctx.restore();

  // Avatar
  var avatarX = x + 70 + AVATAR_RADIUS;
  var avatarY = y + ROW_HEIGHT / 2;
  utils.drawCircleAvatar(ctx, entry.avatarUrl, avatarX, avatarY, AVATAR_RADIUS, IMAGE_CACHE, entry.nickname);

  // Nickname
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  var name = utils.truncateNickname(entry.nickname || '微信好友', 8);
  ctx.fillText(name, avatarX + AVATAR_RADIUS + 16, y + ROW_HEIGHT / 2 - 12);
  ctx.restore();

  // Sub label (rank meta)
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(isMe ? '我' : '好友', avatarX + AVATAR_RADIUS + 16, y + ROW_HEIGHT / 2 + 14);
  ctx.restore();

  // Score / stars on the right
  ctx.save();
  ctx.fillStyle = '#F4F6FA';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(utils.formatNumber(entry.value), x + w - PADDING_X, y + ROW_HEIGHT / 2 - 10);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '14px sans-serif';
  ctx.fillText(metricLabel, x + w - PADDING_X, y + ROW_HEIGHT / 2 + 14);
  ctx.restore();
}

function drawFriendList(ctx, w, h, entries, metricLabel, viewport) {
  clearCanvas(ctx, w, h);

  if (!entries || entries.length === 0) {
    drawEmptyState(ctx, w, h, '还没有好友数据\n邀请好友一起玩吧');
    return;
  }

  // Title strip
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('好友榜（' + metricLabel + '）', PADDING_X, 4);
  ctx.restore();

  var startY = (viewport && viewport.startY) || 28;
  for (var i = 0; i < entries.length; i++) {
    var y = startY + i * (ROW_HEIGHT + ROW_GAP);
    if (y + ROW_HEIGHT < 0 || y > h + 100) continue;
    drawRow(
      ctx,
      PADDING_X,
      y,
      w - PADDING_X * 2,
      entries[i],
      i + 1,
      entries[i].isMe,
      metricLabel,
    );
  }
}

module.exports = {
  drawFriendList: drawFriendList,
  drawEmptyState: drawEmptyState,
  setRedrawTrigger: setRedrawTrigger,
  clearCache: clearCache,
};
