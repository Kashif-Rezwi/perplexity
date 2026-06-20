'use client';

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import {
  FloatingFocusManager,
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
} from '@floating-ui/react';
import { useMounted } from '@/hooks/useMounted';

type ThreadActionMenuProps = {
  threadTitle: string;
  onRename: () => void;
  onDelete: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

export function ThreadActionMenu({
  threadTitle,
  onRename,
  onDelete,
  isPinned = false,
  onTogglePin,
  disabled = false,
  className = 'relative flex justify-end',
  buttonClassName = '',
  isOpen,
  onOpenChange,
}: ThreadActionMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const mounted = useMounted();
  const isControlled = isOpen !== undefined;
  const isMenuOpen = isOpen ?? uncontrolledOpen;

  const setMenuOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const { refs, floatingStyles, context } = useFloating({
    open: isMenuOpen,
    onOpenChange: setMenuOpen,
    placement: 'bottom-end',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'menu' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const setReference = useCallback(
    (node: HTMLButtonElement | null) => {
      refs.setReference(node);
    },
    [refs],
  );

  const setFloating = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
    },
    [refs],
  );

  const dropdownMenu = isMenuOpen && mounted
    ? createPortal(
        <FloatingFocusManager context={context} modal={false} returnFocus>
          <div
            ref={setFloating}
            style={floatingStyles}
            aria-label={`Actions for ${threadTitle}`}
            {...getFloatingProps()}
            className="z-[60] w-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-2xl"
          >
            {onTogglePin && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen(false);
                  onTogglePin();
                }}
                role="menuitem"
                className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                {isPinned ? (
                  <><PinOff size={13} strokeWidth={1.75} />Unpin</>
                ) : (
                  <><Pin size={13} strokeWidth={1.75} />Pin</>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen(false);
                onRename();
              }}
              role="menuitem"
              className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Pencil size={13} strokeWidth={1.75} />
              Rename
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
              role="menuitem"
              className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--color-error)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Delete
            </button>
          </div>
        </FloatingFocusManager>,
        document.body,
      )
    : null;

  return (
    <div className={className}>
      <button
        ref={setReference}
        {...getReferenceProps({
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
          },
        })}
        type="button"
        aria-label={`Open actions for ${threadTitle}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        disabled={disabled}
        className={[
          'grid size-6 cursor-pointer place-items-center rounded-md text-[var(--color-text-muted)] transition-colors',
          'hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text)] disabled:cursor-not-allowed',
          isMenuOpen ? 'opacity-100' : '',
          buttonClassName,
        ].join(' ')}
      >
        <MoreHorizontal size={15} strokeWidth={1.75} />
      </button>

      {dropdownMenu}
    </div>
  );
}
