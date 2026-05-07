const { httpError } = require('./http');
const { requireUser } = require('./auth');
const { getDb } = require('./db');
const { getCollectionName } = require('./config');

const NICKNAME_MAX_LEN = 32;
const AVATAR_MAX_LEN = 512;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

function classicCol() {
  return getDb().collection(getCollectionName('leaderboard_classic'));
}

function levelCol() {
  return getDb().collection(getCollectionName('leaderboard_level'));
}

function sanitizeProfile(input) {
  const nickname = String((input && input.nickname) || '').trim().slice(0, NICKNAME_MAX_LEN);
  const avatarUrl = String((input && input.avatarUrl) || '').trim().slice(0, AVATAR_MAX_LEN);
  return { nickname, avatarUrl };
}

function pickIdFromUserId(userId) {
  // Use full userId as document _id-ish key; include platform tag to avoid collision across platforms.
  return userId;
}

async function readDoc(col, userId) {
  const res = await col.where({ userId }).limit(1).get();
  return (res && Array.isArray(res.data) && res.data[0]) || null;
}

async function upsertDoc(col, userId, patch) {
  const existing = await readDoc(col, userId);
  if (existing && existing._id) {
    await col.doc(existing._id).update(patch);
    return { _id: existing._id, mode: 'update' };
  }
  const addRes = await col.add({ userId, ...patch });
  return {
    _id: (addRes && (addRes.id || addRes._id)) || '',
    mode: 'insert',
  };
}

function shapeClassicEntry(doc) {
  if (!doc) return null;
  return {
    userId: doc.userId,
    nickname: String(doc.nickname || ''),
    avatarUrl: String(doc.avatarUrl || ''),
    bestScore: Number(doc.bestScore || 0),
    updatedAt: Number(doc.updatedAt || 0),
  };
}

function shapeLevelEntry(doc) {
  if (!doc) return null;
  return {
    userId: doc.userId,
    nickname: String(doc.nickname || ''),
    avatarUrl: String(doc.avatarUrl || ''),
    totalStars: Number(doc.totalStars || 0),
    totalScore: Number(doc.totalScore || 0),
    maxUnlocked: Number(doc.maxUnlocked || 1),
    updatedAt: Number(doc.updatedAt || 0),
  };
}

async function computeMyClassicRank(col, userId, bestScore) {
  if (!Number.isFinite(bestScore) || bestScore <= 0) return 0;
  const _ = getDb().command;
  const res = await col.where({ bestScore: _.gt(bestScore) }).count();
  return Number((res && res.total) || 0) + 1;
}

async function computeMyLevelRank(col, userId, totalStars, totalScore) {
  if (!Number.isFinite(totalStars) || totalStars <= 0) return 0;
  const _ = getDb().command;
  const higherStars = await col.where({ totalStars: _.gt(totalStars) }).count();
  const tieAndBetterScore = await col.where({
    totalStars,
    totalScore: _.gt(totalScore),
  }).count();
  return Number((higherStars && higherStars.total) || 0)
    + Number((tieAndBetterScore && tieAndBetterScore.total) || 0)
    + 1;
}

async function handleClassicSubmit(req) {
  const { userId, platform } = requireUser(req);
  const body = req.body || {};
  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0) {
    throw httpError(400, 'BAD_SCORE', 'score 非法');
  }
  const { nickname, avatarUrl } = sanitizeProfile(body);

  const col = classicCol();
  const existing = await readDoc(col, userId);
  const prevBest = Number((existing && existing.bestScore) || 0);
  const nextBest = Math.max(prevBest, Math.floor(score));
  const now = Date.now();

  const patch = {
    userId,
    platform,
    bestScore: nextBest,
    updatedAt: now,
  };
  if (nickname) patch.nickname = nickname;
  if (avatarUrl) patch.avatarUrl = avatarUrl;
  if (!existing) {
    patch.createdAt = now;
  }

  await upsertDoc(col, userId, patch);
  return { userId, bestScore: nextBest, savedAt: now, improved: nextBest > prevBest };
}

