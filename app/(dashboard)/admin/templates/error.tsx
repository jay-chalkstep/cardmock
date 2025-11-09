'use client';

import ErrorPage from '@/components/errors/ErrorPage';

export default function AdminTemplatesError({
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
      description="We encountered an error while loading templates. This has been logged and we'll look into it."
      returnHref="/admin/templates"
      returnLabel="Return to Templates"
    />
  );
}

