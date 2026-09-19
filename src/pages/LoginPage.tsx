import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { SourceFlowLogo } from '../components/common/SourceFlowLogo';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAppStore();
  const [email, setEmail] = useState('operator@sourceflow.demo');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password, rememberMe);
    setIsLoading(false);
  };

  const handleQuickDemo = async (roleEmail: string) => {
    setEmail(roleEmail);
    setIsLoading(true);
    await login(roleEmail, 'password123', true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Simple Header */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <SourceFlowLogo variant="mark" size="md" />
        <div className="flex items-center gap-4 text-xs">
          <span className="text-stone-500 hidden sm:inline">Institutional Verification Instance</span>
          <button
            type="button"
            onClick={() => handleQuickDemo('operator@sourceflow.demo')}
            className="text-[#0E7F87] hover:text-[#0A2540] font-medium transition-colors"
          >
            Quick Demo Fill
          </button>
        </div>
      </header>

      {/* Main Centered Login Section (Inspired by Reference 2) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] space-y-7">
          
          {/* Header Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-sans">
              Sign in to SourceFlow
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Work Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-700">
                Work email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0E7F87] focus:ring-1 focus:ring-[#0E7F87] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-stone-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <a
                  href="#/login"
                  className="text-[11px] text-[#0E7F87] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0E7F87] focus:ring-1 focus:ring-[#0E7F87] transition-colors"
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-[#0E7F87] focus:ring-[#0E7F87] accent-[#0E7F87]"
              />
              <label htmlFor="rememberMe" className="text-xs text-stone-600 cursor-pointer select-none">
                Remember this device for 30 days
              </label>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-subtle cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Verifying credentials...' : 'Sign in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Clean Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-white px-3 text-xs text-stone-400 uppercase tracking-wider font-mono">
              or
            </span>
          </div>

          {/* Social / Institutional SSO (Blinq Reference Pattern) */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('operator@sourceflow.demo')}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('reviewer@sourceflow.demo')}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Continue with Microsoft</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('approver@sourceflow.demo')}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#0E7F87]" />
              <span>Institutional Single Sign-On (SAML / Okta)</span>
            </button>
          </div>

          {/* Security Assurance */}
          <div className="pt-2 text-center text-[11px] text-stone-400 flex items-center justify-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7F87]" />
            <span>End-to-end grounded verification & tamper-evident logs</span>
          </div>

        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full py-4 text-center text-xs text-stone-400 border-t border-stone-100 font-sans">
        SourceFlow &bull; Single Source of Truth
      </footer>
    </div>
  );
};
