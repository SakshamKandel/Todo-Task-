import { useState, useRef } from 'react';
import { useUIStore } from '../store';
import { exportData, importData, clearAllData } from '../db';
import toast from 'react-hot-toast';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuth } from '../contexts/AuthContext';

export function SettingsModal() {
  const { settingsModalOpen, closeSettingsModal } = useUIStore();
  const { profile, signOut } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Premium Header */}
        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-1">Account</p>
            <h2 className="text-3xl font-bold text-zinc-900 uppercase tracking-tight">
              Settings
            </h2>
          </div>
          <button
            onClick={closeSettingsModal}
            className="w-12 h-12 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50 space-y-6">

          {/* Profile Section */}
          <div className="bg-white p-6 border-l-4 border-l-orange-500">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Profile</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-black uppercase">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{profile?.name || 'User'}</h3>
                <p className="text-sm text-zinc-500">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase bg-orange-100 text-orange-600">
                  {profile?.role || 'Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white p-6 border-l-4 border-l-zinc-200">
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
