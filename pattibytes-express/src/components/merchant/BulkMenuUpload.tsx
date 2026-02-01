/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkMenuUploadProps {
  merchantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface MenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
  is_veg: boolean;
  is_available: boolean;
}

export default function BulkMenuUpload({ merchantId, onClose, onSuccess }: BulkMenuUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MenuItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();

    try {
      if (fileType === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        validateAndPreview(Array.isArray(data) ? data : [data]);
      } else if (fileType === 'csv' || fileType === 'xlsx' || fileType === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        validateAndPreview(data);
      } else {
        toast.error('Unsupported file format. Use JSON, CSV, or Excel.');
      }
    } catch (error) {
      console.error('File parse error:', error);
      toast.error('Failed to parse file');
    }
  };

  const validateAndPreview = (data: any[]) => {
    const validated: MenuItem[] = [];
    const newErrors: string[] = [];

    data.forEach((row, index) => {
      if (!row.name || !row.price) {
        newErrors.push(`Row ${index + 1}: Missing name or price`);
        return;
      }

      validated.push({
        name: String(row.name),
        description: String(row.description || ''),
        price: parseFloat(row.price),
        category: String(row.category || 'Main Course'),
        is_veg: row.is_veg === true || row.is_veg === 'true' || row.is_veg === 1,
        is_available: row.is_available !== false && row.is_available !== 'false' && row.is_available !== 0,
      });
    });

    setPreview(validated);
    setErrors(newErrors);

    if (validated.length > 0) {
      toast.success(`${validated.length} items ready to upload`);
    }
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;

    setUploading(true);
    try {
     const items = preview.map((item) => ({
  merchant_id: merchantId,
  name: String(item.name).trim(),
  description: String(item.description || ''),
  price: Number(item.price),
  category: String(item.category || 'Main Course'),
  is_veg: !!item.is_veg,
  is_available: item.is_available !== false,
}));


      const { error } = await supabase.from('menu_items').insert(items);

      if (error) throw error;

      toast.success(`${items.length} items uploaded successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload menu items');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Butter Chicken',
        description: 'Creamy tomato curry with tender chicken',
        price: 350,
        category: 'Main Course',
        is_veg: false,
        is_available: true,
      },
      {
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese with spices',
        price: 250,
        category: 'Starters',
        is_veg: true,
        is_available: true,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu Items');
    XLSX.writeFile(wb, 'menu_template.xlsx');
    toast.success('Template downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Menu Upload</h2>
            <p className="text-sm text-gray-600 mt-1">Upload multiple menu items at once</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upload File</h3>
              <button
                onClick={downloadTemplate}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <FileText size={16} />
                Download Template
              </button>
            </div>

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-700 font-medium mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  Supports JSON, CSV, Excel (.xlsx, .xls)
                </p>
              </div>
              <input
                type="file"
                accept=".json,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">Validation Errors</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={20} />
                  Preview ({preview.length} items)
                </h3>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Price</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-700">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2">₹{item.price}</td>
                        <td className="px-4 py-2">{item.category}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.is_veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.is_veg ? '🌱 Veg' : '🍖 Non-veg'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || preview.length === 0}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : `Upload ${preview.length} Items`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
