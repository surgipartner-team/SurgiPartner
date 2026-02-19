// middleware.js (or proxy.js)
import { NextResponse } from "next/server";
import { checkRateLimit } from "./lib/rateLimit";
import { getIronSession } from "iron-session";
import { SESSION_CONFIG } from "./lib/constants";
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Initialize Rate Limiters
// 1. Outer Layer: DDoS Protection (IP-based, High Limit)
const ipLimit = parseInt(process.env.RATE_LIMIT_IP_MAX) || 10000;
const ipWindow = process.env.RATE_LIMIT_IP_WINDOW || '15 m';

const ipRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(ipLimit, ipWindow),
  analytics: true,
  prefix: '@upstash/ratelimit/ip',
});

// 2. Inner Layer: Abuse Protection (User/Session-based, Strict Limit)
const userLimit = parseInt(process.env.RATE_LIMIT_USER_MAX) || 5000;
const userWindow = process.env.RATE_LIMIT_USER_WINDOW || '15 m';

const userRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(userLimit, userWindow),
  analytics: true,
  prefix: '@upstash/ratelimit/user',
});

// 3. Fallback: In-Memory Rate Limiter (when Redis is down/expired)
// 3. Fallback: In-Memory Rate Limiter (when Redis is down/expired)
function createLocalRateLimiter(limit, window) {
  const windowMs = parseWindow(window);
  const storage = new Map(); // key -> { count, expiresAt }

  function parseWindow(windowStr) {
    const [value, unit] = windowStr.split(' ');
    const multiplier = unit === 'm' ? 60000 : unit === 's' ? 1000 : 1000;
    return parseInt(value) * multiplier;
  }

  return {
    limit: async function (identifier) {
      const now = Date.now();
      const key = identifier;

      // Cleanup expired
      if (storage.has(key)) {
        if (now > storage.get(key).expiresAt) {
          storage.delete(key);
        }
      }

      let record = storage.get(key);

      if (!record) {
        record = { count: 1, expiresAt: now + windowMs };
        storage.set(key, record);
        return { success: true, remaining: limit - 1, reset: record.expiresAt };
      }

      if (record.count >= limit) {
        return { success: false, remaining: 0, reset: record.expiresAt };
      }

      record.count++;
      return { success: true, remaining: limit - record.count, reset: record.expiresAt };
    }
  };
}

const localIpLimiter = createLocalRateLimiter(ipLimit, ipWindow);
const localUserLimiter = createLocalRateLimiter(userLimit, userWindow);

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ============= GLOBAL RATE LIMITING (DDoS & ABUSE) =============
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const sessionCookie = request.cookies.get(process.env.SESSION_NAME || 'surgipartner_session');

  try {
    // Helper for timeout-based execution with Fallback
    const limitWithTimeout = async (redisLimiter, localLimiter, key, timeoutMs = 1000) => {
      // If Redis credentials aren't set, go straight to fallback
      if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
        return await localLimiter.limit(key);
      }

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), timeoutMs)
      );

      try {
        const result = await Promise.race([
          redisLimiter.limit(key),
          timeoutPromise
        ]);

        if (result.timeout) {
          console.warn('Redis rate limit timed out, using local fallback');
          return await localLimiter.limit(key);
        }

        return result;
      } catch (err) {
        console.warn('Redis rate limit failed, using local fallback:', err.message);
        return await localLimiter.limit(key);
      }
    };

    // 1. Check Global IP Limit (DDoS)
    const ipResult = await limitWithTimeout(ipRatelimit, localIpLimiter, ip);

    if (!ipResult.success) {
      return new NextResponse('Too Many Requests (Global Limit Exceeded)', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': ipLimit.toString(),
          'X-RateLimit-Remaining': (ipResult.remaining || 0).toString(),
          'X-RateLimit-Reset': (ipResult.reset || 0).toString(),
        },
      });
    }

    // 2. Check User Limit (Abuse) - Only if authenticated
    if (sessionCookie && sessionCookie.value) {
      const userResult = await limitWithTimeout(userRatelimit, localUserLimiter, sessionCookie.value);

      if (!userResult.success) {
        return new NextResponse('Too Many Requests (User Limit Exceeded)', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': userLimit.toString(),
            'X-RateLimit-Remaining': (userResult.remaining || 0).toString(),
            'X-RateLimit-Reset': (userResult.reset || 0).toString(),
          },
        });
      }
    }
  } catch (error) {
    // Ultimate fail-safe
    console.warn('Global rate limiting bypassed due to error:', error.message);
  }

  const response = NextResponse.next();

  // ============= SECURITY HEADERS =============
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // HSTS - Force HTTPS
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  // ============= RATE LIMITING ON AUTH ROUTES =============
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register")
  ) {
    const ip =
      request.ip ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";
    const identifier = `auth:${ip}`;

    try {
      const rateLimit = await checkRateLimit(identifier, 5, 150);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Too many attempts. Try again in ${Math.ceil(
              rateLimit.resetIn / 60
            )} minutes`,
          },
          { status: 429 }
        );
      }

      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimit.remaining.toString()
      );
    } catch (error) {
      console.error("Rate limit error:", error);
    }
  }

  // ============= ROLE-BASED ROUTE PROTECTION =============

  // Define role-based route patterns
  const roleRoutes = {
    admin: /^\/admin\/.*/,
    sales: /^\/sales\/.*/,
    ops: /^\/ops\/.*/,
    carebuddy: /^\/carebuddy\/.*/,
    accountant: /^\/accountant\/.*/,
    outsourcing: /^\/outsourcing\/.*/,
  };

  // Check if current path matches any role route
  const matchedRole = Object.entries(roleRoutes).find(([role, pattern]) =>
    pattern.test(pathname)
  );

  // If it's a role-specific route, check authorization
  if (matchedRole) {
    const [requiredRole] = matchedRole;
    // sessionCookie is already defined at top level

    // No session cookie = redirect to login
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get session and validate role
    try {
      const req = {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      };
      const res = {
        getHeader: () => null,
        setHeader: () => { },
        hasHeader: () => false,
      };

      const session = await getIronSession(req, res, SESSION_CONFIG);

      // Not logged in = redirect to login
      if (!session.isLoggedIn || !session.user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Wrong role = redirect to their correct dashboard
      if (session.user.role !== requiredRole) {
        const correctDashboard = new URL(
          `/${session.user.role}/dashboard`,
          request.url
        );
        return NextResponse.redirect(correctDashboard);
      }

      // Correct role = allow access
    } catch (error) {
      console.error("Session validation error:", error);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ============= OLD DASHBOARD ROUTE (LEGACY SUPPORT) =============
  const protectedRoutes = ["/dashboard"];
  // sessionCookie is already defined at top level

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|surgi-partner-favicon.ico|public).*)"],
};
