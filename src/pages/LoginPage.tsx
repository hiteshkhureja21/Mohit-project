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
          <div className="animate-sf-logo flex justify-center mb-4">
            <img
              src="/sourceflow_mark.png"
              alt="SourceFlow"
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain select-none"
              loading="eager"
            />
          </div>

          {/* 2. LARGE SOURCEFLOW HEADING (Staggered Slide-Up & Fade-In) */}
          <div className="animate-sf-heading">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight select-none">
              <span className="text-[#0A2540]">Source</span>
              <span className="text-[#0E7F87]">Flow</span>
            </h1>
          </div>

          {/* Tagline Supporting Message (Staggered Fade-In) */}
          <div className="animate-sf-sub mt-2.5 mb-8">
            <p className="text-xs sm:text-sm text-stone-500 font-normal leading-relaxed max-w-[340px] mx-auto">
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

            {/* Social / SSO Buttons */}
            <div className="space-y-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleQuickDemo('operator@sourceflow.demo')}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-700 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Microsoft */}
              <button
                type="button"
                onClick={() => handleQuickDemo('reviewer@sourceflow.demo')}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-700 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span>Continue with Microsoft</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleQuickDemo('approver@sourceflow.demo')}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-700 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 flex-shrink-0 fill-stone-900" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.36-.57.66-.99 1.73-.86 2.76 1.01.08 2.05-.52 2.59-1.27z" />
                </svg>
                <span>Continue with Apple</span>
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

