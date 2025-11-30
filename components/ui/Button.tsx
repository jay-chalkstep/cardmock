'use client';

import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--accent-primary)] text-white
    hover:bg-[var(--accent-primary-hover)]
    active:bg-[var(--accent-secondary)]
  `,
  secondary: `
    bg-transparent text-[var(--text-secondary)]
    border border-[var(--border-default)]
    hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]
  `,
  ghost: `
    bg-transparent text-[var(--text-secondary)]
    hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]
  `,
  danger: `
    bg-[var(--status-error)] text-white
    hover:opacity-90
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-[12px] gap-1.5',
  md: 'px-3 py-1.5 text-[13px] gap-2',
  lg: 'px-4 py-2 text-[14px] gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-[var(--radius-sm)]
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
