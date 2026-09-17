'use client';

import { Icon, type IconName } from '@/components/icons';
import { useTheme, type Theme } from './theme-provider';

/**
 * Three-position theme control.
 *
 * A segmented radio group rather than a toggle, because "system" is a real
 * third answer and a two-state switch cannot express it. It is a radiogroup
 * for screen readers, so arrow keys move between options and the current one
 * is announced as checked.
 */

const OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`theme-switcher${compact ? ' is-compact' : ''}`}
      role="radiogroup"
      aria-label="Colour theme"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={`${option.label} theme`}
            className={`theme-option${active ? ' is-active' : ''}`}
            onClick={() => setTheme(option.value)}
          >
            <Icon name={option.icon} size={15} />
            {compact ? null : <span className="theme-option-label">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
