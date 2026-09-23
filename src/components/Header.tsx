import React from 'react';
import { ShieldAlert, User, BarChart3, Sparkles, Building2, Radio, ShieldCheck, LogOut, UserCheck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentView: 'citizen' | 'policymaker';
  onViewChange: (view: 'citizen' | 'policymaker') => void;
  totalComplaints: number;
  criticalCount: number;
  isAdminAuthenticated?: boolean;
  onLogout?: () => void;
  citizenUser?: FirebaseUser | null;
  onOpenCitizenAuth?: () => void;
  onCitizenLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  totalComplaints,
  criticalCount,
  isAdminAuthenticated = false,
  onLogout,
  citizenUser,
  onOpenCitizenAuth,
  onCitizenLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-700 via-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-white/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                  Nagrik<span className="text-blue-600">AI</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse mr-1.5"></span>
                  DPI Track
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Citizen Infrastructure Feedback &amp; Prioritization Platform
              </p>
            </div>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => onViewChange('citizen')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentView === 'citizen'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Citizen Portal</span>
            </button>
            <button
              onClick={() => onViewChange('policymaker')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentView === 'policymaker'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Policymaker Dashboard</span>
              {isAdminAuthenticated ? (
                criticalCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      currentView === 'policymaker'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={`${criticalCount} Critical Hotspots`}
                  >
                    {criticalCount}
                  </span>
                )
              ) : (
                /* When NOT authenticated: small neutral grey dot with no text or digit */
                <span
                  className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 shrink-0 inline-block"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {/* Right Status / Officer Badges */}
          <div className="hidden md:flex items-center space-x-3">
            {isAdminAuthenticated ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 shadow-xs">
                  <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>{totalComplaints} Active Reports</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/90 text-xs font-semibold text-slate-700 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-500 hidden lg:inline">Logged in as:</span>
                  <span className="font-bold text-blue-900">Municipal Commissioner, Ward 7</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50/80 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                    title="Sign Out of Municipal Dashboard"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-600" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Optional Citizen Account Badge / Sign In Link */}
                {citizenUser ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/90 text-xs font-semibold text-slate-700 shadow-xs">
                      <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-slate-500 hidden lg:inline">Citizen Account:</span>
                      <span className="font-bold text-indigo-900 truncate max-w-[130px]">
                        {citizenUser.displayName || citizenUser.email?.split('@')[0]}
                      </span>
                    </div>
                    {onCitizenLogout && (
                      <button
                        onClick={onCitizenLogout}
                        className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                        title="Sign Out of Citizen Account"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Logout</span>
                      </button>
                    )}
                  </div>
                ) : (
                  onOpenCitizenAuth && (
                    <button
                      onClick={onOpenCitizenAuth}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50/80 border border-slate-200 transition-colors cursor-pointer"
                      title="Sign in or register citizen account (Optional)"
                    >
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Citizen Sign In (Optional)</span>
                    </button>
                  )
                )}

                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs text-slate-500 bg-slate-50 border border-slate-200" title="Municipal Grievance Ingestion Live">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <span>Portal Live</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile / Small screen user bar when authenticated */}
        {isAdminAuthenticated && (
          <div className="md:hidden py-2 px-1 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-slate-700 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate font-semibold">Municipal Commissioner, Ward 7</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="shrink-0 inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}

        {/* Mobile / Small screen citizen account bar when logged in */}
        {!isAdminAuthenticated && citizenUser && (
          <div className="md:hidden py-2 px-1 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-slate-700 truncate">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate font-semibold text-indigo-900">
                Citizen: {citizenUser.displayName || citizenUser.email}
              </span>
            </div>
            {onCitizenLogout && (
              <button
                onClick={onCitizenLogout}
                className="shrink-0 inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
