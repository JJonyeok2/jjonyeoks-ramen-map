import { Redis } from "@upstash/redis";

class InMemoryRedisFallback {
  private scores: Map<string, number> = new Map();

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    const compositeKey = `${key}:${member}`;
    const current = this.scores.get(compositeKey) || 0;
    const updated = current + increment;
    this.scores.set(compositeKey, updated);
    return updated;
  }

  async zrevrange(key: string, start: number, stop: number, opts?: { withScores?: boolean }): Promise<any[]> {
    const keyPrefix = `${key}:`;
    const items: { member: string; score: number }[] = [];

    for (const [k, score] of this.scores.entries()) {
      if (k.startsWith(keyPrefix)) {
        const member = k.substring(keyPrefix.length);
        items.push({ member, score });
      }
    }

    items.sort((a, b) => b.score - a.score);
    const sliced = items.slice(start, stop + 1);

    if (opts?.withScores) {
      const result: any[] = [];
      for (const item of sliced) {
        result.push(item.member, item.score);
      }
      return result;
    }

    return sliced.map((item) => item.member);
  }
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: any;

if (url && token && url !== "https://YOUR_UPSTASH_REDIS_REST_URL.upstash.io") {
  redisClient = new Redis({
    url,
    token,
  });
} else {
  if (!(global as any).__inMemoryRedis) {
    (global as any).__inMemoryRedis = new InMemoryRedisFallback();
  }
  redisClient = (global as any).__inMemoryRedis;
}

export { redisClient as redis };
