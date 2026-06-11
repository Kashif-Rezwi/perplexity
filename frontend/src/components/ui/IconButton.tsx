import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export function IconButton({
  label,
  icon,
  active = false,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center transition-colors cursor-pointer',
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {icon}
    </button>
  );
}
