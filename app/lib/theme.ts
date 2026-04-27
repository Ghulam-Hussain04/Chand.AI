/**
 * Centralized design tokens for Dr. Terra frontend.
 * Use these constants throughout components to keep the theme consistent.
 */

// ── Background ─────────────────────────────────────────────────────────────
export const bg = {
  page: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800',
  card: 'bg-slate-800/50',
  cardSolid: 'bg-slate-800',
  elevated: 'bg-slate-700/50',
  input: 'bg-slate-700/50',
} as const;

// ── Borders ─────────────────────────────────────────────────────────────────
export const border = {
  primary: 'border-slate-700',
  secondary: 'border-slate-600',
  focus: 'focus:border-blue-500',
} as const;

// ── Text ────────────────────────────────────────────────────────────────────
export const text = {
  primary: 'text-white',
  secondary: 'text-slate-200',
  muted: 'text-slate-400',
  subtle: 'text-slate-500',
  placeholder: 'placeholder:text-slate-400',
} as const;

// ── Accent colours ──────────────────────────────────────────────────────────
export const accent = {
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  purple: 'text-purple-400',
  green: 'text-green-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
} as const;

// ── Badge / pill ────────────────────────────────────────────────────────────
export const badge = {
  blue: 'bg-blue-600/20 text-blue-300',
  green: 'bg-green-600/20 text-green-300',
  purple: 'bg-purple-600/20 text-purple-300',
  red: 'bg-red-600/20 text-red-300',
  yellow: 'bg-yellow-600/20 text-yellow-300',
  slate: 'bg-slate-700/50 text-slate-300',
} as const;

// ── Buttons ─────────────────────────────────────────────────────────────────
export const btn = {
  primary:
    'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white',
  ghost: 'text-slate-200 hover:bg-slate-700/50',
  danger: 'text-red-400 hover:bg-red-600/20',
  outline: 'border-slate-600 text-slate-200 hover:bg-slate-700',
} as const;

// ── Composites ──────────────────────────────────────────────────────────────
export const card = `${bg.card} ${border.primary}` as const;
export const inputBase =
  `${bg.input} ${border.secondary} ${text.secondary} ${text.placeholder}` as const;

// ── Role badge colours ───────────────────────────────────────────────────────
export const roleBadge: Record<string, string> = {
  admin: badge.purple,
  researcher: badge.blue,
  user: badge.slate,
};

// ── File type colours ────────────────────────────────────────────────────────
export const fileTypeBadge: Record<string, string> = {
  image: badge.blue,
  csv: badge.green,
};
