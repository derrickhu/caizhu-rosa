// 开放数据域入口（独立 JS 上下文）。
// 接收主域 postMessage，调用 wx.getFriendCloudStorage 拉取好友榜数据，
// 并在 SharedCanvas 上完成绘制。

var drawer = require('./drawer.js');

var WX = (typeof wx !== 'undefined') ? wx : null;

var sharedCanvas = WX && WX.getSharedCanvas ? WX.getSharedCanvas() : null;
var ctx = sharedCanvas ? sharedCanvas.getContext('2d') : null;

var state = {
  tab: 'classic',
  metric: 'classic_best',
  metricLabel: '分',
  viewport: { width: 750, height: 680, listStartY: 300 },
  lastEntries: null,
  fetchInflight: false,
};

drawer.setRedrawTrigger(function () {
  // 头像加载完成后重绘
  if (state.lastEntries) {
    drawer.drawFriendList(
      ctx,
      sharedCanvas.width,
      sharedCanvas.height,
      state.lastEntries,
      state.metricLabel,
      state.viewport,
    );
  }
});

function metricOf(tab) {
  if (tab === 'level') {
    return { metric: 'level_stars', label: '星' };
  }
  return { metric: 'classic_best', label: '分' };
}

function ensureCanvasSize(viewport) {
  if (!sharedCanvas || !viewport) return;
  if (viewport.width && sharedCanvas.width !== viewport.width) {
    sharedCanvas.width = viewport.width;
  }
  if (viewport.height && sharedCanvas.height !== viewport.height) {
    sharedCanvas.height = viewport.height;
  }
}

function safeNumber(s) {
  var n = Number(s);
  return isFinite(n) ? n : 0;
}

function pickValue(KVDataList, key) {
  if (!KVDataList || !KVDataList.length) return 0;
  for (var i = 0; i < KVDataList.length; i++) {
    if (KVDataList[i] && KVDataList[i].key === key) {
      return safeNumber(KVDataList[i].value);
    }
  }
  return 0;
}

function buildEntries(items, metric, selfOpenId) {
  var list = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var value = pickValue(it.KVDataList, metric);
    if (value <= 0) continue;
    list.push({
      openid: it.openid || '',
      nickname: it.nickname || '',
      avatarUrl: it.avatarUrl || '',
      value: value,
      isMe: !!(selfOpenId && it.openid === selfOpenId),
    });
  }
  list.sort(function (a, b) { return b.value - a.value; });
  return list;
}

function fetchAndRender() {
  if (!WX || !ctx || !sharedCanvas) return;
  if (state.fetchInflight) return;
  state.fetchInflight = true;

  // Render placeholder while loading
  drawer.drawEmptyState(ctx, sharedCanvas.width, sharedCanvas.height, '加载好友榜中...');

  var pickedMetric = state.metric;
  var pickedLabel = state.metricLabel;

  var selfOpenId = '';
  function doFetch() {
    if (!WX.getFriendCloudStorage) {
      state.fetchInflight = false;
      drawer.drawEmptyState(ctx, sharedCanvas.width, sharedCanvas.height, '当前环境不支持好友榜');
      return;
    }
    WX.getFriendCloudStorage({
      keyList: [pickedMetric],
      success: function (res) {
        var entries = buildEntries((res && res.data) || [], pickedMetric, selfOpenId);
        state.lastEntries = entries;
        var needH = drawer.computeCanvasHeight(entries.length);
        state.viewport.height = Math.max(620, needH);
        state.viewport.listStartY = drawer.PODIUM_ZONE_H;
        ensureCanvasSize(state.viewport);
        drawer.drawFriendList(
          ctx,
          sharedCanvas.width,
          sharedCanvas.height,
          entries,
          pickedLabel,
          state.viewport,
        );
      },
      fail: function (err) {
        var msg = '好友榜读取失败';
        if (err && err.errMsg) {
          msg = '好友榜读取失败\n' + String(err.errMsg).slice(0, 40);
        }
        drawer.drawEmptyState(ctx, sharedCanvas.width, sharedCanvas.height, msg);
      },
      complete: function () {
        state.fetchInflight = false;
      },
    });
  }

  if (WX.getUserInfo) {
    try {
      WX.getUserInfo({
        openIdList: ['selfOpenId'],
        success: function (info) {
          var d = info && info.data && info.data[0];
          if (d && d.openId) selfOpenId = d.openId;
          doFetch();
        },
        fail: function () { doFetch(); },
      });
      return;
    } catch (_) {}
  }
  doFetch();
}

if (WX && WX.onMessage) {
  WX.onMessage(function (msg) {
    if (!msg || typeof msg !== 'object') return;
    var type = String(msg.type || '');
    if (type === 'render') {
      var tab = String(msg.tab || 'classic');
      var pair = metricOf(tab);
      state.tab = tab;
      state.metric = pair.metric;
      state.metricLabel = pair.label;
      if (msg.viewport) {
        state.viewport = {
          width: Number(msg.viewport.width || state.viewport.width),
          height: Number(msg.viewport.height || state.viewport.height),
          listStartY: Number(msg.viewport.listStartY || state.viewport.listStartY || drawer.PODIUM_ZONE_H),
        };
        ensureCanvasSize(state.viewport);
      }
      fetchAndRender();
    } else if (type === 'clearCache') {
      drawer.clearCache();
    }
  });
}

// 初始绘制
if (ctx && sharedCanvas) {
  ensureCanvasSize(state.viewport);
  drawer.drawEmptyState(ctx, sharedCanvas.width, sharedCanvas.height, '好友榜准备中');
}
