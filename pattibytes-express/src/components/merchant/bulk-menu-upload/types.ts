export interface DishTimingSlot {
  from: string;   // 'HH:MM' 24-hour
  to: string;     // 'HH:MM' 24-hour
  days: number[]; // 0=Sun, 1=Mon … 6=Sat
}

export interface DishTiming {
  type: 'always' | 'scheduled';
  enabled: boolean;
  slots: DishTimingSlot[];
}

export interface Row {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  is_veg: boolean;
  preparation_time: number;
  discount_percentage: number;
  category_id: string | null;
  dish_timing: DishTiming | null;
  _file?: File | null;
}

