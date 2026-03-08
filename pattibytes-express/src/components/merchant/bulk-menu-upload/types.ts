export type Row = {
  name:                string;
  description:         string;
  price:               number;
  category:            string;
  image_url:           string;
  is_available:        boolean;
  is_veg:              boolean;
  preparation_time:    number;
  discount_percentage: number;
  category_id:         string | null;
  _file?:              File | null;
};
