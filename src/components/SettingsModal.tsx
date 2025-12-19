import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../store';
import { exportData, importData, clearAllData } from '../db';
import toast from 'react-hot-toast';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { requestNotificationPermission, playNotificationSound } from '../hooks/useTaskAssignmentNotification';

export function SettingsModal() {
  const { settingsModalOpen, closeSettingsModal } = useUIStore();
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission as 'default' | 'granted' | 'denied');
    }
  }, [settingsModalOpen]);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationStatus('granted');
      toast.success('Notifications enabled!');
      // Play test sound
      playNotificationSound();
    } else {
      setNotificationStatus(Notification.permission as 'default' | 'granted' | 'denied');
      toast.error('Notifications not allowed. Please enable in browser settings.');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      toast.success('Data imported successfully! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Failed to import data. Please check the file format.');
    }
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      toast.success('All data cleared! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  if (!settingsModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[98vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Premium Header - Responsive */}
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-0.5 sm:mb-1">Account</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
              Settings
            </h2>
          </div>
          <button
            onClick={closeSettingsModal}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Responsive */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-zinc-50 dark:bg-zinc-800/50 space-y-4 sm:space-y-6">

          {/* Profile Section - Responsive */}
          <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 border-l-4 border-l-orange-500">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 sm:mb-3">Profile</p>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl sm:text-2xl font-black uppercase flex-shrink-0">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white truncate">{profile?.name || 'User'}</h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  {profile?.role || 'Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Appearance Section - Responsive */}
          <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 border-l-4 border-l-purple-500">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3 sm:mb-4">Appearance</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Light Mode */}
              <button
                onClick={() => setTheme('light')}
                className={`p-2.5 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 transition-all ${theme === 'light'
                  ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                  : 'bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border-2 border-transparent'
                  }`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
                <span className={`text-[10px] sm:text-xs font-bold uppercase ${theme === 'light' ? 'text-orange-600' : 'text-zinc-600 dark:text-zinc-300'}`}>Light</span>
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => setTheme('dark')}
                className={`p-2.5 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 transition-all ${theme === 'dark'
                  ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                  : 'bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border-2 border-transparent'
                  }`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
                <span className={`text-[10px] sm:text-xs font-bold uppercase ${theme === 'dark' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-600 dark:text-zinc-300'}`}>Dark</span>
              </button>

              {/* System Mode */}
              <button
                onClick={() => setTheme('system')}
                className={`p-2.5 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 transition-all ${theme === 'system'
                  ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                  : 'bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 border-2 border-transparent'
                  }`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className={`text-[10px] sm:text-xs font-bold uppercase ${theme === 'system' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-600 dark:text-zinc-300'}`}>System</span>
              </button>
            </div>
          </div>

          {/* Security Section */}

          {/* Notifications Section */}
          <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 border-l-4 border-l-blue-500">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3 sm:mb-4">Notifications</p>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center ${notificationStatus === 'granted'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : notificationStatus === 'denied'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                  <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${notificationStatus === 'granted'
                      ? 'text-green-600'
                      : notificationStatus === 'denied'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white text-sm">
                    {notificationStatus === 'granted' ? 'Enabled' : notificationStatus === 'denied' ? 'Blocked' : 'Not Enabled'}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {notificationStatus === 'granted'
                      ? 'You will receive task notifications'
                      : notificationStatus === 'denied'
                        ? 'Enable in browser settings'
                        : 'Get notified when tasks are assigned'}
                  </div>
                </div>
              </div>
              {notificationStatus !== 'granted' && (
                <button
                  onClick={handleEnableNotifications}
                  disabled={notificationStatus === 'denied'}
                  className="px-3 sm:px-4 py-2 bg-blue-500 text-white text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enable
                </button>
              )}
              {notificationStatus === 'granted' && (
                <button
                  onClick={() => playNotificationSound()}
                  className="px-3 sm:px-4 py-2 bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-bold uppercase tracking-wide hover:bg-zinc-300 dark:hover:bg-zinc-500 transition-colors"
                >
                  Test
                </button>
              )}
            </div>
          </div>

          {/* Security Section (original) */}
          <div className="bg-white dark:bg-zinc-800 p-6 border-l-4 border-l-zinc-200 dark:border-l-zinc-600">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Security</p>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center gap-4 p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-zinc-900 uppercase text-sm tracking-wide">Change Password</div>
                <div className="text-xs text-zinc-500">Update your account password</div>
              </div>
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Data Management Section */}
          <div className="bg-white p-6 border-l-4 border-l-zinc-200">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Data Management</p>
            <div className="space-y-3">
              {/* Export */}
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-4 p-4 bg-zinc-50 hover:bg-emerald-50 transition-colors group"
              >
                <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-zinc-900 uppercase text-sm tracking-wide">Export Data</div>
                  <div className="text-xs text-zinc-500">Download all data as JSON</div>
                </div>
              </button>

              {/* Import */}
              <label className="w-full flex items-center gap-4 p-4 bg-zinc-50 hover:bg-blue-50 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-zinc-900 uppercase text-sm tracking-wide">Import Data</div>
                  <div className="text-xs text-zinc-500">Restore from backup file</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              {/* Clear Data */}
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center gap-4 p-4 bg-zinc-50 hover:bg-red-50 transition-colors group"
                >
                  <div className="w-12 h-12 bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-red-600 uppercase text-sm tracking-wide">Clear All Data</div>
                    <div className="text-xs text-zinc-500">Delete all local data permanently</div>
                  </div>
                </button>
              ) : (
                <div className="p-4 bg-red-50 border-l-4 border-l-red-500">
                  <p className="text-sm font-bold text-red-700 mb-3">Are you sure? This cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-2 bg-white text-zinc-600 font-bold text-sm uppercase hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearData}
                      className="flex-1 py-2 bg-red-600 text-white font-bold text-sm uppercase hover:bg-red-700 transition-colors"
                    >
                      Delete All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="text-center py-4 text-zinc-400 text-xs">
            <p className="font-bold uppercase tracking-widest">Asinify</p>
            <p className="mt-1">Version 1.0.0</p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
