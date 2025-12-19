import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Play notification sound using Web Audio API (no file needed)
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create a pleasant notification chime (two-tone)
        const playTone = (freq: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);

            oscillator.start(audioContext.currentTime + startTime);
            oscillator.stop(audioContext.currentTime + startTime + duration);
        };

        // Play two ascending tones (like a notification chime)
        playTone(880, 0, 0.15);      // A5
        playTone(1047, 0.12, 0.2);   // C6
        playTone(1319, 0.25, 0.25);  // E6

    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

// Request notification permission
async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

// Show browser push notification using Service Worker
async function showBrowserNotification(title: string, body: string) {
    console.log('Attempting to show notification...');
    console.log('Notification permission:', Notification.permission);

    if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
        }
    }

    if (Notification.permission !== 'granted') {
        console.log('Notifications are blocked');
        return;
    }

    // Try using Service Worker first (more reliable)
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                tag: 'task-' + Date.now(),
                requireInteraction: false,
            });
            console.log('Notification shown via Service Worker');
            return;
        } catch (error) {
            console.log('Service Worker notification failed, using fallback:', error);
        }
    }

    // Fallback to direct Notification API
    try {
        const notification = new Notification(title, {
            body,
            tag: 'task-' + Date.now(),
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 8000);
        console.log('Notification shown via Notification API');
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

// Register Service Worker on module load
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.log('Service Worker registration failed:', err));
}

// Hook to listen for new task assignments and play notification sound
export function useTaskAssignmentNotification() {
    const { user } = useAuth();
    const hasRequestedPermission = useRef(false);

    // Request notification permission on mount
    const requestPermission = useCallback(async () => {
        if (!hasRequestedPermission.current) {
            hasRequestedPermission.current = true;
            const granted = await requestNotificationPermission();
            if (granted) {
                console.log('Notification permission granted');
            }
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        // Request permission when user first interacts with page
        const handleInteraction = () => {
            requestPermission();
            document.removeEventListener('click', handleInteraction);
        };
        document.addEventListener('click', handleInteraction);

        // Subscribe to new task assignments - listen to all INSERTs, filter client-side
        const channel = supabase
            .channel('task-assignments')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tasks',
                },
                (payload) => {
                    const task = payload.new as { title: string; assigned_to: string };

                    // Only notify if assigned to current user
                    if (task.assigned_to !== user.id) return;

                    console.log('Task assigned to you:', task.title);

                    // Play notification sound
                    playNotificationSound();

                    // Show browser push notification (works in background!)
                    showBrowserNotification(
                        '📋 New Task Assigned',
                        `"${task.title}"`
                    );

                    // Show in-app toast notification
                    toast.success(`New task assigned: "${task.title}"`, {
                        duration: 5000,
                        icon: '📋',
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tasks',
                },
                (payload) => {
                    const newData = payload.new as { assigned_to: string; title: string };
                    const oldData = payload.old as { assigned_to: string };

                    // Check if task was newly assigned to current user
                    if (newData.assigned_to === user.id && oldData.assigned_to !== user.id) {
                        // Play notification sound
                        playNotificationSound();

                        // Show browser push notification (works in background!)
                        showBrowserNotification(
                            '📋 Task Assigned to You',
                            `"${newData.title}"`
                        );

                        // Show in-app toast notification
                        toast.success(`Task assigned to you: "${newData.title}"`, {
                            duration: 5000,
                            icon: '📋',
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        return () => {
            document.removeEventListener('click', handleInteraction);
            supabase.removeChannel(channel);
        };
    }, [user, requestPermission]);
}

// Export for manual use
export { playNotificationSound, showBrowserNotification, requestNotificationPermission };
