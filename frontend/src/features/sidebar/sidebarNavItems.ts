import { Clock, Plus } from 'lucide-react';

export const SIDEBAR_NAV_ITEMS = [
  {
    icon: Plus,
    label: 'New',
    href: '/',
    ariaLabel: 'Start a new chat',
    variant: 'primary',
  },
  {
    icon: Clock,
    label: 'History',
    href: '/history',
    ariaLabel: 'Open chat history',
    variant: 'default',
  },
] as const;
