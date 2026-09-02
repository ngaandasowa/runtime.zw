import React, {
  useEffect,
  useState,
} from 'react';
import { User, Shield, Lock, Key, CheckCircle2, Phone, Mail, Building, Bell } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const DashboardAccount: React.FC = () => {
  const {
    currentUser,
    updateCurrentUserProfile,
    resendVerificationEmail,
    changePassword,
    showNotification,
  } = useStore();
  const [name, setName] = useState(currentUser?.name || '');
  const [organisation, setOrganisation] = useState(currentUser?.organisation || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  useEffect(() => {
  if (!currentUser) {
    return;
  }

  setName(
    currentUser.name || ''
  );

  setOrganisation(
    currentUser.organisation || ''
  );

  setPhone(
    currentUser.phone || ''
  );
}, [currentUser]);

 const handleSaveProfile = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  try {
    await updateCurrentUserProfile({
      name,
      organisation,
      phone,
    });
  } catch (error) {
    console.error(
      'Failed to update profile:',
      error
    );

    showNotification(
      'Unable to update profile.',
      'error'
    );
  }
};

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!newPassword) {
      return;
    }

    try {
      setPasswordLoading(true);

      await changePassword(
        currentPassword,
        newPassword
      );

      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : 'Unable to update your password.',
        'error'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendVerification =
    async () => {
      try {
        setVerificationLoading(true);

        await resendVerificationEmail();
      } catch (error) {
        showNotification(
          error instanceof Error
            ? error.message
            : 'Unable to send a verification email.',
          'error'
        );
      } finally {
        setVerificationLoading(false);
      }
    };

  return (
    <div className="space-y-6 max-w-4xl">
      
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
          <User className="h-6 w-6 text-[#3120ff]" />
          <span>Account Settings &amp; Security</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your verified customer profile, organisation details, and security policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-zinc-950 mb-4 flex items-center space-x-2">
            <User className="h-4 w-4 text-[#3120ff]" />
            <span>Profile Details</span>
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">
                Email Address
              </label>

              <div className="flex items-center space-x-2">
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-100 p-2.5 text-zinc-500 cursor-not-allowed font-mono text-xs"
                />

                {currentUser?.email_verified_at ? (
                  <span
                    title="Email verified"
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-700">
                    Unverified
                  </span>
                )}
              </div>

              {!currentUser?.email_verified_at && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] leading-5 text-amber-800">
                    You can keep using Runtime, but verify this email to confirm that you own it.
                  </p>

                  <button
                    type="button"
                    disabled={verificationLoading}
                    onClick={handleResendVerification}
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-bold text-amber-800 disabled:opacity-50"
                  >
                    {verificationLoading
                      ? 'Sending...'
                      : 'Resend'}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Organisation / Company</label>
              <input
                type="text"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="e.g. Acme Zimbabwe (Pvt) Ltd"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Phone Number (domain service Contact)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263 77 123 4567"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[#3120ff] px-4 py-2 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-xs"
            >
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-zinc-950 mb-4 flex items-center space-x-2">
              <Lock className="h-4 w-4 text-[#3120ff]" />
              <span>Password &amp; Authentication</span>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {passwordLoading
                  ? 'Updating...'
                  : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="border-t border-zinc-200 pt-4 text-xs text-zinc-500">
            <div className="flex items-center justify-between py-1">
              <span>Account Role:</span>
              <span className="text-[#3120ff] uppercase font-bold">{currentUser?.role}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Member Since:</span>
              <span className="text-zinc-800 font-medium">{new Date(currentUser?.created_at || '').toLocaleDateString()}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
