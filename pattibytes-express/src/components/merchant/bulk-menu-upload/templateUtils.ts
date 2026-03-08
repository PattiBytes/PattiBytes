import Papa  from 'papaparse';
import * as XLSX from 'xlsx';
import { downloadBlob } from './helpers';

function templateSample() {
  return [{
    name: 'Pizza', description: 'Very nice chopping', price: 98,
    category: 'Main Course', image_url: 'https://res.cloudinary.com/...png',
    is_available: true, is_veg: true, preparation_time: 30,
    discount_percentage: 0, category_id: '',
  }];
}
export function downloadCsvTemplate() {
  downloadBlob('menu_template.csv', new Blob([Papa.unparse(templateSample())], { type: 'text/csv;charset=utf-8' }));
}
export function downloadJsonTemplate() {
  downloadBlob('menu_template.json', new Blob([JSON.stringify(templateSample(), null, 2)], { type: 'application/json' }));
}
export function downloadExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet(templateSample());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'menu');
  XLSX.writeFile(wb, 'menu_template.xlsx');
}
