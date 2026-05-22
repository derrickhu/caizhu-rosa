// 开放数据域：拉取好友云存储并绘制到 sharedCanvas（canvas 宽高只读）

var drawer = require('./drawer.js');

var WX = (typeof wx !== 'undefined') ? wx : null;

var sharedCanvas = WX && WX.getSharedCanvas ? WX.getSharedCanvas() : null;
var ctx = sharedCanvas ? sharedCanvas.getContext('2d') : null;

var state = {
  tab: 'classic',
  metric: 'classic_best',
  metricLabel: '分',
  listWidth: 690,
  rowHeight: 76,
  lastEntries: null,
  fetchInflight: false,
};

function readCanvasSize() {
  if (!sharedCanvas) return { width: 0, height: 0 };
  return { width: sharedCanvas.width, height: sharedCanvas.height };
}

function publishContentHeight(h) {
  if (sharedCanvas) {
    sharedCanvas.__friendContentHeight = h;
  }
}

function redrawLast() {
  if (!state.lastEntries || !ctx || !sharedCanvas) return;
  var size = readCanvasSize();
  var meta = {};
  drawer.drawFriendList(
    ctx,
    size.width,
    size.height,
    state.lastEntries,
    state.metricLabel,
    state.listWidth,
    state.rowHeight,
    meta,
  );
  publishContentHeight(meta.contentHeight || 120);
}

drawer.setRedrawTrigger(redrawLast);

function metricOf(tab) {
  if (tab === 'level') {
    return { metric: 'level_stars', label: '星' };
  }
  return { metric: 'classic_best', label: '分' };
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

  var size = readCanvasSize();
  var meta = {};
  drawer.drawEmptyState(ctx, size.width, size.height, '加载好友榜中...');
  publishContentHeight(80);

  var pickedMetric = state.metric;
  var pickedLabel = state.metricLabel;

  var selfOpenId = '';
  function doFetch() {
    if (!WX.getFriendCloudStorage) {
      state.fetchInflight = false;
      drawer.drawEmptyState(ctx, size.width, size.height, '当前环境不支持好友榜');
      publishContentHeight(80);
      return;
    }
    WX.getFriendCloudStorage({
      keyList: [pickedMetric],
      success: function (res) {
        var entries = buildEntries((res && res.data) || [], pickedMetric, selfOpenId);
        state.lastEntries = entries;
        size = readCanvasSize();
        meta = {};
        drawer.drawFriendList(
          ctx,
          size.width,
          size.height,
          entries,
          pickedLabel,
          state.listWidth,
          state.rowHeight,
          meta,
        );
        publishContentHeight(meta.contentHeight || 120);
      },
      fail: function (err) {
        var msg = '好友榜读取失败';
        if (err && err.errMsg) {
          msg = '好友榜读取失败\n' + String(err.errMsg).slice(0, 40);
        }
        size = readCanvasSize();
        drawer.drawEmptyState(ctx, size.width, size.height, msg);
        publishContentHeight(80);
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
      if (msg.listWidth) state.listWidth = Number(msg.listWidth);
      if (msg.rowHeight) state.rowHeight = Number(msg.rowHeight);
      fetchAndRender();
    } else if (type === 'clearCache') {
      drawer.clearCache();
    }
  });
}

if (ctx && sharedCanvas) {
  var initSize = readCanvasSize();
  drawer.drawEmptyState(ctx, initSize.width, initSize.height, '好友榜准备中');
  publishContentHeight(80);
}
