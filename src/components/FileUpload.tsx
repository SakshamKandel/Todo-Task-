import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface FileUploadProps {
    taskId: string;
    attachments: string[];
    onAttachmentsChange: (attachments: string[]) => void;
    disabled?: boolean;
}

export default function FileUpload({ taskId, attachments, onAttachmentsChange, disabled }: FileUploadProps) {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !user) return;

        setUploading(true);
        setUploadProgress(0);

        const newAttachments: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${taskId}/${Date.now()}_${file.name}`;

            try {
                const { error } = await supabase.storage
                    .from('task-attachments')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (error) throw error;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('task-attachments')
                    .getPublicUrl(fileName);

                newAttachments.push(fileName);
                setUploadProgress(Math.round(((i + 1) / files.length) * 100));
            } catch (error: any) {
                console.error('Upload error:', error);
                toast.error(`Failed to upload ${file.name}`);
            }
        }

        onAttachmentsChange([...attachments, ...newAttachments]);
        setUploading(false);
        setUploadProgress(0);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        if (newAttachments.length > 0) {
            toast.success(`${newAttachments.length} file(s) uploaded!`);
        }
    };

    const handleRemoveAttachment = async (filePath: string) => {
        try {
            await supabase.storage
                .from('task-attachments')
                .remove([filePath]);

            onAttachmentsChange(attachments.filter(a => a !== filePath));
            toast.success('File removed');
        } catch (error: any) {
            toast.error('Failed to remove file');
        }
    };

    const handleDownload = async (filePath: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('task-attachments')
                .download(filePath);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('/').pop() || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error('Failed to download file');
        }
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
            return '🖼️';
        } else if (['pdf'].includes(ext || '')) {
            return '📄';
        } else if (['doc', 'docx'].includes(ext || '')) {
            return '📝';
        } else if (['xls', 'xlsx'].includes(ext || '')) {
            return '📊';
        } else if (['zip', 'rar', '7z'].includes(ext || '')) {
            return '📦';
        } else if (['mp4', 'mov', 'avi'].includes(ext || '')) {
            return '🎬';
        } else if (['mp3', 'wav', 'ogg'].includes(ext || '')) {
            return '🎵';
        }
        return '📎';
    };

    const formatFileName = (path: string) => {
        const parts = path.split('/');
        const fullName = parts[parts.length - 1];
        // Remove timestamp prefix
        const nameParts = fullName.split('_');
        return nameParts.slice(1).join('_') || fullName;
    };

    return (
        <div className="space-y-3">
            {/* Upload button */}
            <div className="flex items-center gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    disabled={disabled || uploading}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className={`flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                        {uploading ? `Uploading... ${uploadProgress}%` : 'Attach Files'}
                    </span>
                </label>
                <span className="text-xs text-gray-500">Max 1GB per file</span>
            </div>

            {/* Progress bar */}
            {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            )}

            {/* Attachments list */}
            {attachments.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                        Attachments ({attachments.length})
                    </p>
                    <div className="space-y-1">
                        {attachments.map((filePath) => (
                            <div
                                key={filePath}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-lg">{getFileIcon(filePath)}</span>
                                    <span className="text-sm text-gray-700 truncate">
                                        {formatFileName(filePath)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => handleDownload(filePath)}
                                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAttachment(filePath)}
                                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Remove"
                                        >
                                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
