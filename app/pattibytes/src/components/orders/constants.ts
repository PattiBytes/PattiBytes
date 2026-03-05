export const STATUS_COLORS: Record<string, string> = {
  pending:          '#F59E0B',
  confirmed:        '#3B82F6',
  preparing:        '#8B5CF6',
  ready:            '#10B981',
  assigned:         '#06B6D4',
  pickedup:         '#F97316',
  picked_up:        '#F97316',
  on_the_way:       '#F97316',
  outfordelivery:   '#84CC16',
  out_for_delivery: '#84CC16',
  delivered:        '#22C55E',
  cancelled:        '#EF4444',
  rejected:         '#EF4444',
}

export const STATUS_LABELS: Record<string, string> = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  preparing:        'Preparing',
  ready:            'Ready',
  assigned:         'Driver Assigned',
  pickedup:         'Picked Up',
  picked_up:        'Picked Up',
  on_the_way:       'On the Way',
  outfordelivery:   'Out for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
  rejected:         'Rejected',
}

export const ACTIVE_STATUSES     = ['pending','confirmed','preparing','ready','assigned','pickedup','picked_up','on_the_way','outfordelivery','out_for_delivery']
export const COMPLETED_STATUSES  = ['delivered']
export const CANCELLED_STATUSES  = ['cancelled','rejected']

export const TRACKABLE_STATUSES = [
  'assigned', 'pickedup', 'picked_up', 'on_the_way',
  'outfordelivery', 'out_for_delivery',
]

export const CANCELLABLE_STATUSES = ['pending', 'confirmed']

export const RESTAURANT_TIMELINE = [
  { key: 'pending',    label: 'Order Placed',    emoji: '🕐' },
  { key: 'confirmed',  label: 'Confirmed',        emoji: '✅' },
  { key: 'preparing',  label: 'Preparing',        emoji: '👨‍🍳' },
  { key: 'ready',      label: 'Ready for Pickup', emoji: '📦' },
  { key: 'assigned',   label: 'Driver Assigned',  emoji: '🛵' },
  { key: 'picked_up',  label: 'Picked Up',        emoji: '🚀' },
  { key: 'delivered',  label: 'Delivered',        emoji: '🎉' },
]

export const STORE_TIMELINE = [
  { key: 'pending',    label: 'Order Placed',    emoji: '🕐' },
  { key: 'confirmed',  label: 'Order Confirmed', emoji: '✅' },
  { key: 'preparing',  label: 'Packing Items',   emoji: '📦' },
  { key: 'ready',      label: 'Ready to Ship',   emoji: '🚚' },
  { key: 'assigned',   label: 'Driver Assigned', emoji: '🛵' },
  { key: 'picked_up',  label: 'Dispatched',      emoji: '🚀' },
  { key: 'delivered',  label: 'Delivered',       emoji: '🎉' },
]

export const CUSTOM_TIMELINE = [
  { key: 'pending',    label: 'Request Received', emoji: '📝' },
  { key: 'reviewing',  label: 'Under Review',     emoji: '🔍' },
  { key: 'quoted',     label: 'Quote Ready',      emoji: '💬' },
  { key: 'confirmed',  label: 'Confirmed',        emoji: '✅' },
  { key: 'preparing',  label: 'Packing',          emoji: '📦' },
  { key: 'dispatched', label: 'Dispatched',       emoji: '🚚' },
  { key: 'delivered',  label: 'Delivered',        emoji: '🎉' },
]

export const STATUS_ORDER = [
  'pending', 'confirmed', 'preparing', 'ready',
  'assigned', 'picked_up', 'pickedup', 'on_the_way',
  'outfordelivery', 'out_for_delivery', 'delivered',
]

export const CANCEL_REASONS = [
  'Ordered by mistake',
  'Delivery taking too long',
  'Found a better option',
  'Payment issue',
  'Changed my mind',
  'Restaurant not responding',
  'Item no longer needed',
]

export const STAR_LABELS: Record<number, string> = {
  5: '🎉 Excellent!', 4: '😊 Good', 3: '😐 Okay', 2: '😕 Not great', 1: '😢 Poor',
}
