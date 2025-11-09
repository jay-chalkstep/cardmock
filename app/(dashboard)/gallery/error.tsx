'use client';

import ErrorPage from '@/components/errors/ErrorPage';

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      error={error}
      reset={reset}
      title="Something went wrong"
      description="We encountered an error while loading the gallery. This has been logged and we'll look into it."
      returnHref="/gallery"
      returnLabel="Return to Gallery"
    />
  );
}
