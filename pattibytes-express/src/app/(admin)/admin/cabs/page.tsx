/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layouts/DashboardLayout'

type CabBooking = {
  id:                   string
  booking_number:       number
  status:               string
  cab_type_slug:        string
  pickup_address:       string
  drop_address:         string
  estimated_fare:       number | null
  final_fare:           number | null
  payment_method:       string
  payment_status:       string
  customer_notes:       string | null
  created_at:           string
  customer_id:          string
  customer_name?:       string
  customer_phone?:      string
}

const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-800',
  accepted:    'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed:   'bg-green-100 text-green-800',
  cancelled:   'bg-red-100 text-red-800',
}

const ALL_STATUSES = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled']

export default function AdminCabsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router  = useRouter()
  const [bookings, setBookings]   = useState<CabBooking[]>([])
  const [loading,  setLoading]    = useState(true)
  const [filter,   setFilter]     = useState('all')
  const [search,   setSearch]     = useState('')

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const q = supabase
        .from('cab_bookings')
        .select('id,booking_number,status,cab_type_slug,pickup_address,drop_address,estimated_fare,final_fare,payment_method,payment_status,customer_notes,created_at,customer_id')
        .order('created_at', { ascending: false })
        .limit(200)

      if (filter !== 'all') q.eq('status', filter)

      const { data, error } = await q
      if (error) throw error

      // Enrich with customer profile
      const cids = [...new Set((data ?? []).map((b: any) => b.customer_id))]
      const cMap: Record<string, { full_name: string; phone: string }> = {}
      if (cids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id,full_name,phone')
          .in('id', cids)
        ;(profiles ?? []).forEach((p: any) => { cMap[p.id] = p })
      }

      setBookings((data ?? []).map((b: any) => ({
        ...b,
        customer_name:  cMap[b.customer_id]?.full_name ?? 'Unknown',
        customer_phone: cMap[b.customer_id]?.phone ?? null,
      })))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadBookings() }, [loadBookings])

  const filtered = bookings.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      String(b.booking_number).includes(q) ||
      (b.customer_name ?? '').toLowerCase().includes(q) ||
      (b.customer_phone ?? '').includes(q) ||
      b.pickup_address.toLowerCase().includes(q) ||
      b.drop_address.toLowerCase().includes(q)
    )
  })

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">🚕 Cab Bookings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review requests and contact customers manually
            </p>
          </div>
          <button
            onClick={loadBookings}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl transition"
          >
            Refresh
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>📞 Manual Contact Flow:</strong> When a customer books a cab, admins receive a push notification.
          Call or WhatsApp the customer to confirm, assign a driver, and update the booking status here.
        </div>

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="Search by name, phone, address, booking #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2 flex-wrap">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-700 border transition ${
                  filter === s
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {s.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {(['pending','accepted','in_progress','completed','cancelled'] as const).map(s => {
            const count = bookings.filter(b => b.status === s).length
            return (
              <div key={s} className="bg-white rounded-xl p-4 border border-gray-100 text-center cursor-pointer hover:border-orange-300 transition" onClick={() => setFilter(s)}>
                <div className="text-2xl font-black text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{s.replace('_', ' ')}</div>
              </div>
            )
          })}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🚕</div>
            <div className="font-bold">No bookings found</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Cab</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Route</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Fare</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-700 text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-orange-50/40 transition">
                    <td className="px-4 py-3 font-black text-gray-900">#{b.booking_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-700 text-gray-900">{b.customer_name}</div>
                      {b.customer_phone && (
                        <a
                          href={`tel:${b.customer_phone}`}
                          className="text-xs text-orange-600 hover:underline font-600"
                        >
                          📞 {b.customer_phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-orange-100 text-orange-800 text-xs font-800 px-2 py-1 rounded-lg">
                        {b.cab_type_slug.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="text-xs text-gray-700 truncate">📍 {b.pickup_address}</div>
                      <div className="text-xs text-gray-500 truncate">🏁 {b.drop_address}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-700 text-gray-900">
                        {b.final_fare != null
                          ? `₹${Number(b.final_fare).toFixed(0)}`
                          : b.estimated_fare != null
                          ? `~₹${Number(b.estimated_fare).toFixed(0)}`
                          : '—'}
                      </div>
                      <div className="text-xs text-gray-400">{b.payment_method}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-800 px-2 py-1 rounded-lg ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {b.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/cabs/${b.id}`}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-700 px-3 py-1.5 rounded-lg transition"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

