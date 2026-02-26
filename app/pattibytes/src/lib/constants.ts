export const APP_NAME    = 'Pattibytes Express'
export const DEVELOPER   = 'Thrillyverse'
export const APP_VERSION = '1.0.0'

export const COLORS = {
  primary:         '#FF6B35',
  secondary:       '#4CAF50',
  danger:          '#F44336',
  warning:         '#FFC107',
  info:            '#2196F3',
  background:      '#FFFFFF',
  backgroundLight: '#F5F5F5',
  card:            '#FFFFFF',
  text:            '#1A1A1A',
  textLight:       '#666666',
  textMuted:       '#999999',
  border:          '#E0E0E0',
  success:         '#22C55E',
  orange:          '#FF6B35',
} as const

export const ACTIVE_ORDER_STATUSES = [
  'pending','confirmed','preparing','ready',
  'assigned','pickedup','on_the_way','outfordelivery',
] as const

export const STATUS_COLORS: Record<string, string> = {
  pending:        '#F59E0B',
  confirmed:      '#3B82F6',
  preparing:      '#8B5CF6',
  ready:          '#10B981',
  assigned:       '#06B6D4',
  pickedup:       '#F97316',
  on_the_way:     '#F97316',
  outfordelivery: '#84CC16',
  delivered:      '#22C55E',
  cancelled:      '#EF4444',
  rejected:       '#EF4444',
}

export const STATUS_EMOJI: Record<string, string> = {
  pending:        '🕐',
  confirmed:      '✅',
  preparing:      '👨‍🍳',
  ready:          '📦',
  assigned:       '🛵',
  pickedup:       '🛵',
  on_the_way:     '🚀',
  outfordelivery: '🏃',
  delivered:      '🎉',
  cancelled:      '❌',
  rejected:       '❌',
}
