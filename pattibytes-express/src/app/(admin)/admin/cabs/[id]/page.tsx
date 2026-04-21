/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { supabase } from '@/lib/supabase'
import { sendNotification } from '@/utils/notifications'
import DashboardLayout from '@/components/layouts/DashboardLayout'

type Booking = {
  id:                    string
  booking_number:        number
  customer_id:           string
  driver_id:             string | null
  cab_type_slug:         string
  pickup_address:        string
  pickup_landmark:       string | null
  drop_address:          string
  drop_landmark:         string | null
  estimated_distance_km: number | null
  estimated_fare:        number | null
  final_fare:            number | null
  payment_method:        string
  payment_status:        string
  customer_notes:        string | null
  driver_notes:          string | null
  status:                string
  cancellation_reason:   string | null
  cancelled_by:          string | null
  rating:                number | null
  created_at:            string
}

type Profile = {
  id:         string
  full_name:  string | null
  phone:      string | null
  email?:     string | null
  avatar_url: string | null
}

const STATUSES = ['pending','accepted','in_progress','completed','cancelled']

export default function AdminCabDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [booking,   setBooking]   = useState<Booking | null>(null)
  const [customer,  setCustomer]  = useState<Profile | null>(null)
  const [drivers,   setDrivers]   = useState<Profile[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)

  // Edit fields
  const [status,      setStatus]      = useState('')
  const [finalFare,   setFinalFare]   = useState('')
  const [driverNotes, setDriverNotes] = useState('')
  const [payStatus,   setPayStatus]   = useState('')
  const [assignedDriver, setAssignedDriver] = useState<string>('')
  const [cancelReason,   setCancelReason]   = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data: bk, error } = await supabase
        .from('cab_bookings')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      setBooking(bk as Booking)
      setStatus(bk.status)
      setFinalFare(bk.final_fare != null ? String(bk.final_fare) : '')
      setDriverNotes(bk.driver_notes ?? '')
      setPayStatus(bk.payment_status)
      setAssignedDriver(bk.driver_id ?? '')
      setCancelReason(bk.cancellation_reason ?? '')

      // Load customer + drivers in parallel
      const [custRes, drvRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,phone,avatar_url').eq('id', bk.customer_id).maybeSingle(),
        supabase.from('profiles').select('id,full_name,phone').eq('role', 'driver').eq('is_active', true),
      ])
      setCustomer(custRes.data as Profile)
      setDrivers((drvRes.data ?? []) as Profile[])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!booking) return
    setSaving(true)
    try {
      const now   = new Date().toISOString()
      const patch: any = {
        status:          status,
        payment_status:  payStatus,
        driver_notes:    driverNotes.trim() || null,
        final_fare:      finalFare.trim() !== '' ? Number(finalFare) : null,
        driver_id:       assignedDriver || null,
        updated_at:      now,
      }

      if (status === 'cancelled') {
        patch.cancelled_at        = now
        patch.cancelled_by        = 'admin'
        patch.cancellation_reason = cancelReason.trim() || 'Cancelled by admin'
      }
      if (status === 'accepted')    patch.accepted_at  = now
      if (status === 'in_progress') patch.started_at   = now
      if (status === 'completed')   patch.completed_at = now

      const { error } = await supabase
        .from('cab_bookings')
        .update(patch)
        .eq('id', id)
      if (error) throw error

      // Notify customer on status change
      if (status !== booking.status) {
        const msgs: Record<string, string> = {
          accepted:    `Your ${booking.cab_type_slug} cab is confirmed! Our driver will contact you.`,
          in_progress: `Your cab is on the way! Booking #${booking.booking_number}`,
          completed:   `Your ride is complete. Booking #${booking.booking_number}. Thank you!`,
          cancelled:   `Your cab booking #${booking.booking_number} has been cancelled. Reason: ${cancelReason || 'Admin cancelled'}`,
        }
        if (msgs[status]) {
          await sendNotification(
            booking.customer_id,
            `Cab ${status.replace('_', ' ')} — #${booking.booking_number}`,
            msgs[status],
            'system',
            { type: 'cab_booking', booking_id: booking.id },
          )
        }
      }

      toast.success('Booking updated!')
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !booking) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/cabs')} className="text-gray-400 hover:text-gray-700 transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              🚕 Cab Booking #{booking.booking_number}
            </h1>
            <p className="text-sm text-gray-500">{new Date(booking.created_at).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Route */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-4">🗺️ Route</h2>
              <div className="flex gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-700 uppercase">Pickup</div>
                  <div className="font-700 text-gray-900">{booking.pickup_address}</div>
                  {booking.pickup_landmark && <div className="text-xs text-gray-500">Near: {booking.pickup_landmark}</div>}
                </div>
              </div>
              <div className="ml-1.5 w-px h-5 bg-gray-200 mb-3" />
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-700 uppercase">Drop</div>
                  <div className="font-700 text-gray-900">{booking.drop_address}</div>
                  {booking.drop_landmark && <div className="text-xs text-gray-500">Near: {booking.drop_landmark}</div>}
                </div>
              </div>
            </div>

            {/* Admin controls */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-4">⚙️ Manage Booking</h2>

              <div className="grid sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs font-700 text-gray-500 mb-1.5 uppercase">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-700 text-gray-500 mb-1.5 uppercase">Payment Status</label>
                  <select
                    value={payStatus}
                    onChange={e => setPayStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {['pending','paid','failed','refunded'].map(s => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-700 text-gray-500 mb-1.5 uppercase">Final Fare (₹)</label>
                  <input
                    type="number"
                    value={finalFare}
                    onChange={e => setFinalFare(e.target.value)}
                    placeholder={booking.estimated_fare != null ? `Est. ₹${booking.estimated_fare}` : 'Enter final fare'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-700 text-gray-500 mb-1.5 uppercase">Assign Driver</label>
                  <select
                    value={assignedDriver}
                    onChange={e => setAssignedDriver(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">— No driver —</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name ?? 'Driver'} {d.phone ? `· ${d.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {status === 'cancelled' && (
                <div className="mt-4">
                  <label className="block text-xs font-700 text-gray-500 mb-1.5 uppercase">Cancellation Reason</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-700 text-gray-500 mb-1.5 uppercase">Driver Notes</label>
                <textarea
                  value={driverNotes}
                  onChange={e => setDriverNotes(e.target.value)}
                  placeholder="Notes for the driver or about the ride"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-900 py-3 rounded-xl transition"
              >
                {saving ? 'Saving…' : 'Save Changes & Notify Customer'}
              </button>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-5">

            {/* Customer info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-3">👤 Customer</h2>
              <div className="font-800 text-gray-900">{customer?.full_name ?? 'Unknown'}</div>
              {customer?.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1 text-orange-600 font-700 text-sm mt-1 hover:underline"
                >
                  📞 {customer.phone}
                </a>
              )}
              {customer?.phone && (
                <a
                  href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=Hi! Regarding your cab booking #${booking.booking_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-600 font-700 text-sm mt-1 hover:underline"
                >
                  💬 WhatsApp
                </a>
              )}
              {booking.customer_notes && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <span className="font-700">Note:</span> {booking.customer_notes}
                </div>
              )}
            </div>

            {/* Fare summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-3">💰 Fare</h2>
              <FareRow label="Cab Type"   value={booking.cab_type_slug.toUpperCase()} />
              {booking.estimated_distance_km && (
                <FareRow label="Est. Distance" value={`${booking.estimated_distance_km} km`} />
              )}
              {booking.estimated_fare != null && (
                <FareRow label="Est. Fare" value={`₹${Number(booking.estimated_fare).toFixed(0)}`} />
              )}
              {booking.final_fare != null && (
                <FareRow label="Final Fare" value={`₹${Number(booking.final_fare).toFixed(0)}`} highlight />
              )}
              <FareRow label="Payment" value={`${booking.payment_method} / ${booking.payment_status}`} />
            </div>

            {/* Booking meta */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-black text-gray-900 mb-3">📋 Booking Info</h2>
              <FareRow label="Booking #"  value={`#${booking.booking_number}`} />
              <FareRow label="Status"     value={booking.status.replace('_', ' ').toUpperCase()} />
              <FareRow label="Created"    value={new Date(booking.created_at).toLocaleString('en-IN')} />
              {booking.rating && (
                <FareRow label="Rating" value={'⭐'.repeat(booking.rating)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function FareRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-700 ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}