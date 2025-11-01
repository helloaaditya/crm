import { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import API from '../api';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 20,
        ...(filter === 'unread' && { unreadOnly: true })
      };
      const response = await API.notifications.getAll(params);
      setNotifications(response.data.data);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await API.notifications.getUnreadCount();
      setUnreadCount(response.data.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await API.notifications.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await API.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      fetchUnreadCount(); // Refresh count
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await API.notifications.deleteAllRead();
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate to action URL if exists
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0";
    
    switch (type) {
      case 'project_assigned':
      case 'project_updated':
        return <div className={`${iconClass} bg-blue-100 text-blue-600`}>📋</div>;
      case 'work_update_submitted':
        return <div className={`${iconClass} bg-green-100 text-green-600`}>✅</div>;
      case 'leave_approved':
        return <div className={`${iconClass} bg-green-100 text-green-600`}>✓</div>;
      case 'leave_rejected':
        return <div className={`${iconClass} bg-red-100 text-red-600`}>✗</div>;
      case 'salary_processed':
        return <div className={`${iconClass} bg-emerald-100 text-emerald-600`}>💰</div>;
      case 'invoice_generated':
        return <div className={`${iconClass} bg-purple-100 text-purple-600`}>📄</div>;
      case 'payment_received':
        return <div className={`${iconClass} bg-green-100 text-green-600`}>💵</div>;
      case 'low_stock_alert':
        return <div className={`${iconClass} bg-orange-100 text-orange-600`}>⚠️</div>;
      case 'birthday_today':
        return <div className={`${iconClass} bg-pink-100 text-pink-600`}>🎂</div>;
      case 'reminder_due':
        return <div className={`${iconClass} bg-yellow-100 text-yellow-600`}>⏰</div>;
      default:
        return <div className={`${iconClass} bg-gray-100 text-gray-600`}>🔔</div>;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-red-500';
      case 'high': return 'border-l-4 border-orange-500';
      case 'normal': return 'border-l-4 border-blue-500';
      case 'low': return 'border-l-4 border-gray-300';
      default: return 'border-l-4 border-blue-500';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:absolute sm:right-0 sm:left-auto sm:bottom-auto sm:top-full sm:mt-2 w-full sm:w-96 bg-white sm:rounded-lg rounded-t-2xl shadow-xl z-50 border border-gray-200 max-h-[85vh] sm:max-h-[600px] flex flex-col animate-slide-up sm:animate-none">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl sm:rounded-t-lg">
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3"></div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg sm:text-base font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="h-6 w-6 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-sm rounded font-medium ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-sm rounded font-medium ${
                  filter === 'unread'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>

            {/* Action Buttons */}
            {notifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center space-x-1 px-3 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>Mark all read</span>
                  </button>
                )}
                {notifications.some(n => n.isRead) && (
                  <button
                    onClick={handleDeleteAllRead}
                    className="flex items-center space-x-1 px-3 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>Clear read</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {loading ? (
              <div className="p-8 sm:p-6 text-center text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-8 sm:w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 sm:p-6 text-center text-gray-500">
                <BellIcon className="h-16 w-16 sm:h-12 sm:w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 sm:p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="flex items-start space-x-3 sm:space-x-2">
                      {/* Icon */}
                      {getNotificationIcon(notification.type)}

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm sm:text-xs font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="ml-1 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-sm sm:text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification._id);
                            }}
                            className="p-2 sm:p-1 text-blue-600 hover:bg-blue-100 active:bg-blue-200 rounded"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification._id);
                          }}
                          className="p-2 sm:p-1 text-red-600 hover:bg-red-100 active:bg-red-200 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 sm:p-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-lg text-center safe-area-bottom">
              <a
                href="/notifications"
                className="text-sm text-indigo-600 hover:text-indigo-800 active:text-indigo-900 font-medium inline-block py-1"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

