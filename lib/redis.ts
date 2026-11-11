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

  // @upstash/redis 에는 zrevrange 가 없으므로 zrange(..., { rev: true }) 시그니처에 맞춘다.
  async zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean; withScores?: boolean },
  ): Promise<(string | number)[]> {
    const keyPrefix = `${key}:`;
    const items: { member: string; score: number }[] = [];

    for (const [k, score] of this.scores.entries()) {
      if (k.startsWith(keyPrefix)) {
        items.push({ member: k.substring(keyPrefix.length), score });
      }
    }

    items.sort((a, b) => (opts?.rev ? b.score - a.score : a.score - b.score));
    const sliced = items.slice(start, stop + 1);

    if (opts?.withScores) {
      return sliced.flatMap((item) => [item.member, item.score]);
    }
    return sliced.map((item) => item.member);
  }
}

// Vercel Marketplace 의 Upstash 연동은 KV_REST_API_* 이름으로 주입하므로 둘 다 받는다.
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export interface PopularStore {
  zincrby(key: string, increment: number, member: string): Promise<number>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean; withScores?: boolean },
  ): Promise<unknown[]>;
}

export const isRedisConfigured = Boolean(
  url && token && url !== "https://YOUR_UPSTASH_REDIS_REST_URL.upstash.io",
);

let redisClient: PopularStore;

if (isRedisConfigured) {
  redisClient = new Redis({ url: url!, token: token! }) as unknown as PopularStore;
} else {
  // 서버리스(Vercel)에서는 인스턴스마다 메모리가 따로라 집계가 유지되지 않는다.
  // 운영 환경에서 조용히 폴백하지 않도록 반드시 로그를 남긴다.
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[popular] Upstash 환경변수가 없어 인메모리 폴백으로 동작 중입니다. 클릭 수가 저장되지 않습니다.",
    );
  }
  const g = globalThis as { __inMemoryRedis?: InMemoryRedisFallback };
  g.__inMemoryRedis ??= new InMemoryRedisFallback();
  redisClient = g.__inMemoryRedis;
}

export { redisClient as redis };
