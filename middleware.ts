import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes (sign-in, sign-up, and public share pages)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/share/[token]', // Public share pages for external reviewers
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes except sign-in, sign-up, and public share pages
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
