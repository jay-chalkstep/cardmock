'use client';

import ErrorPage from '@/components/errors/ErrorPage';

export default function DesignerError({
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
      description="We encountered an error while loading the designer. This has been logged and we'll look into it."
      returnHref="/designer"
      returnLabel="Return to Designer"
    />
  );
}

