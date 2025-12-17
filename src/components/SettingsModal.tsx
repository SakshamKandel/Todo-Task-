import { useState, useRef } from 'react';
import { useUIStore } from '../store';
import { exportData, importData, clearAllData } from '../db';
import toast from 'react-hot-toast';

export function SettingsModal() {
  const { settingsModalOpen, closeSettingsModal } = useUIStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <button
              onClick={closeSettingsModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Data Management */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Data Management</h3>
            <p className="text-sm text-gray-500 mb-4">
              Your data is stored locally in your browser using IndexedDB. Export your data regularly to avoid losing it.
            </p>

            <div className="space-y-3">
              {/* Export */}
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Export Data</div>
                  <div className="text-sm text-gray-500">Download all your data as JSON</div>
                </div>
              </button>

              {/* Import */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Import Data</div>
                  <div className="text-sm text-gray-500">Restore from a JSON backup</div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />

              {/* Clear */}
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center gap-3 p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-red-600">Clear All Data</div>
                    <div className="text-sm text-gray-500">Permanently delete everything</div>
                  </div>
                </button>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-3">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearData}
                      className="btn-danger flex-1"
                    >
                      Yes, Delete Everything
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
            <p className="text-sm text-gray-500">
              Todo Task is a local-first task management app. All your data is stored in your browser and never sent to any server.
            </p>
            <p className="text-sm text-gray-400 mt-2">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
