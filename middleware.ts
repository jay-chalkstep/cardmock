import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Minimal middleware that passes through all requests
// Auth is handled in individual route handlers using auth() from @clerk/nextjs/server
// This avoids Edge Runtime issues with Clerk's clerkMiddleware importing Node.js modules
export function middleware(request: NextRequest) {
  // Just pass through - all authentication is handled in route handlers
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};