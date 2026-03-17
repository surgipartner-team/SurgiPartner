import { Redis } from '@upstash/redis';

let redis = null;

// Only initialize Redis if credentials are provided
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  });
}

export async function checkRateLimit(identifier, maxAttempts = 5, windowSeconds = 900) {
  // If Redis is not configured, allow all requests (for development)
  if (!redis) {
    console.warn('Rate limiting disabled: Redis not configured');
    return {
      allowed: true,
      remaining: maxAttempts,
      resetIn: 0
    };
  }

  try {
    const key = `ratelimit:${identifier}`;

    const current = await redis.get(key);

    if (current && parseInt(current) >= maxAttempts) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetIn: ttl
      };
    }

    const newCount = await redis.incr(key);

    if (newCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    return {
      allowed: true,
      remaining: maxAttempts - newCount,
      resetIn: await redis.ttl(key)
    };
  } catch (error) {
    console.error('Rate limit check failed:', error.message);
    // Allow request to proceed if Redis fails
    return {
      allowed: true,
      remaining: maxAttempts,
      resetIn: 0
    };
  }
}

export async function resetRateLimit(identifier) {
  if (!redis) {
    console.warn('Rate limit reset skipped: Redis not configured');
    return;
  }

  try {
    await redis.del(`ratelimit:${identifier}`);
  } catch (error) {
    console.error('Rate limit reset failed:', error.message);
  }
}
