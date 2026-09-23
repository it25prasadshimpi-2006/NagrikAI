import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  User,
  Mail,
  Lock,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { auth } from '../services/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

interface CitizenAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CitizenAuthModal: React.FC<CitizenAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      // Set custom parameters if needed
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Citizen Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily dismissed popup
        setIsGoogleSubmitting(false);
        return;
      }
      let msg = err.message || 'Google sign-in failed.';
      if (err.code === 'auth/unauthorized-domain') {
        msg = `The domain is not yet on the Firebase authorized domains list for project ${firebaseConfig.projectId}.`;
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Google provider is not enabled in the Firebase Console under Authentication > Sign-in method.';
      }
      setError(msg);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please provide your email and password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          trimmedPassword
        );
        if (name.trim() && userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: name.trim(),
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Citizen Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password. Please check and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account already exists with this email address. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = `Email/Password provider is currently disabled in the Firebase Console for project ${firebaseConfig.projectId}. You can sign in with Google above or enable Email/Password in Firebase Authentication settings.`;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('citizen.pune@nagrikai.org');
    setPassword('citizen123');
    setName('Priya Sharma');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
                  Public Citizen Portal
                </span>
                <h3 className="text-base font-bold text-white">
                  {isSignUp ? 'Create Citizen Account' : 'Citizen Sign In (Optional)'}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-blue-100 mt-2">
            Distinct from Officer Login. Signing in syncs your grievances to "My Complaints".
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Distinct Account Banner */}
          <div className="mb-4 p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 flex items-start space-x-2 text-xs text-blue-900">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> Grievance submission remains 100% open without an account. Signing in lets you view your history across devices.
            </span>
          </div>

          {/* Google Sign-in Button (Primary 1-Click Auth) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full flex items-center justify-center space-x-3 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs transition-all disabled:opacity-60 cursor-pointer"
          >
            {isGoogleSubmitting ? (
              <span className="text-xs text-slate-500">Connecting to Google...</span>
            ) : (
              <>
                {/* Official Google G SVG */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Separator */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400">
              <span className="bg-white px-2">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Authenticating with Firebase...</span>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Citizen Account' : 'Sign In with Email'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={fillDemoAccount}
              className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
            >
              ⚡ Fill Demo Credentials
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
            >
              {isSignUp ? 'Already registered? Sign In' : 'New here? Create Account'}
            </button>
          </div>

          {/* Real Firebase Project Connection Info Badge */}
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Firebase Auth Connected</span>
            </div>
            <code className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
              {firebaseConfig.projectId}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
