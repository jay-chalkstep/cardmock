'use client';

import ErrorPage from '@/components/errors/ErrorPage';

export default function SearchError({
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
      title="Search Error"
      description="We encountered an error while performing your search. Please try again."
      returnHref="/search"
      returnLabel="Start a new search"
    />
  );
}
