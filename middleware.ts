import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { apiRateLimiter } from "@/lib/rate-limit";

export default auth((req) => {
    // Rate limiting for API routes
    if (req.nextUrl.pathname.startsWith("/api/") && !req.nextUrl.pathname.startsWith("/api/auth")) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "unknown";

        const result = apiRateLimiter.check(ip);

        if (!result.success) {
            return new NextResponse(
                JSON.stringify({ error: "Too many requests. Please try again later." }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "X-RateLimit-Limit": result.limit.toString(),
                        "X-RateLimit-Remaining": result.remaining.toString(),
                        "X-RateLimit-Reset": result.resetAt.toString(),
                        "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
                    },
                }
            );
        }
    }

    // Auth check for protected routes
    if (!req.auth) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api/auth (NextAuth API routes)
         * - login (login page)
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, manifest.json, sw.js, icons (PWA assets)
         * - public files
         */
        "/((?!api/auth|login|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons|workbox-).*)",
    ],
};
