'use client';
import { useState, useEffect } from 'react';
import { Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ADMIN_STATUSES, toDatetimeLocal, type OrderNormalized, type EditFields, cx } from './types';
import { CUSTOM_ORDER_STATUSES } from './StatusControl';

interface Props {
  order: OrderNormalized;
  saving: boolean;
  onSave: (fields: EditFields) => void;
}

const IC = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-white';

export function AdminEditPanel({ order, saving, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<EditFields>({
    paymentStatus:        order.paymentStatus    ?? 'pending',
    deliveryFee:          String(order.deliveryFee),
    discount:             String(order.discount),
    estimatedDeliveryTime: toDatetimeLocal(order.estimatedDeliveryTime),
    actualDeliveryTime:   toDatetimeLocal(order.actualDeliveryTime),
    preparationTime:      order.preparationTime != null ? String(order.preparationTime) : '',
    customerNotes:        order.customerNotes       ?? '',
    specialInstructions:  order.specialInstructions ?? '',
    deliveryInstructions: order.deliveryInstructions ?? '',
    cancellationReason:   order.cancellationReason  ?? '',
    recipientName:        order.recipientName        ?? '',
    customOrderStatus:    order.customOrderStatus    ?? '',
    quotedAmount:         order.quotedAmount != null ? String(order.quotedAmount) : '',
    quoteMessage:         order.quoteMessage         ?? '',
    platformHandled:      !!order.platformHandled,
  });

  // Sync when order refreshes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFields({
      paymentStatus:        order.paymentStatus    ?? 'pending',
      deliveryFee:          String(order.deliveryFee),
      discount:             String(order.discount),
      estimatedDeliveryTime: toDatetimeLocal(order.estimatedDeliveryTime),
      actualDeliveryTime:   toDatetimeLocal(order.actualDeliveryTime),
      preparationTime:      order.preparationTime != null ? String(order.preparationTime) : '',
      customerNotes:        order.customerNotes       ?? '',
      specialInstructions:  order.specialInstructions ?? '',
      deliveryInstructions: order.deliveryInstructions ?? '',
      cancellationReason:   order.cancellationReason  ?? '',
      recipientName:        order.recipientName        ?? '',
      customOrderStatus:    order.customOrderStatus    ?? '',
      quotedAmount:         order.quotedAmount != null ? String(order.quotedAmount) : '',
      quoteMessage:         order.quoteMessage         ?? '',
      platformHandled:      !!order.platformHandled,
    });
  }, [order]);

  const set = <K extends keyof EditFields>(k: K, v: EditFields[K]) =>
    setFields(p => ({ ...p, [k]: v }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-gray-50 transition"
      >
        <span className="font-bold text-gray-900 flex items-center gap-2">
          <Save className="w-5 h-5 text-primary" /> Admin Edit Fields
        </span>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 sm:px-6 pb-6 space-y-4 border-t">
          <div className="grid sm:grid-cols-2 gap-4 pt-4">

            {/* Payment status */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Payment Status</label>
              <select value={fields.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className={IC}>
                {['pending', 'paid', 'failed', 'refunded'].map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Prep time */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Prep Time (min)</label>
              <input type="number" min={0} className={IC} value={fields.preparationTime}
                onChange={e => set('preparationTime', e.target.value)} placeholder="e.g. 30" />
            </div>

            {/* Delivery fee */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Delivery Fee (₹)</label>
              <input type="number" min={0} step="0.01" className={IC} value={fields.deliveryFee}
                onChange={e => set('deliveryFee', e.target.value)} />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Discount (₹)</label>
              <input type="number" min={0} step="0.01" className={IC} value={fields.discount}
                onChange={e => set('discount', e.target.value)} />
            </div>

            {/* Estimated delivery */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Est. Delivery Time</label>
              <input type="datetime-local" className={IC} value={fields.estimatedDeliveryTime}
                onChange={e => set('estimatedDeliveryTime', e.target.value)} />
            </div>

            {/* Actual delivery */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Actual Delivery Time</label>
              <input type="datetime-local" className={IC} value={fields.actualDeliveryTime}
                onChange={e => set('actualDeliveryTime', e.target.value)} />
            </div>

            {/* Recipient name */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Recipient Name</label>
              <input type="text" className={IC} value={fields.recipientName}
                onChange={e => set('recipientName', e.target.value)} placeholder="e.g. Ranjit Singh" />
            </div>

            {/* Custom order status */}
            {(order.orderType === 'custom' || order.customOrderRef) && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Custom Order Status</label>
               <select
  value={fields.customOrderStatus}
  onChange={e => set('customOrderStatus', e.target.value)}
  className={IC}
>
  <option value="">— unchanged —</option>
  {CUSTOM_ORDER_STATUSES.map(s => (
    <option key={s} value={s}>
      {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </option>
  ))}
</select>
              </div>
            )}

            {/* Quoted amount */}
            {(order.orderType === 'custom' || order.customOrderRef) && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Quoted Amount (₹)</label>
                <input type="number" min={0} step="0.01" className={IC} value={fields.quotedAmount}
                  onChange={e => set('quotedAmount', e.target.value)} placeholder="e.g. 250.00" />
              </div>
            )}
          </div>

          {/* Multiline fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Customer Notes</label>
              <textarea rows={2} className={cx(IC, 'resize-none')} value={fields.customerNotes}
                onChange={e => set('customerNotes', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Special Instructions</label>
              <textarea rows={2} className={cx(IC, 'resize-none')} value={fields.specialInstructions}
                onChange={e => set('specialInstructions', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Delivery Instructions</label>
              <textarea rows={2} className={cx(IC, 'resize-none')} value={fields.deliveryInstructions}
                onChange={e => set('deliveryInstructions', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Quote Message</label>
              <textarea rows={2} className={cx(IC, 'resize-none')} value={fields.quoteMessage}
                onChange={e => set('quoteMessage', e.target.value)} placeholder="Admin reply to customer's custom order…" />
            </div>
            {order.status === 'cancelled' && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Cancellation Reason</label>
                <textarea rows={2} className={cx(IC, 'resize-none')} value={fields.cancellationReason}
                  onChange={e => set('cancellationReason', e.target.value)} />
              </div>
            )}
          </div>

          {/* Platform handled toggle */}
          {(order.orderType === 'custom' || order.customOrderRef) && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set('platformHandled', !fields.platformHandled)}
                className={cx(
                  'relative w-11 h-6 rounded-full transition-colors',
                  fields.platformHandled ? 'bg-primary' : 'bg-gray-200'
                )}
              >
                <span className={cx(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  fields.platformHandled ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
              <span className="text-sm font-semibold text-gray-700">Platform Handled</span>
            </label>
          )}

          <button
            type="button"
            onClick={() => onSave(fields)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl hover:bg-orange-600 font-bold disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
