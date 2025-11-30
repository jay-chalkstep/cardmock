'use client';

import { ReactNode, HTMLAttributes, forwardRef } from 'react';

interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={`
          inline-flex items-center justify-center
          px-1.5 py-0.5
          text-[11px] font-medium
          text-[var(--text-tertiary)]
          bg-[var(--bg-surface)]
          border border-[var(--border-default)]
          rounded-[var(--radius-sm)]
          ${className}
        `}
        {...props}
      >
        {children}
      </kbd>
    );
  }
);

Kbd.displayName = 'Kbd';

export { Kbd };
export default Kbd;
