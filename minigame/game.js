var _diagMsgs = [];
var _diagStart = Date.now();
function _diag(msg) {
  var ts = Date.now() - _diagStart;
  var line = '[' + ts + 'ms] ' + msg;
  _diagMsgs.push(line);
  try { console.log(line); } catch(_) {}
}

function _showDiag() {
  try {
    if (typeof wx !== 'undefined' && wx.showModal) {
      wx.showModal({
        title: '启动诊断',
        content: _diagMsgs.join('\n'),
        showCancel: false
      });
    }
  } catch(_) {}
}

_diag('game.js 开始执行');

try {
  if (typeof wx !== 'undefined') {
    var _si = wx.getSystemInfoSync();
    _diag('platform:' + _si.platform + ' system:' + _si.system);
    _diag('brand:' + _si.brand + ' model:' + _si.model);
  }
} catch(e) {
  _diag('getSystemInfo失败:' + e);
}

try {
  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.onError = function(msg) {
      _diag('onError:' + msg);
      _showDiag();
    };
    GameGlobal.onUnhandledRejection = function(ev) {
      _diag('unhandledRej:' + (ev && ev.reason || ev));
      _showDiag();
    };
  }
} catch(_) {}

// ── xiao_chu 方式：把"主屏 canvas"提前锁定为 2D ctx 用作合成上屏 ──
// 微信小游戏里同一个 canvas 只能持有一种 ctx 类型（webgl 或 2d），且必须在
// 拿过 ctx 之后才会"上屏"——所以必须在 pixi-adapter 接管之前就把第一次
// wx.createCanvas() 的主 canvas 立刻 getContext('2d') 锁定，否则 iOS 真机上
// 之后再去拿 2D ctx 会失败，导致好友榜 sharedCanvas 无法合成上屏。
// 把它挂到 GameGlobal.__mainCanvas / __mainCtx2d，让 Game.ts 走双 canvas 模式。
try {
  if (typeof wx !== 'undefined' && typeof wx.createCanvas === 'function'
      && typeof GameGlobal !== 'undefined' && !GameGlobal.__mainCanvas) {
    var _mainCanvas = wx.createCanvas();
    var _mainCtx2d = null;
    try {
      _mainCtx2d = _mainCanvas.getContext('2d');
    } catch (e) {
      _diag('main getContext(2d) 失败:' + e);
    }
    GameGlobal.__mainCanvas = _mainCanvas;
    GameGlobal.__mainCtx2d = _mainCtx2d;
    _diag('xiao_chu mainCanvas ready ctx2d=' + (_mainCtx2d ? 'ok' : 'null'));
  }
} catch (e) {
  _diag('xiao_chu mainCanvas init failed:' + e);
}

_diag('加载 pixi-adapter...');
try {
  require('./pixi-adapter/index');
  _diag('pixi-adapter OK');
} catch (e) {
  _diag('pixi-adapter 失败!!:' + e);
  _showDiag();
}

if (typeof Intl === 'undefined') {
  _diag('Intl不存在,注入polyfill');
  var _g = typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof globalThis !== 'undefined' ? globalThis : {});
  _g.Intl = {};
}

_diag('加载 game-bundle...');
try {
  require('./game-bundle.js');
  _diag('game-bundle OK');
} catch (e) {
  _diag('game-bundle 失败!!:' + e);
  _showDiag();
}

_diag('全部加载完成');

setTimeout(function() {
  if (typeof GameGlobal !== 'undefined' && !GameGlobal.__gameRendered) {
    _diag('5秒超时 - 游戏未渲染');
    _showDiag();
  }
}, 5000);
