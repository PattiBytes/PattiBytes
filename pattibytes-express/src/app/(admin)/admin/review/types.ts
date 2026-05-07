export interface Review {
  id: string
  name: string
  email: string
  rating: number
  review: string
  is_published: boolean
  admin_note: string | null
  created_at: string
  updated_at: string
}

export interface SupportMessage {
  id: string
  user_id: string | null
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  priority: number
  status: 'new' | 'seen' | 'replied' | 'closed'
  source: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any> | null
  created_at: string
  updated_at: string
}

export type ReviewFilterTab = 'all' | 'pending' | 'published'
export type SupportFilterTab = 'all' | 'new' | 'seen' | 'replied' | 'closed'
export type SortBy = 'newest' | 'rating_high' | 'rating_low'