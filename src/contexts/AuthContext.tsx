import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../lib/database.types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    isRole: (role: UserRole | UserRole[]) => boolean;
    canCreateUser: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// SuperAdmin email
const SUPERADMIN_EMAIL = 'admin@asinify.com';
// Domain for default admin access
const ADMIN_DOMAIN = '@asinify.com';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Determine role based on email
    const determineRole = (email: string): UserRole => {
        if (email === SUPERADMIN_EMAIL) return 'superadmin';
        if (email.endsWith(ADMIN_DOMAIN)) return 'admin';
        return 'normal';
    };

    // Fetch or create profile
    const fetchProfile = async (userId: string, email: string, name?: string) => {
        try {
            // Try to get existing profile
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (existingProfile) {
                setProfile(existingProfile);
                return;
            }

            // Create new profile with role based on email
            const role = determineRole(email);
            const { data: newProfile, error } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email,
                    name: name || email.split('@')[0],
                    role,
                    created_by: null,
                    avatar_url: null
                } as any)
                .select()
                .single();

            if (error) {
                console.error('Error creating profile:', error);
                // Create a local profile if DB insert fails (for first run before tables exist)
                setProfile({
                    id: userId,
                    email,
                    name: name || email.split('@')[0],
                    role,
                    created_by: null,
                    created_at: new Date().toISOString(),
                    avatar_url: null
                });
            } else {
                setProfile(newProfile);
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            // Fallback profile
            setProfile({
                id: userId,
                email,
                name: name || email.split('@')[0],
                role: determineRole(email),
                created_by: null,
                created_at: new Date().toISOString(),
                avatar_url: null
            });
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata?.name);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email || '', session.user.user_metadata?.name);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setProfile(null);
    };

    const isRole = (role: UserRole | UserRole[]) => {
        if (!profile) return false;
        if (Array.isArray(role)) return role.includes(profile.role);
        return profile.role === role;
    };

    const canCreateUser = (targetRole: UserRole) => {
        if (!profile) return false;
        if (profile.role === 'superadmin') return true; // SuperAdmin can create anyone
        if (profile.role === 'admin' && targetRole === 'normal') return true; // Admin can create normal users
        return false;
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            session,
            loading,
            signIn,
            signUp,
            signOut,
            isRole,
            canCreateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
