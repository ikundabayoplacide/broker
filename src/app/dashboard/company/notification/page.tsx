"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/ui/DashboardLayout";
import Card from "@/components/ui/Card";
import { FiBell, FiCheck, FiEye, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata?: unknown;
}

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNotificationId, setDeleteNotificationId] = useState<string | null>(null);
  const itemsPerPage = 5;

  const displayName = (() => {
    const fullName = (user?.fullName as string | undefined)?.trim() ?? "";
    const fallbackName = user?.email ? user.email.split("@")[0] : "User";
    return fullName || fallbackName;
  })();
  
  const email = user?.email ?? "Not provided";

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const fetchNotifications = async (page = 1) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/company/notifications?page=${page}&limit=${itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/company/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const confirmDelete = (notificationId: string) => {
    setDeleteNotificationId(notificationId);
    setShowDeleteModal(true);
  };

  const deleteNotification = async () => {
    if (!deleteNotificationId) return;
    try {
      await fetch('/api/company/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId: deleteNotificationId }),
      });
      setShowDeleteModal(false);
      setDeleteNotificationId(null);
      fetchNotifications(currentPage);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/company/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const filteredNotifications = notifications.filter(notif => 
    filter === 'all' || (filter === 'unread' && !notif.isRead)
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DashboardLayout userName={displayName} userEmail={email}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with your account activities</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-[#004B5B] text-white rounded-lg hover:bg-[#006B85] transition"
            >
              <FiCheck className="h-4 w-4" />
              Mark All Read
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all' 
                ? 'bg-[#004B5B] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'unread' 
                ? 'bg-[#004B5B] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004B5B] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading notifications...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <FiBell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-gray-600">
                  {filter === 'unread' 
                    ? 'All caught up! You have no unread notifications.' 
                    : 'You have no notifications at this time.'}
                </p>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card key={notification.id} className="p-4 hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${!notification.isRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <FiBell className={`h-5 w-5 ${!notification.isRead ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-sm text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.isRead && (
                            <>
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                                title="Mark as read"
                              >
                                <FiEye className="h-4 w-4 text-gray-500" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => confirmDelete(notification.id)}
                            className="p-1 hover:bg-red-100 rounded transition"
                            title="Delete notification"
                          >
                            <FiTrash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  onClick={() => fetchNotifications(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => fetchNotifications(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Notification</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to delete this notification? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteNotification}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}