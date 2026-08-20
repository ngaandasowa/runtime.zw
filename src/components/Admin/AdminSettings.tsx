import React, { useState } from 'react';
import { Settings, Save, Mail, Shield, Building } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminSettings: React.FC = () => {
  const { settings, updateSettings, showNotification } = useStore();

  const [fromEmail, setFromEmail] = useState(settings.registry_email_from);
  const [toEmail, setToEmail] = useState(settings.registry_email_to);
  const [techName, setTechName] = useState(settings.tech_contact_name);
  const [techEmail, setTechEmail] = useState(settings.tech_contact_email);
  const [techPhone, setTechPhone] = useState(settings.tech_contact_phone);
  const [autoSubmit, setAutoSubmit] = useState(settings.auto_submit_zispa);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      registry_email_from: fromEmail,
      registry_email_to: toEmail,
      tech_contact_name: techName,
      tech_contact_email: techEmail,
      tech_contact_phone: techPhone,
      auto_submit_zispa: autoSubmit,
    });
    showNotification('Platform administrative settings saved.', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
          <Settings className="h-6 w-6 text-[#FF2D20]" />
          <span>Platform &amp; Registrar Settings</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Configure ZISPA submission dispatch emails, technical contact details, and automation flags.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          
          <div>
            <h3 className="text-sm font-bold text-zinc-950 mb-3 flex items-center space-x-2">
              <Mail className="h-4 w-4 text-[#FF2D20]" />
              <span>ZISPA Email Dispatch Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Registrar Dispatch Email (From)</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">ZISPA Registry Inbox (To)</label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h3 className="text-sm font-bold text-zinc-950 mb-3 flex items-center space-x-2">
              <Building className="h-4 w-4 text-[#FF2D20]" />
              <span>Default Technical &amp; Billing Contact (Ngaatec)</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Technical Contact Name</label>
                <input
                  type="text"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Technical Contact Email</label>
                  <input
                    type="email"
                    value={techEmail}
                    onChange={(e) => setTechEmail(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Technical Contact Phone</label>
                  <input
                    type="text"
                    value={techPhone}
                    onChange={(e) => setTechPhone(e.target.value)}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <h3 className="text-sm font-bold text-zinc-950 mb-3 flex items-center space-x-2">
              <Shield className="h-4 w-4 text-[#FF2D20]" />
              <span>Automation Policies</span>
            </h3>

            <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <input
                type="checkbox"
                id="autoSubmit"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[#FF2D20] focus:ring-[#FF2D20]"
              />
              <label htmlFor="autoSubmit" className="text-zinc-700 font-medium">
                Auto-generate and stage ZISPA action templates immediately upon verified order payment
              </label>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 rounded-xl bg-[#FF2D20] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#E0241A] transition shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save System Settings</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
