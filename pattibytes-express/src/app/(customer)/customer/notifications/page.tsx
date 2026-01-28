/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Bell, Check, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
      case 'new_order_admin':
        return '📦';
      case 'order_confirmed':
      case 'order_confirmed_admin':
        return '✅';
      case 'order_ready':
        return '🍽️';
      case 'out_for_delivery':
        return '🚚';
      case 'delivered':
      case 'order_completed':
        return '🎉';
      case 'delivery_assigned':
      case 'ready_for_pickup':
        return '🚚';
      case 'access_approved':
        return '✅';
      case 'access_rejected':
        return '❌';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('approved') || type.includes('confirmed') || type.includes('delivered')) {
      return 'bg-green-50 border-green-200';
    }
    if (type.includes('rejected') || type.includes('cancelled')) {
      return 'bg-red-50 border-red-200';
    }
    if (type.includes('ready') || type.includes('delivery')) {
      return 'bg-blue-50 border-blue-200';
    }
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">Stay updated with your orders and activities</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Bell size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No notifications yet</h2>
            <p className="text-gray-600">We&apos;ll notify you when something important happens</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                  !notification.is_read ? getNotificationColor(notification.type) : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-gray-900">{notification.title}</h3>
                      {!notification.is_read && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold ml-2">
                          New
                        </span>
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-sm text-gray-600 mb-2">{notification.body}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
