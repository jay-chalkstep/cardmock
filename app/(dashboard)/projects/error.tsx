'use client';

import ErrorPage from '@/components/errors/ErrorPage';

export default function ProjectsError({
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
      description="We encountered an error while loading your projects. This has been logged and we'll look into it."
      returnHref="/projects"
      returnLabel="Return to Projects"
    />
  );
}
