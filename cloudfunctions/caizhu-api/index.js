const { handleLogin } = require('./lib/auth');
const { handlePull, handlePush } = require('./lib/save');
const {
  handleClassicSubmit,
  handleLevelSubmit,
  handleClassicWorld,
  handleLevelWorld,
} = require('./lib/leaderboard');
const { handleProfileUpdate, handleProfileGet } = require('./lib/profile');
const { respond, parseEvent, preflight } = require('./lib/http');

const ROUTES = {
  'POST /health': async () => ({ ok: true, ts: Date.now() }),
  'POST /login': handleLogin,
  'POST /save/pull': handlePull,
  'POST /save/push': handlePush,
  'POST /leaderboard/classic/submit': handleClassicSubmit,
  'POST /leaderboard/level/submit': handleLevelSubmit,
  'POST /leaderboard/classic/world': handleClassicWorld,
  'POST /leaderboard/level/world': handleLevelWorld,
  'GET /leaderboard/classic/world': handleClassicWorld,
  'GET /leaderboard/level/world': handleLevelWorld,
  'POST /profile/update': handleProfileUpdate,
  'POST /profile/get': handleProfileGet,
  'GET /profile/get': handleProfileGet,
};

exports.main = async (event, context) => {
  try {
    if (event && event.httpMethod === 'OPTIONS') {
      return preflight();
    }

    const req = parseEvent(event);
    const key = `${req.method} ${req.path}`;
    const handler = ROUTES[key];
    if (!handler) {
      return respond(404, { ok: false, code: 'NOT_FOUND', error: `no route: ${key}` });
    }

    const result = await handler(req, context);
    if (result && typeof result === 'object' && 'statusCode' in result) {
      return result;
    }
    return respond(200, { ok: true, data: result });
  } catch (error) {
    const code = error && error.code ? error.code : 'INTERNAL';
    const status = error && error.status ? error.status : 500;
    const message = (error && error.message) || String(error);
    console.error('[caizhu-api] error:', code, message, error && error.stack);
    const out = { ok: false, code, error: message };
    if (error && error.data !== undefined) {
      out.data = error.data;
    }
    return respond(status, out);
  }
};