async function handleLevelSubmit(req) {
  const { userId, platform } = requireUser(req);
  const body = req.body || {};
  const totalStars = Number(body.totalStars);
  const totalScore = Number(body.totalScore);
  const maxUnlocked = Number(body.maxUnlocked);
  if (!Number.isFinite(totalStars) || totalStars < 0) {
    throw httpError(400, 'BAD_STARS', 'totalStars 非法');
  }
  if (!Number.isFinite(totalScore) || totalScore < 0) {
    throw httpError(400, 'BAD_TOTAL_SCORE', 'totalScore 非法');
  }
  if (!Number.isFinite(maxUnlocked) || maxUnlocked < 1) {
    throw httpError(400, 'BAD_MAX_UNLOCKED', 'maxUnlocked 非法');
  }
  const { nickname, avatarUrl } = sanitizeProfile(body);

  const col = levelCol();
  const existing = await readDoc(col, userId);
  const prevStars = Number((existing && existing.totalStars) || 0);
  const prevScore = Number((existing && existing.totalScore) || 0);
  const prevUnlocked = Number((existing && existing.maxUnlocked) || 1);
  const nextStars = Math.max(prevStars, Math.floor(totalStars));
  const nextScore = Math.max(prevScore, Math.floor(totalScore));
  const nextUnlocked = Math.max(prevUnlocked, Math.floor(maxUnlocked));
  const now = Date.now();

  const patch = {
    userId,
    platform,
    totalStars: nextStars,
    totalScore: nextScore,
    maxUnlocked: nextUnlocked,
    updatedAt: now,
  };
  if (nickname) patch.nickname = nickname;
  if (avatarUrl) patch.avatarUrl = avatarUrl;
  if (!existing) {
    patch.createdAt = now;
  }

  await upsertDoc(col, userId, patch);
  return {
    userId,
    totalStars: nextStars,
    totalScore: nextScore,
    maxUnlocked: nextUnlocked,
    savedAt: now,
    improved: nextStars > prevStars || nextScore > prevScore || nextUnlocked > prevUnlocked,
  };
}

function parseLimit(req) {
  const raw = Number((req.query && (req.query.limit || req.query.size)) || (req.body && req.body.limit) || 0);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)));
}

async function handleClassicWorld(req) {
  const { userId } = requireUser(req);
  const limit = parseLimit(req);
  const col = classicCol();
  const res = await col
    .orderBy('bestScore', 'desc')
    .orderBy('updatedAt', 'asc')
    .limit(limit)
    .get();
  const items = ((res && res.data) || []).map((doc, idx) => ({
    rank: idx + 1,
    isMe: doc.userId === userId,
    ...shapeClassicEntry(doc),
  }));

  const meDoc = await readDoc(col, userId);
  let me = null;
  if (meDoc) {
    const myBest = Number(meDoc.bestScore || 0);
    const inListIdx = items.findIndex((it) => it.isMe);
    const rank = inListIdx >= 0
      ? items[inListIdx].rank
      : await computeMyClassicRank(col, userId, myBest);
    me = {
      rank,
      ...shapeClassicEntry(meDoc),
    };
  }

  return { items, me, total: items.length };
}

async function handleLevelWorld(req) {
  const { userId } = requireUser(req);
  const limit = parseLimit(req);
  const col = levelCol();
  const res = await col
    .orderBy('totalStars', 'desc')
    .orderBy('totalScore', 'desc')
    .orderBy('updatedAt', 'asc')
    .limit(limit)
    .get();
  const items = ((res && res.data) || []).map((doc, idx) => ({
    rank: idx + 1,
    isMe: doc.userId === userId,
    ...shapeLevelEntry(doc),
  }));

  const meDoc = await readDoc(col, userId);
  let me = null;
  if (meDoc) {
    const inListIdx = items.findIndex((it) => it.isMe);
    const rank = inListIdx >= 0
      ? items[inListIdx].rank
      : await computeMyLevelRank(col, userId, Number(meDoc.totalStars || 0), Number(meDoc.totalScore || 0));
    me = {
      rank,
      ...shapeLevelEntry(meDoc),
    };
  }

  return { items, me, total: items.length };
}

module.exports = {
  handleClassicSubmit,
  handleLevelSubmit,
  handleClassicWorld,
  handleLevelWorld,
};
