// Shared types for the Customer Dashboard
// Column names match the Supabase table schema (no underscores)

export type AppSettings = {
  appname: string | null
  applogourl: string | null
  announcement: any
  showmenuimages: boolean | null
  deliveryfee: number | null
  customersearchradiuskm: number | null
  facebookurl: string | null
  instagramurl: string | null
  youtubeurl: string | null
  twitterurl: string | null
  customlinks: any | null
  supportphone: string | null
  supportemail: string | null
}

export type Merchant = {
  id: string
  businessname: string
  logourl: string | null
  bannerurl: string | null
  averagerating: number | null
  totalreviews: number | null
  estimatedpreptime: number | null
  minorderamount: number | null
  latitude: number | null
  longitude: number | null
  openingtime: string | null
  closingtime: string | null
  isfeatured: boolean | null
  city: string | null
  cuisinetypes: string[]
  distancekm?: number
  offerlabel?: string | null
  isopen?: boolean
}

export type ActiveOrder = {
  id: string
  ordernumber: number
  status: string
  totalamount: number
  merchantid?: string
  merchantname?: string
}

export type TrendingDish = {
  id: string
  name: string
  price: number
  discountpercentage: number | null
  imageurl: string | null
  merchantid: string
  merchantname: string
  count: number
}

export type GlobalDeal = {
  id: string
  code: string
  description: string | null
  discounttype: string
  discountvalue: number
  minorderamount: number | null
  validuntil: string | null
  dealtype?: string
  dealjson?: any
}

export type MenuResult = {
  id: string
  name: string
  price: number
  discountpercentage: number | null
  imageurl: string | null
  merchantid: string
  merchantname?: string
  category: string
}

export type Coords = { lat: number; lng: number }

export const ACTIVE_STATUSES = [
  'pending','confirmed','preparing','ready',
  'assigned','pickedup','ontheway','outfordelivery',
] as const

export const STATUS_COLORS: Record<string, string> = {
  pending:       '#F59E0B',
  confirmed:     '#3B82F6',
  preparing:     '#8B5CF6',
  ready:         '#10B981',
  assigned:      '#06B6D4',
  pickedup:      '#F97316',
  ontheway:      '#F97316',
  outfordelivery:'#84CC16',
}