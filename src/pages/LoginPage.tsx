import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAppStore();
  const [email, setEmail] = useState('operator@sourceflow.demo');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, 'password123', true);
    setIsLoading(false);
  };

  const handleQuickDemo = async (roleEmail: string) => {
    setEmail(roleEmail);
    setIsLoading(true);
    await login(roleEmail, 'password123', true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between font-sans selection:bg-[#0E7F87] selection:text-white">
      {/* Top Demo Shortcut (Discrete & Functional) */}
      <div className="w-full px-6 py-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => handleQuickDemo('operator@sourceflow.demo')}
          className="text-xs text-stone-400 hover:text-[#0E7F87] transition-colors"
        >
          Demo mode: Operator
        </button>
      </div>

      {/* Main Centered Login Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[390px] text-center">
          
          {/* 1. SOURCEFLOW LOGO — Pure Icon Mark Only (Subtle Pop-In Animation) */}
          <div className="animate-sf-logo flex justify-center mb-4 sm:mb-5">
            <img
              src="/sourceflow_mark.png"
              alt="SourceFlow"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain select-none"
              loading="eager"
            />
          </div>

          {/* 2. REFINED & ELEGANT SOURCEFLOW HEADING (Lighter Weight, Clean Letter Spacing) */}
          <div className="animate-sf-heading">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] leading-tight select-none">
              <span className="text-[#0A2540]">Source</span>
              <span className="text-[#0E7F87]">Flow</span>
            </h1>
          </div>

          {/* Tagline Supporting Message (Clean, Understated, Comfortable Spacing) */}
          <div className="animate-sf-sub mt-2.5 sm:mt-3 mb-8 sm:mb-9">
            <p className="text-xs sm:text-sm text-stone-500 font-normal tracking-normal leading-relaxed max-w-[340px] mx-auto">
              Read smarter. Verify deeper. Act with confidence.
            </p>
          </div>

          {/* 3. LOGIN FORM (Staggered Smooth Appearance) */}
          <div className="animate-sf-form">
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-semibold text-stone-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0E7F87] focus:ring-2 focus:ring-[#0E7F87]/15 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-subtle cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 group"
              >
                <span>{isLoading ? 'Signing in...' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-stone-200 w-full" />
              <span className="bg-white px-3 text-xs text-stone-400 lowercase font-medium">
                or
              </span>
            </div>

            {/* Social SSO — Google */}
            <div>
              <button
                type="button"
                onClick={() => handleQuickDemo('operator@sourceflow.demo')}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-700 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="pt-6 text-center text-xs text-stone-500">
              Don't have an account?{' '}
              <a
                href="#/login"
                onClick={(e) => {
                  e.preventDefault();
                  handleQuickDemo('operator@sourceflow.demo');
                }}
                className="text-[#0E7F87] hover:text-[#0A2540] font-semibold hover:underline transition-colors cursor-pointer"
              >
                Sign up
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full py-4 text-center text-[11px] text-stone-400 font-sans">
        SourceFlow &bull; Grounded Verification Platform
      </footer>
    </div>
  );
};

