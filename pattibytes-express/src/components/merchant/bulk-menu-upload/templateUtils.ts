import Papa  from 'papaparse';
import * as XLSX from 'xlsx';
import { downloadBlob } from './helpers';

const SAMPLE_TIMING = JSON.stringify({
  type: 'scheduled',
  enabled: true,
  slots: [{ from: '09:00', to: '22:00', days: [0, 1, 2, 3, 4, 5, 6] }],
});

function templateSample() {
  return [
    {
      name               : 'Paneer Butter Masala',
      description        : 'Rich and creamy paneer in tomato gravy',
      price              : 220,
      category           : 'Main Course',
      image_url          : '',
      is_available       : true,
      is_veg             : true,
      preparation_time   : 25,
      discount_percentage: 0,
      category_id        : '',
      dish_timing        : SAMPLE_TIMING,
    },
    {
      name               : 'Chicken Tikka',
      description        : 'Grilled chicken with spices',
      price              : 280,
      category           : 'Starter',
      image_url          : '',
      is_available       : true,
      is_veg             : false,
      preparation_time   : 20,
      discount_percentage: 10,
      category_id        : '',
      dish_timing        : '',          // leave blank for always-available
    },
  ];
}

export function downloadCsvTemplate() {
  downloadBlob(
    'menu_template.csv',
    new Blob([Papa.unparse(templateSample())], { type: 'text/csv;charset=utf-8' }),
  );
}

export function downloadJsonTemplate() {
  downloadBlob(
    'menu_template.json',
    new Blob([JSON.stringify(templateSample(), null, 2)], { type: 'application/json' }),
  );
}

export function downloadExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet(templateSample());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'menu');
  XLSX.writeFile(wb, 'menu_template.xlsx');
}

