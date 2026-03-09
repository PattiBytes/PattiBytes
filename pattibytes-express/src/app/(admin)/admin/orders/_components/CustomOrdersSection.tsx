/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import {
  ClipboardList, Clock, Eye, ChevronDown, ChevronUp,
  Trash2, CheckCircle, Tag, MapPin, Package,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { CUSTOM_STATUSES, formatDate, getTimeDiff, type CustomOrderRequest } from './shared';

interface QuoteForm { amount: string; message: string }

interface Props {
  requests:       CustomOrderRequest[];
  isAdmin:        boolean;
  updatingId:     string | null;
  deletingId:     string | null;
  onUpdateStatus: (req: CustomOrderRequest, status: string, quote?: { amount: number; message: string }) => void;
  onDelete:       (req: CustomOrderRequest) => void;
}

export function CustomOrdersSection({
  requests, isAdmin, updatingId, deletingId,
  onUpdateStatus, onDelete,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quotingId,  setQuotingId]  = useState<string | null>(null);
  const [quoteForm,  setQuoteForm]  = useState<QuoteForm>({ amount: '', message: '' });

  const toggleExpand = (id: string) =>
    setExpandedId(prev => prev === id ? null : id);

  const startQuote = (req: CustomOrderRequest) => {
    setQuotingId(req.id);
    setQuoteForm({
      amount:  req.quoted_amount ? String(req.quoted_amount) : '',
      message: req.quote_message ?? '',
    });
  };

  const submitQuote = (req: CustomOrderRequest) => {
    const amount = parseFloat(quoteForm.amount);
    if (!amount || amount <= 0) { alert('Enter a valid quote amount'); return; }
    onUpdateStatus(req, 'quoted', { amount, message: quoteForm.message.trim() });
    setQuotingId(null);
  };

  // ── Build flat array of <tr> rows — NO fragments inside <tbody> ────────────
  const buildDesktopRows = (req: CustomOrderRequest, index: number): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    const isDeleting = deletingId === req.id;
    const isUpdating = updatingId === req.id;

    // ── Main data row ──────────────────────────────────────────────────────
    rows.push(
      <tr
        key={req.id}
        className={[
          'hover:bg-purple-50 transition-all animate-fade-in',
          isDeleting ? 'opacity-50 bg-red-50' : '',
        ].join(' ')}
        style={{ animationDelay: `${index * 25}ms` }}
      >
        {/* Ref / Customer */}
        <td className="px-3 py-2">
          <p className="text-xs font-black text-purple-700 tracking-wide">
            {req.custom_order_ref}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {req.customerName || 'Unknown'}
          </p>
          {req.customerPhone && (
            <p className="text-xs text-gray-500">{req.customerPhone}</p>
          )}
        </td>

        {/* Categories */}
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {(req.category || 'custom').split(',').map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-0.5 text-xs bg-purple-100
                           text-purple-700 px-1.5 py-0.5 rounded-full font-semibold"
              >
                <Tag size={9} />{c.trim()}
              </span>
            ))}
          </div>
        </td>

        {/* Items count */}
        <td className="px-3 py-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
            <Package size={12} className="text-gray-400" />
            {Array.isArray(req.items) ? req.items.length : 0} item(s)
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-2">
          <StatusBadge status={req.status} />
        </td>

        {/* Quote */}
        <td className="px-3 py-2">
          {req.quoted_amount ? (
            <div>
              <p className="text-sm font-black text-green-700">Rs.{req.quoted_amount}</p>
              {req.quote_message && (
                <p className="text-xs text-gray-500 max-w-[120px] truncate">
                  {req.quote_message}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">Not quoted</span>
          )}
        </td>

        {/* Address */}
        <td className="px-3 py-2">
          {req.delivery_address ? (
            <p className="text-xs text-gray-600 max-w-[140px] truncate flex items-start gap-0.5">
              <MapPin size={10} className="text-gray-400 shrink-0 mt-0.5" />
              {req.delivery_address}
            </p>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </td>

        {/* Created */}
        <td className="px-3 py-2">
          <p className="text-xs text-gray-900">{formatDate(req.created_at).split(',')[0]}</p>
          <p className="text-xs text-gray-500">{formatDate(req.created_at).split(',')[1]}</p>
          {req.updated_at && (
            <p className="text-xs text-blue-500 flex items-center gap-0.5 mt-0.5">
              <Clock size={9} />
              {getTimeDiff(req.created_at, req.updated_at)}
            </p>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => toggleExpand(req.id)}
              className="inline-flex items-center gap-0.5 px-2 py-1 text-xs
                         text-purple-700 border border-purple-300 rounded
                         hover:bg-purple-50 font-semibold transition"
            >
              <Eye size={12} />
              {expandedId === req.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {req.status === 'pending' && (
              <button
                type="button"
                onClick={() => startQuote(req)}
                disabled={isUpdating}
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs
                           text-teal-700 border border-teal-300 rounded
                           hover:bg-teal-50 font-semibold transition disabled:opacity-50"
              >
                Quote
              </button>
            )}

            {req.status === 'quoted' && (
              <button
                type="button"
                onClick={() => onUpdateStatus(req, 'confirmed')}
                disabled={isUpdating}
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs
                           text-blue-700 border border-blue-300 rounded
                           hover:bg-blue-50 font-semibold transition disabled:opacity-50"
              >
                <CheckCircle size={11} />
                Confirm
              </button>
            )}

            <select
              value={req.status}
              disabled={isUpdating || isDeleting}
              onChange={e => onUpdateStatus(req, e.target.value)}
              className="px-2 py-1 text-xs rounded border border-gray-300
                         hover:border-purple-400 disabled:opacity-50 font-semibold"
            >
              {CUSTOM_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(req)}
                disabled={isDeleting}
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs
                           text-red-600 border border-red-300 rounded
                           hover:bg-red-50 font-semibold transition disabled:opacity-50"
              >
                <Trash2 size={12} className={isDeleting ? 'animate-spin' : ''} />
                {isDeleting ? 'Wait' : 'Del'}
              </button>
            )}
          </div>
        </td>
      </tr>
    );

    // ── Inline quote form row (only when quoting this req) ─────────────────
    if (quotingId === req.id) {
      rows.push(
        <tr key={req.id + '-quote'}>
          <td colSpan={8} className="px-4 py-3 bg-teal-50 border-b">
            <p className="text-xs font-black text-teal-800 mb-2">
              Set Quote for {req.custom_order_ref}
            </p>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-600 font-semibold block mb-1">
                  Quote Amount (Rs.) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={quoteForm.amount}
                  onChange={e => setQuoteForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 250"
                  className="w-32 px-2 py-1.5 text-sm border-2 border-teal-300 rounded-lg
                             focus:ring-2 focus:ring-teal-400 font-semibold"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-600 font-semibold block mb-1">
                  Message to customer
                </label>
                <input
                  type="text"
                  value={quoteForm.message}
                  onChange={e => setQuoteForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="e.g. Including delivery fee"
                  className="w-full px-2 py-1.5 text-sm border-2 border-teal-300 rounded-lg
                             focus:ring-2 focus:ring-teal-400 font-semibold"
                />
              </div>
              <button
                type="button"
                onClick={() => submitQuote(req)}
                className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-lg
                           font-black hover:bg-teal-700 transition"
              >
                Send Quote
              </button>
              <button
                type="button"
                onClick={() => setQuotingId(null)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg
                           font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </td>
        </tr>
      );
    }

    // ── Expanded detail row (only when expanded and NOT quoting) ───────────
    if (expandedId === req.id && quotingId !== req.id) {
      rows.push(
        <tr key={req.id + '-detail'}>
          <td colSpan={8} className="px-4 py-3 bg-purple-50 border-b">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black text-purple-800 mb-1.5">Items Requested</p>
                <ul className="space-y-1">
                  {(Array.isArray(req.items) ? req.items : []).map((it: any, i: number) => (
                    <li
                      key={i}
                      className="text-xs flex items-start gap-2 text-purple-700 font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1 shrink-0" />
                      <span>{it.quantity ?? 1} {it.unit ?? 'pc'} - {it.name}</span>
                      {it.note && (
                        <span className="text-gray-500 font-normal">({it.note})</span>
                      )}
                      {it.price > 0 && (
                        <span className="ml-auto text-purple-600 font-black shrink-0">
                          Rs.{(it.price * (it.quantity ?? 1)).toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5 text-xs">
                {req.description && (
                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                    <p className="font-black text-purple-800 mb-0.5">Description</p>
                    <p className="text-gray-700">{req.description}</p>
                  </div>
                )}
                {req.delivery_address && (
                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                    <p className="font-black text-purple-800 mb-0.5">Delivery Address</p>
                    <p className="text-gray-700 whitespace-pre-line">{req.delivery_address}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {req.delivery_fee != null && (
                    <div className="bg-white rounded-lg p-2 border border-purple-100">
                      <p className="font-black text-purple-800">Delivery Fee</p>
                      <p className="text-gray-700">Rs.{req.delivery_fee}</p>
                    </div>
                  )}
                  {req.payment_method && (
                    <div className="bg-white rounded-lg p-2 border border-purple-100">
                      <p className="font-black text-purple-800">Payment</p>
                      <p className="text-gray-700 uppercase">{req.payment_method}</p>
                    </div>
                  )}
                </div>
                {req.admin_notes && (
                  <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                    <p className="font-black text-yellow-800 mb-0.5">Admin Notes</p>
                    <p className="text-yellow-700">{req.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      );
    }

    return rows;
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!requests.length) {
    return (
      <div className="text-center py-12 text-gray-400 animate-fade-in">
        <ClipboardList size={36} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No custom order requests found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-fade-in">

      {/* ── Desktop table ── NO fragments inside tbody ─────────────────────── */}
      <table className="w-full hidden lg:table text-sm">
        <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <tr>
            {['Ref / Customer','Categories','Items','Status','Quote','Address','Created','Actions'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-purple-700 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        {/*
          flatMap produces a flat React.ReactNode[] — each element already has a key.
          This avoids ALL fragment-in-tbody issues with Turbopack.
        */}
        <tbody className="divide-y">
          {requests.flatMap((req, i) => buildDesktopRows(req, i))}
        </tbody>
      </table>

      {/* ── Mobile cards ───────────────────────────────────────────────────── */}
      <div className="lg:hidden divide-y">
        {requests.map((req, index) => {
          const isDeleting = deletingId === req.id;
          const isUpdating = updatingId === req.id;

          return (
            <div
              key={req.id}
              className={[
                'p-3 transition-all animate-fade-in',
                isDeleting ? 'opacity-50 bg-red-50' : '',
              ].join(' ')}
              style={{ animationDelay: `${index * 25}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-black text-purple-600 tracking-wide">
                    {req.custom_order_ref}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {req.customerName || 'Unknown'}
                  </p>
                  {req.customerPhone && (
                    <p className="text-xs text-gray-500">{req.customerPhone}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={req.status} />
                  {req.quoted_amount != null && (
                    <p className="text-sm font-black text-green-700 mt-1">
                      Rs.{req.quoted_amount}
                    </p>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1 mb-2">
                {(req.category || 'custom').split(',').map(c => (
                  <span
                    key={c}
                    className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5
                               rounded-full font-semibold"
                  >
                    {c.trim()}
                  </span>
                ))}
                <span className="text-xs text-gray-500 font-medium flex items-center gap-0.5">
                  <Package size={10} />
                  {Array.isArray(req.items) ? req.items.length : 0} item(s)
                </span>
              </div>

              {/* Address */}
              {req.delivery_address && (
                <p className="text-xs text-gray-600 mb-2 flex items-start gap-0.5">
                  <MapPin size={10} className="shrink-0 mt-0.5 text-gray-400" />
                  <span className="truncate">{req.delivery_address}</span>
                </p>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-2 flex-wrap">
                <span>{formatDate(req.created_at)}</span>
                {req.updated_at && (
                  <span className="text-blue-500 flex items-center gap-0.5">
                    <Clock size={9} />
                    {getTimeDiff(req.created_at, req.updated_at)}
                  </span>
                )}
              </div>

              {/* Mobile quote form */}
              {quotingId === req.id && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-2 space-y-2">
                  <p className="text-xs font-black text-teal-800">Set Quote</p>
                  <input
                    type="number"
                    min={1}
                    value={quoteForm.amount}
                    onChange={e => setQuoteForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Amount (Rs.)"
                    className="w-full px-2 py-1.5 text-sm border-2 border-teal-300
                               rounded-lg font-semibold"
                  />
                  <input
                    type="text"
                    value={quoteForm.message}
                    onChange={e => setQuoteForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Message to customer (optional)"
                    className="w-full px-2 py-1.5 text-sm border-2 border-teal-300
                               rounded-lg font-semibold"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => submitQuote(req)}
                      className="flex-1 py-1.5 text-xs bg-teal-600 text-white
                                 rounded-lg font-black"
                    >
                      Send Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotingId(null)}
                      className="px-3 py-1.5 text-xs bg-white border rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile expanded items */}
              {expandedId === req.id && quotingId !== req.id && (
                <div className="bg-purple-50 rounded-xl p-3 mb-2">
                  <p className="text-xs font-black text-purple-800 mb-1.5">Items</p>
                  <ul className="space-y-1">
                    {(Array.isArray(req.items) ? req.items : []).map((it: any, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-purple-700 font-semibold flex items-start gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1 shrink-0" />
                        <span>{it.quantity ?? 1} {it.unit ?? 'pc'} - {it.name}</span>
                        {it.price > 0 && (
                          <span className="ml-auto text-purple-600 font-black shrink-0">
                            Rs.{(it.price * (it.quantity ?? 1)).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {req.description && (
                    <p className="mt-2 text-xs text-gray-600 italic">{req.description}</p>
                  )}
                </div>
              )}

              {/* Mobile actions */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleExpand(req.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs
                             rounded-lg bg-purple-600 text-white font-semibold
                             transition hover:scale-105"
                >
                  <Eye size={12} />
                  {expandedId === req.id ? 'Collapse' : 'Details'}
                </button>

                {req.status === 'pending' && quotingId !== req.id && (
                  <button
                    type="button"
                    onClick={() => startQuote(req)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs
                               rounded-lg bg-teal-600 text-white font-semibold
                               transition hover:scale-105"
                  >
                    Quote
                  </button>
                )}

                {req.status === 'quoted' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(req, 'confirmed')}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs
                               rounded-lg bg-blue-600 text-white font-semibold
                               disabled:opacity-50 transition"
                  >
                    <CheckCircle size={12} />
                    Confirm
                  </button>
                )}

                <select
                  value={req.status}
                  disabled={isUpdating || isDeleting}
                  onChange={e => onUpdateStatus(req, e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-300
                             disabled:opacity-50 font-semibold flex-1"
                >
                  {CUSTOM_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDelete(req)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs
                               rounded-lg bg-red-600 text-white font-semibold
                               disabled:opacity-50 transition"
                  >
                    <Trash2 size={12} className={isDeleting ? 'animate-spin' : ''} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
