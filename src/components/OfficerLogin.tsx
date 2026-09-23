import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Building2,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';

interface OfficerLoginProps {
  onLoginSuccess: (officerEmail: string) => void;
  onCancelToCitizen?: () => void;
}

export const OfficerLogin: React.FC<OfficerLoginProps> = ({
  onLoginSuccess,
  onCancelToCitizen,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validation: Require non-empty fields
    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Please provide both official email address and password.');
      return;
    }

    // Optional email format check warning (forgiving for demo flexibility)
    if (!trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address (e.g. admin@nagrikai.gov.in).');
      return;
    }

    setIsSubmitting(true);
    // Quick realistic authentication delay
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(trimmedEmail);
    }, 400);
  };

  const handleQuickFill = () => {
    setEmail('admin@nagrikai.gov.in');
    setPassword('demo123');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Officer Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header decorative accent */}
          <div className="bg-linear-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 sm:p-7 text-white text-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-300" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Municipal Officer Login
              </h2>
              <p className="text-xs text-blue-200 mt-1.5 max-w-xs font-medium">
                Restricted access for verified government officials
              </p>

              <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-700/60 border border-blue-400/30 text-[11px] font-semibold text-blue-100">
                <Building2 className="w-3 h-3 text-blue-300" />
                <span>Urban Local Bodies &amp; Municipal Corporation</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="commissioner@ward7.gov.in"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Authenticating Officer...</span>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Helper Box */}
            <div className="pt-4 border-t border-slate-200">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>Demo Credentials</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Auto-fill</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200 flex flex-col space-y-0.5">
                  <div>
                    <span className="text-slate-400">Email: </span>
                    <span className="font-semibold text-slate-800">admin@nagrikai.gov.in</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Pass: </span>
                    <span className="font-semibold text-slate-800">demo123</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Note: For demo convenience, any non-empty official credentials are also accepted.
                </p>
              </div>
            </div>

            {/* Link back to citizen portal if needed */}
            {onCancelToCitizen && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onCancelToCitizen}
                  className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors"
                >
                  ← Return to Public Citizen Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
