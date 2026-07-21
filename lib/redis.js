// lib/redis.js
// Upstash Redis clients for the prediction scorecard. Two clients on purpose:
// - redisWrite: full read/write access, used only by the cron snapshot/grade job
// - redisRead: read-only token, used by api/scorecard.js (the public-facing read path)
//   so a compromised/misused read endpoint can never write or delete scorecard data.
//
// Env vars come from Vercel's Upstash Marketplace integration (connected with the
// custom prefix "UPSTASH_REDIS_REST"), which uses the legacy Vercel KV variable names
// underneath -- hence the long names below, not a clean UPSTASH_REDIS_REST_URL/TOKEN pair.

import { Redis } from "@upstash/redis";

export const redisWrite = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
});

export const redisRead = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN,
});

// -- KEY SCHEME -----------------------------------------------------------------
// finallap:pred:{series}:{raceId}:{stage}   -> JSON prediction snapshot
// finallap:grade:{series}:{raceId}          -> JSON graded result (all stages)
// finallap:index:{series}                   -> sorted set of raceIds, scored by race date (epoch ms)

export const predKey = (series, raceId, stage) => `finallap:pred:${series}:${raceId}:${stage}`;
export const gradeKey = (series, raceId) => `finallap:grade:${series}:${raceId}`;
export const indexKey = (series) => `finallap:index:${series}`;
