import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import RotatingText from '../components/RotatingText';

interface LoginPageProps {
    onSuccess?: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
    const { signIn, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
        name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(form.email, form.password);
                toast.success('Welcome back!');
            } else {
                await signUp(form.email, form.password, form.name);
                toast.success('Account created! Please check your email to verify.');
            }
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans selection:bg-orange-100 selection:text-orange-900">
            {/* Left Panel - Branding & Rotating Text */}
            <div className="hidden lg:flex lg:w-[45%] bg-zinc-50 flex-col justify-center p-12 relative border-r border-zinc-100">

                <div className="max-w-md mx-auto w-full space-y-12">
                    {/* Logo Area */}
                    <div>
                        <img
                            src="/Logo.avif"
                            alt="Logo"
                            className="w-60 h-auto drop-shadow-sm mb-4"
                        />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10">
                        <h1 className="text-5xl font-bold text-zinc-900 leading-tight tracking-tight mb-8">
                            Hello, <br />
                            <span className="text-orange-600 inline-block mt-2">
                                <RotatingText
                                    texts={['Aaunu vayo?', 'Designers.', 'Developers.', 'Everyone.']}
                                    mainClassName="bg-orange-600 text-white px-3 py-0 rounded-lg overflow-hidden"
                                    staggerFrom={"last"}
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "-120%" }}
                                    staggerDuration={0.025}
                                    splitLevelClassName="overflow-hidden pb-1"
                                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                    rotationInterval={2500}
                                />
                            </span>
                        </h1>

                        <p className="text-zinc-500 text-lg leading-relaxed">
                            Simplify your task management. Collaborate with your team. Get things done with style.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="text-sm text-zinc-400 font-medium">
                        © 2024
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 bg-white">
                <div className="w-full max-w-sm mx-auto">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-12">
                        <img
                            src="/Logo.avif"
                            alt="Logo"
                            className="w-16 h-auto"
                        />
                    </div>

                    <div className="mb-10">
                        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
                            {isLogin ? 'Sign in' : 'Create account'}
                        </h2>
                        <p className="mt-2 text-zinc-500 text-sm">
                            {isLogin ? 'Enter your details to access your workspace.' : 'Get started with your free account today.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none text-sm"
                                    placeholder="Enter your name"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none text-sm"
                                placeholder="name@company.com"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-zinc-700">Password</label>
                                {isLogin && (
                                    <button type="button" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none text-sm"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                isLogin ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
                        <p className="text-sm text-zinc-500">
                            {isLogin ? "Don't have an account?" : 'Already have an account?'}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-1 font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                            >
                                {isLogin ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
