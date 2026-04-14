export const ACTIVE_STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready',
  'assigned', 'pickedup', 'on_the_way', 'outfordelivery',
]

export const STATUS_COLORS: Record<string, string> = {
  pending:        '#F59E0B',
  confirmed:      '#3B82F6',
  preparing:      '#8B5CF6',
  ready:          '#10B981',
  assigned:       '#06B6D4',
  pickedup:       '#F97316',
  on_the_way:     '#F97316',
  outfordelivery: '#84CC16',
}