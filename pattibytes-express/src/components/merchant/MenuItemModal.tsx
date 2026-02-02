/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import { menuService } from '@/services/menu';
import { MenuItem } from '@/types';
import { X, Upload, Link2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface MenuItemModalProps {
  item: MenuItem | null;
  merchantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function isValidHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function MenuItemModal({ item, merchantId, onClose, onSuccess }: MenuItemModalProps) {
  const [imageMode, setImageMode] = useState<'upload' | 'link'>(() => (item?.image_url ? 'link' : 'upload'));

  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: Number(item?.price ?? 0),
    category: item?.category || 'Main Course',
    image_url: item?.image_url || '',
    is_available: item?.is_available ?? true,
    is_veg: item?.is_veg ?? true,
    preparation_time: Number((item as any)?.preparation_time ?? 30),
    discount_percentage: Number((item as any)?.discount_percentage ?? 0),
    category_id: (item as any)?.category_id ?? null,
  });

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const imageOk = useMemo(() => !formData.image_url || isValidHttpUrl(formData.image_url), [formData.image_url]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'menu-items');
      setFormData((p) => ({ ...p, image_url: url }));
      toast.success('Image uploaded successfully');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error('Name is required');
    if (!Number.isFinite(formData.price) || formData.price < 0) return toast.error('Invalid price');
    if (!Number.isFinite(formData.preparation_time) || formData.preparation_time < 0) return toast.error('Invalid preparation time');
    if (!Number.isFinite(formData.discount_percentage) || formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      return toast.error('Discount must be 0 to 100');
    }
    if (!imageOk) return toast.error('Image URL must be a valid http/https link');

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        price: Number(formData.price),
        category: formData.category,
        image_url: formData.image_url || '',
        is_available: Boolean(formData.is_available),
        is_veg: Boolean(formData.is_veg),
        preparation_time: Number(formData.preparation_time),
        discount_percentage: Number(formData.discount_percentage),
        category_id: formData.category_id,
      };

      if (item) {
        await menuService.updateMenuItem(item.id, payload);
        toast.success('Menu item updated successfully');
      } else {
        await menuService.createMenuItem({ ...payload, merchant_id: merchantId });
        toast.success('Menu item added successfully');
      }

      onSuccess();
    } catch {
      toast.error('Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{item ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-medium text-gray-700">Item Image</label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold border ${imageMode === 'upload' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('link')}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold border ${imageMode === 'link' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  Use Link
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {formData.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center border">
                  {imageMode === 'link' ? <Link2 className="text-gray-400" size={32} /> : <Upload className="text-gray-400" size={32} />}
                </div>
              )}

              <div className="flex-1">
                {imageMode === 'upload' ? (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 inline-block"
                    >
                      {uploading ? 'Uploading...' : 'Choose Image'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Uploads to Cloudinary folder: menu-items</p>
                  </>
                ) : (
                  <>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                      placeholder="https://res.cloudinary.com/.../menu-items/....png"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        imageOk ? 'border-gray-300' : 'border-red-400'
                      }`}
                    />
                    {!imageOk && <p className="text-xs text-red-600 mt-1">Please enter a valid http/https URL</p>}
                    <p className="text-xs text-gray-500 mt-2">Paste any public image URL (Cloudinary recommended).</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Price & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((p) => ({ ...p, price: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="Starter">Starter</option>
                <option value="Main Course">Main Course</option>
                <option value="Dessert">Dessert</option>
                <option value="Beverage">Beverage</option>
                <option value="Snack">Snack</option>
                <option value="Combo">Combo</option>
              </select>
            </div>
          </div>

          {/* Prep time & Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preparation time (minutes)</label>
              <input
                type="number"
                min={0}
                value={formData.preparation_time}
                onChange={(e) => setFormData((p) => ({ ...p, preparation_time: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.discount_percentage}
                onChange={(e) => setFormData((p) => ({ ...p, discount_percentage: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_veg}
                onChange={(e) => setFormData((p) => ({ ...p, is_veg: e.target.checked }))}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-700">Vegetarian</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData((p) => ({ ...p, is_available: e.target.checked }))}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-700">Available</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
