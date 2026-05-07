const { httpError } = require('./http');
const { requireUser } = require('./auth');
const { getDb } = require('./db');
const { getCollectionName } = require('./config');

const NICKNAME_MAX_LEN = 32;
const AVATAR_MAX_LEN = 512;

function profileCol() {
  return getDb().collection(getCollectionName('user_profile'));
}

function classicCol() {
  return getDb().collection(getCollectionName('leaderboard_classic'));
}

function levelCol() {
  return getDb().collection(getCollectionName('leaderboard_level'));
}

async function findDoc(col, userId) {
  const res = await col.where({ userId }).limit(1).get();
  return (res && Array.isArray(res.data) && res.data[0]) || null;
}

async function syncProfileToBoard(col, userId, nickname, avatarUrl, now) {
  const existing = await findDoc(col, userId);
  if (!existing) return;
  const patch = { updatedAt: now };
  if (nickname) patch.nickname = nickname;
  if (avatarUrl) patch.avatarUrl = avatarUrl;
  await col.doc(existing._id).update(patch);
}

async function handleProfileUpdate(req) {
  const { userId, platform } = requireUser(req);
  const body = req.body || {};
  const nickname = String(body.nickname || '').trim().slice(0, NICKNAME_MAX_LEN);
  const avatarUrl = String(body.avatarUrl || '').trim().slice(0, AVATAR_MAX_LEN);

  if (!nickname && !avatarUrl) {
    throw httpError(400, 'EMPTY_PROFILE', 'nickname/avatarUrl 至少一项必填');
  }

  const col = profileCol();
  const existing = await findDoc(col, userId);
  const now = Date.now();
  const patch = { userId, platform, updatedAt: now };
  if (nickname) patch.nickname = nickname;
  if (avatarUrl) patch.avatarUrl = avatarUrl;

  if (existing && existing._id) {
    await col.doc(existing._id).update(patch);
  } else {
    patch.createdAt = now;
    await col.add(patch);
  }

  await Promise.all([
    syncProfileToBoard(classicCol(), userId, nickname, avatarUrl, now),
    syncProfileToBoard(levelCol(), userId, nickname, avatarUrl, now),
  ]);

  return { userId, nickname, avatarUrl, savedAt: now };
}

async function handleProfileGet(req) {
  const { userId, platform } = requireUser(req);
  const col = profileCol();
  const existing = await findDoc(col, userId);
  if (!existing) {
    return { userId, platform, exists: false, nickname: '', avatarUrl: '' };
  }
  return {
    userId,
    platform,
    exists: true,
    nickname: String(existing.nickname || ''),
    avatarUrl: String(existing.avatarUrl || ''),
    updatedAt: Number(existing.updatedAt || 0),
  };
}

module.exports = {
  handleProfileUpdate,
  handleProfileGet,
};
