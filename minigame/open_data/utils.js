// 开放数据域共用工具：截断昵称、绘制圆形头像（带占位图）、格式化数字。

function truncateNickname(name, max) {
  var s = String(name || '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

function formatNumber(n) {
  var v = Number(n || 0);
  if (!isFinite(v)) return '0';
  return String(Math.floor(v));
}

// 在指定圆形区域内绘制头像；若头像不可用则绘制占位渐变。
// imageCache: 用于缓存 Image 对象，避免重复创建
function drawCircleAvatar(ctx, url, cx, cy, radius, imageCache, fallbackText) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.clip();

  if (url) {
    var cached = imageCache[url];
    if (!cached) {
      try {
        var img = wx.createImage();
        img.onload = function () {
          imageCache[url] = { ready: true, img: img };
          if (typeof imageCache.__onLoad === 'function') {
            imageCache.__onLoad();
          }
        };
        img.onerror = function () {
          imageCache[url] = { ready: false, error: true };
        };
        img.src = url;
        imageCache[url] = { ready: false, img: img };
      } catch (_) {
        imageCache[url] = { ready: false, error: true };
      }
    } else if (cached.ready && cached.img) {
      try {
        ctx.drawImage(cached.img, cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();
        // 圆形描边
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.stroke();
        return;
      } catch (_) {}
    }
  }

  // Placeholder: gradient circle + initial letter.
  var grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, '#5b8cff');
  grad.addColorStop(1, '#a23bff');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
  ctx.fill();

  var letter = String(fallbackText || 'G').charAt(0).toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold ' + Math.floor(radius) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, cx, cy + 1);

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, false);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.stroke();
}

module.exports = {
  truncateNickname: truncateNickname,
  formatNumber: formatNumber,
  drawCircleAvatar: drawCircleAvatar,
};
