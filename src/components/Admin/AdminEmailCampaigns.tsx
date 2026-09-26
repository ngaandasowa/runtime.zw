import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CheckCircle2,
  Eye,
  Mail,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  Users,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

import {
  getAuth,
} from 'firebase/auth';

type CampaignCounts = {
  total: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
};

type Campaign = {
  id: string;
  subject: string;
  title: string;
  message: string;
  cta_label?: string | null;
  cta_url?: string | null;
  audience: string;
  target_user_id?: string | null;
  target_email?: string | null;
  target_name?: string | null;
  status:
    | 'draft'
    | 'sending'
    | 'paused'
    | 'completed';
  created_at: string;
  updated_at?: string;
  counts: CampaignCounts;
};

type CustomerOption = {
  id: string;
  name: string;
  email: string;
};

type AudienceMode =
  | 'all_customers'
  | 'single_customer';

const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://api.runtime.co.zw');

const campaignApi =
  async (
    path: string,
    options: RequestInit = {}
  ) => {
    const user =
      getAuth()
        .currentUser;

    if (!user) {
      throw new Error(
        'Administrator authentication is required.'
      );
    }

    const sendRequest =
      async (
        forceRefresh:
          boolean
      ) => {
        const token =
          await user.getIdToken(
            forceRefresh
          );

        return fetch(
          `${API_BASE_URL}/api/email-campaigns${path}`,
          {
            ...options,
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${token}`,
              ...(options.headers ||
                {}),
            },
          }
        );
      };

    let response =
      await sendRequest(false);

    /*
     * Firebase normally refreshes ID tokens automatically,
     * but a browser can temporarily hold a stale token after
     * a deployment/session change. Retry once with a forced
     * refresh before treating the session as invalid.
     */
    if (
      response.status === 401
    ) {
      response =
        await sendRequest(true);
    }

    const body =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      throw new Error(
        body?.message ||
        `Campaign request failed (${response.status}).`
      );
    }

    return body;
  };

const starterCampaigns = {
  thank_you: {
    subject:
      "Thank you for being one of Runtime's first users",
    title:
      "You're part of the beginning",
    message:
      "I just wanted to personally say thank you for being one of the first people to use Runtime.\n\nRuntime is still very new, and we're building and improving it every day. The fact that you chose to sign up and use it this early genuinely means a lot to us.\n\nThere is still a lot we want to build, but I'm glad you're here from the beginning.\n\nThank you for being part of Runtime.\n\nNgaavongwe\nRuntime",
    ctaLabel: '',
    ctaUrl: '',
  },
  runtime_credit: {
    subject:
      'You can now add Runtime Credit',
    title:
      'Runtime Credit is now available',
    message:
      "You can now add funds to your Runtime balance and use them when paying for services on Runtime.\n\nIf your Runtime Credit does not cover the full order, you can apply your available balance and pay the remaining amount using another payment method.\n\nYour balance and Runtime Credit transactions are available from your account.",
    ctaLabel:
      'Open Runtime',
    ctaUrl:
      'https://runtime.co.zw/dashboard',
  },
  runtime_dns: {
    subject:
      'Runtime DNS is now available',
    title:
      'Manage your domain and DNS in one place',
    message:
      "Runtime DNS is now available. You can manage A, AAAA, CNAME, MX, TXT, CAA and SRV records directly from your Runtime dashboard.\n\nRuntime DNS is included free with your domain.\n\nIf your domain already uses other nameservers, nothing has been changed automatically. You can choose to move to Runtime DNS when you are ready.",
    ctaLabel:
      'Open your domains',
    ctaUrl:
      'https://runtime.co.zw/dashboard',
  },
};

export const AdminEmailCampaigns:
  React.FC = () => {
    const [viewMode, setViewMode] = useState<'campaigns' | 'customer_email'>('campaigns');

    const [
      campaigns,
      setCampaigns,
    ] =
      useState<Campaign[]>(
        []
      );

    const [
      loading,
      setLoading,
    ] =
      useState(true);

    const [
      busy,
      setBusy,
    ] =
      useState<string | null>(
        null
      );

    const [
      error,
      setError,
    ] =
      useState<string | null>(
        null
      );

    const [
      notice,
      setNotice,
    ] =
      useState<string | null>(
        null
      );

    const [
      subject,
      setSubject,
    ] =
      useState('');

    const [
      title,
      setTitle,
    ] =
      useState('');

    const [
      message,
      setMessage,
    ] =
      useState('');

    const [
      ctaLabel,
      setCtaLabel,
    ] =
      useState('');

    const [
      ctaUrl,
      setCtaUrl,
    ] =
      useState('');

    const [
      audienceMode,
      setAudienceMode,
    ] = useState<AudienceMode>('all_customers');

    const [
      targetUserId,
      setTargetUserId,
    ] = useState('');

    const [
      customers,
      setCustomers,
    ] = useState<CustomerOption[]>([]);

    const [
      customersLoading,
      setCustomersLoading,
    ] = useState(false);

    const [
      editingId,
      setEditingId,
    ] =
      useState<string | null>(
        null
      );

    const [
      reviewCampaign,
      setReviewCampaign,
    ] =
      useState<Campaign | null>(
        null
      );

    const loadCampaigns =
      useCallback(
        async () => {
          try {
            setError(null);

            const result =
              await campaignApi(
                '/'
              );

            setCampaigns(
              result.campaigns ||
              []
            );
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : 'Unable to load campaigns.'
            );
          } finally {
            setLoading(false);
          }
        },
        []
      );

    const loadCustomers = useCallback(async () => {
      setCustomersLoading(true);
      try {
        const result = await campaignApi('/customers');
        setCustomers(result.customers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load customers.');
      } finally {
        setCustomersLoading(false);
      }
    }, []);

    useEffect(
      () => {
        void loadCampaigns();
        void loadCustomers();
      },
      [loadCampaigns, loadCustomers]
    );

    const totals =
      useMemo(
        () =>
          campaigns.reduce(
            (
              total,
              campaign
            ) => ({
              sent:
                total.sent +
                campaign.counts
                  .sent,
              queued:
                total.queued +
                campaign.counts
                  .queued,
              failed:
                total.failed +
                campaign.counts
                  .failed,
            }),
            {
              sent: 0,
              queued: 0,
              failed: 0,
            }
          ),
        [campaigns]
      );

    const clearForm = () => {
      setSubject('');
      setTitle('');
      setMessage('');
      setCtaLabel('');
      setCtaUrl('');
      setAudienceMode('all_customers');
      setTargetUserId('');
      setEditingId(null);
    };

    const applyStarter = (
      key:
        keyof typeof starterCampaigns
    ) => {
      const starter =
        starterCampaigns[key];

      setSubject(
        starter.subject
      );
      setTitle(
        starter.title
      );
      setMessage(
        starter.message
      );
      setCtaLabel(
        starter.ctaLabel
      );
      setCtaUrl(
        starter.ctaUrl
      );
      setEditingId(null);
    };

    const beginEdit = (
      campaign: Campaign
    ) => {
      if (
        campaign.status !==
        'draft'
      ) {
        return;
      }

      setSubject(
        campaign.subject
      );
      setTitle(
        campaign.title
      );
      setMessage(
        campaign.message
      );
      setCtaLabel(
        campaign.cta_label ||
        ''
      );
      setCtaUrl(
        campaign.cta_url ||
        ''
      );
      setAudienceMode(campaign.audience === 'single_customer' ? 'single_customer' : 'all_customers');
      setTargetUserId(campaign.target_user_id || '');
      setEditingId(
        campaign.id
      );
      setReviewCampaign(null);

      window.scrollTo({
        top: 0,
        left: 0,
        behavior:
          'smooth',
      });
    };

    const saveCampaign =
      async (
        event:
          React.FormEvent
      ) => {
        event.preventDefault();

        setBusy(
          editingId
            ? `edit:${editingId}`
            : 'create'
        );
        setError(null);
        setNotice(null);

        try {
          if (editingId) {
            await campaignApi(
              `/${editingId}`,
              {
                method:
                  'PUT',
                body:
                  JSON.stringify({
                    subject,
                    title,
                    message,
                    ctaLabel,
                    ctaUrl,
                  }),
              }
            );

            setNotice(
              'Draft updated. Review it again before starting the campaign.'
            );
          } else {
            const result =
              await campaignApi(
                '/',
                {
                  method:
                    'POST',
                  body:
                    JSON.stringify({
                      subject,
                      title,
                      message,
                      ctaLabel,
                      ctaUrl,
                      audience: audienceMode,
                      targetUserId: audienceMode === 'single_customer' ? targetUserId : undefined,
                    }),
                }
              );

            setNotice(
              `Campaign created for ${result.recipientCount} customer${result.recipientCount === 1 ? '' : 's'}. Nothing has been sent yet. Review the saved campaign before starting it.`
            );
          }

          clearForm();
          await loadCampaigns();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to save campaign.'
          );
        } finally {
          setBusy(null);
        }
      };

    const deleteCampaign =
      async (
        campaign: Campaign
      ) => {
        if (
          campaign.status !==
          'draft'
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            `Delete this draft campaign?\n\n"${campaign.subject}"\n\nNo emails have been sent.`
          );

        if (!confirmed) {
          return;
        }

        setBusy(
          `${campaign.id}:delete`
        );
        setError(null);
        setNotice(null);

        try {
          await campaignApi(
            `/${campaign.id}`,
            {
              method:
                'DELETE',
            }
          );

          if (
            editingId ===
            campaign.id
          ) {
            clearForm();
          }

          if (
            reviewCampaign?.id ===
            campaign.id
          ) {
            setReviewCampaign(
              null
            );
          }

          setNotice(
            'Draft campaign deleted.'
          );

          await loadCampaigns();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to delete campaign.'
          );
        } finally {
          setBusy(null);
        }
      };

    const action =
      async (
        campaignId: string,
        actionName:
          | 'start'
          | 'pause'
          | 'process'
          | 'retry-failed'
      ) => {
        setBusy(
          `${campaignId}:${actionName}`
        );
        setError(null);
        setNotice(null);

        try {
          const result =
            await campaignApi(
              `/${campaignId}/${actionName}`,
              {
                method:
                  'POST',
                body:
                  actionName ===
                  'process'
                    ? JSON.stringify({
                        batchSize: 5,
                      })
                    : JSON.stringify(
                        {}
                      ),
              }
            );

          if (
            actionName ===
            'start'
          ) {
            setNotice(
              'Campaign started. No email is sent until you choose Send next 5.'
            );
          }

          if (
            actionName ===
            'process'
          ) {
            setNotice(
              result.completed
                ? `Batch sent. Campaign is complete: ${result.counts.sent} sent, ${result.counts.failed} failed.`
                : `Batch processed: ${result.sent} sent, ${result.failed} failed. ${result.counts.queued} still queued.`
            );
          }

          if (
            actionName ===
            'retry-failed'
          ) {
            setNotice(
              `${result.retried || 0} failed recipient${result.retried === 1 ? '' : 's'} returned to the queue.`
            );
          }

          setReviewCampaign(
            null
          );

          await loadCampaigns();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Campaign action failed.'
          );
        } finally {
          setBusy(null);
        }
      };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3120ff]">
              Communication
            </p>

            <h1 className="mt-1 text-2xl font-bold text-zinc-950">
              Email Campaigns
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
              Create, review and send customer updates in controlled batches.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadCampaigns()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex w-fit rounded-xl border border-zinc-200 bg-white p-1">
          <button type="button" onClick={() => setViewMode('campaigns')} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${viewMode === 'campaigns' ? 'bg-[#3120ff] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
            Campaigns
          </button>
          <button type="button" onClick={() => setViewMode('customer_email')} className={`rounded-lg px-4 py-2 text-xs font-bold transition ${viewMode === 'customer_email' ? 'bg-[#3120ff] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}>
            Customer Email
          </button>
        </div>

        {viewMode === 'customer_email' ? (
          <CustomerEmailPanel customers={customers} customersLoading={customersLoading} />
        ) : (
          <>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={CheckCircle2}
            label="Sent"
            value={totals.sent}
          />
          <Stat
            icon={Users}
            label="Queued"
            value={totals.queued}
          />
          <Stat
            icon={XCircle}
            label="Failed"
            value={totals.failed}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
          <form
            onSubmit={
              saveCampaign
            }
            className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  {editingId
                    ? 'Edit draft campaign'
                    : 'New campaign'}
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {editingId
                    ? 'Changes are saved to the existing draft. Its recipient queue stays unchanged.'
                    : 'Recipients are captured from customer accounts when the campaign is created.'}
                </p>
              </div>

              <Mail className="h-5 w-5 text-[#3120ff]" />
            </div>

            {!editingId && (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyStarter(
                      'thank_you'
                    )
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  First users thank-you
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyStarter(
                      'runtime_credit'
                    )
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Runtime Credit update
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyStarter(
                      'runtime_dns'
                    )
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Runtime DNS update
                </button>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <span className="text-xs font-bold text-zinc-700">Recipients</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button type="button" disabled={Boolean(editingId)} onClick={() => { setAudienceMode('all_customers'); setTargetUserId(''); }} className={`rounded-xl border px-4 py-3 text-left text-sm ${audienceMode === 'all_customers' ? 'border-[#3120ff] bg-[#3120ff]/5 text-[#3120ff]' : 'border-zinc-200 text-zinc-700'} disabled:opacity-60`}>
                    <span className="flex items-center gap-2 font-bold"><Users className="h-4 w-4" />All customers</span>
                    <span className="mt-1 block text-xs text-zinc-500">Create one queued recipient for every customer with an email.</span>
                  </button>
                  <button type="button" disabled={Boolean(editingId)} onClick={() => setAudienceMode('single_customer')} className={`rounded-xl border px-4 py-3 text-left text-sm ${audienceMode === 'single_customer' ? 'border-[#3120ff] bg-[#3120ff]/5 text-[#3120ff]' : 'border-zinc-200 text-zinc-700'} disabled:opacity-60`}>
                    <span className="flex items-center gap-2 font-bold"><UserRound className="h-4 w-4" />One customer</span>
                    <span className="mt-1 block text-xs text-zinc-500">Send this campaign only to a selected Runtime customer.</span>
                  </button>
                </div>
                {audienceMode === 'single_customer' && (
                  <label className="mt-3 block">
                    <span className="text-xs font-bold text-zinc-700">Select customer</span>
                    <select required disabled={Boolean(editingId) || customersLoading} value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10">
                      <option value="">{customersLoading ? 'Loading customers...' : 'Choose a customer'}</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name ? `${customer.name} — ${customer.email}` : customer.email}</option>
                      ))}
                    </select>
                  </label>
                )}
                {editingId && <p className="mt-2 text-xs text-zinc-500">Recipients are locked after a draft is created. Create a new draft to use a different audience.</p>}
              </div>

              <Field
                label="Email subject"
                value={subject}
                onChange={
                  setSubject
                }
                placeholder="Thank you for being one of Runtime's first users"
              />

              <Field
                label="Email heading"
                value={title}
                onChange={
                  setTitle
                }
                placeholder="You're part of the beginning"
              />

              <label className="block">
                <span className="text-xs font-bold text-zinc-700">
                  Message
                </span>

                <textarea
                  required
                  rows={9}
                  value={message}
                  onChange={(
                    event
                  ) =>
                    setMessage(
                      event.target
                        .value
                    )
                  }
                  placeholder="Write the customer update..."
                  className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Button label (optional)"
                  value={
                    ctaLabel
                  }
                  onChange={
                    setCtaLabel
                  }
                  placeholder="Open Runtime"
                  required={false}
                />

                <Field
                  label="Button URL (optional)"
                  value={ctaUrl}
                  onChange={
                    setCtaUrl
                  }
                  placeholder="https://runtime.co.zw/dashboard"
                  required={false}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-500">
              {editingId
                ? 'Saving changes does not send the campaign.'
                : 'Creating a campaign does not send anything. It creates a draft and recipient queue first.'}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={
                  busy ===
                    'create' ||
                  busy ===
                    `edit:${editingId}`
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {editingId
                  ? 'Save Draft Changes'
                  : 'Create Campaign'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    clearForm
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Compose preview
            </p>

            <EmailPreview
              title={
                title ||
                'Your email heading'
              }
              message={
                message ||
                'Your message will appear here.'
              }
              ctaLabel={
                ctaLabel
              }
              ctaUrl={ctaUrl}
            />
          </div>
        </div>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-bold text-zinc-950">
              Campaign history
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Drafts can be reviewed, edited or deleted before sending starts.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
              Loading campaigns...
            </div>
          ) : campaigns.length ===
            0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
              No campaigns yet.
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(
                (
                  campaign
                ) => (
                  <CampaignCard
                    key={
                      campaign.id
                    }
                    campaign={
                      campaign
                    }
                    busy={
                      busy
                    }
                    onReview={() =>
                      setReviewCampaign(
                        campaign
                      )
                    }
                    onEdit={() =>
                      beginEdit(
                        campaign
                      )
                    }
                    onDelete={() =>
                      void deleteCampaign(
                        campaign
                      )
                    }
                    onAction={
                      action
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {reviewCampaign && (
          <ReviewModal
            campaign={
              reviewCampaign
            }
            busy={busy}
            onClose={() =>
              setReviewCampaign(
                null
              )
            }
            onEdit={() =>
              beginEdit(
                reviewCampaign
              )
            }
            onDelete={() =>
              void deleteCampaign(
                reviewCampaign
              )
            }
            onStart={() =>
              void action(
                reviewCampaign.id,
                'start'
              )
            }
          />
        )}
          </>
        )}
      </div>
    );
  };

type CustomerDomain = {
  id: string;
  domain_name: string;
  status: string;
  tld?: string;
  processing_type?: string;
};

type DirectEmailHistory = {
  id: string;
  subject: string;
  customer_email: string;
  domains?: string[];
  email_type?: string;
  sent_at: string;
};

const CUSTOMER_EMAIL_TYPES = [
  { value: 'registration_details', label: 'Registration details need attention' },
  { value: 'dns_nameserver', label: 'DNS / nameserver issue' },
  { value: 'domain_information', label: 'Domain information' },
  { value: 'renewal', label: 'Renewal information' },
  { value: 'service_information', label: 'Service information' },
  { value: 'general', label: 'General customer message' },
] as const;

const REGISTRATION_ISSUES = [
  { value: 'owner_name', label: 'Registrant / owner name' },
  { value: 'physical_address', label: 'Physical address' },
  { value: 'postal_address', label: 'Postal address' },
  { value: 'city', label: 'City' },
  { value: 'email', label: 'Owner email address' },
  { value: 'phone', label: 'Phone number' },
  { value: 'other_owner', label: 'Domain is for another person / company' },
  { value: 'documents', label: 'Supporting documents' },
] as const;

const registrationIssueText: Record<string, string> = {
  owner_name: 'Registrant / owner name — enter the actual person or organisation that will own the domain.',
  physical_address: 'Physical address — provide a complete, locatable address including street or stand number, street/road name and suburb where applicable.',
  postal_address: 'Postal address — provide the complete postal/contact address.',
  city: 'City — enter the town or city separately from the street address.',
  email: 'Owner email address — provide a valid email address for the registered owner.',
  phone: 'Phone number — provide a valid contact number for the registered owner.',
  other_owner: 'Owner details — if you are registering for a client or another person/company, provide that owner’s details rather than your own.',
  documents: 'Supporting documents — provide the required owner verification documents through the secure method requested by Runtime.',
};

const CustomerEmailPanel: React.FC<{
  customers: CustomerOption[];
  customersLoading: boolean;
}> = ({ customers, customersLoading }) => {
  const [userId, setUserId] = useState('');
  const [domains, setDomains] = useState<CustomerDomain[]>([]);
  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [emailType, setEmailType] = useState('registration_details');
  const [issues, setIssues] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<DirectEmailHistory[]>([]);

  const customer = customers.find((item) => item.id === userId);
  const selectedDomains = domains.filter((domain) => domainIds.includes(domain.id));
  const domainLabel = selectedDomains.length === 1
    ? selectedDomains[0].domain_name
    : selectedDomains.length > 1
      ? `${selectedDomains.length} domains`
      : 'your domain';

  const loadHistory = useCallback(async (selectedUserId: string) => {
    if (!selectedUserId) { setHistory([]); return; }
    try {
      const result = await campaignApi(`/customer-email/history?userId=${encodeURIComponent(selectedUserId)}`);
      setHistory(result.history || []);
    } catch {
      setHistory([]);
    }
  }, []);

  const loadDomains = useCallback(async (selectedUserId: string) => {
    setDomainIds([]);
    setDomains([]);
    if (!selectedUserId) return;
    setDomainsLoading(true);
    setError(null);
    try {
      const result = await campaignApi(`/customers/${encodeURIComponent(selectedUserId)}/domains`);
      setDomains(result.domains || []);
      await loadHistory(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customer domains.');
    } finally {
      setDomainsLoading(false);
    }
  }, [loadHistory]);

  useEffect(() => { void loadDomains(userId); }, [userId, loadDomains]);

  const buildTemplate = useCallback(() => {
    const names = selectedDomains.map((domain) => domain.domain_name);
    const domainLines = names.length ? `\n\nDomain${names.length === 1 ? '' : 's'}:\n${names.map((name) => `• ${name}`).join('\n')}` : '';
    const note = customNote.trim() ? `\n\nAdditional information:\n${customNote.trim()}` : '';

    if (emailType === 'registration_details') {
      const selectedIssueLines = issues.map((issue) => registrationIssueText[issue]).filter(Boolean);
      setSubject(`Action required: registration details for ${names.length === 1 ? names[0] : names.length > 1 ? 'your domains' : 'your .co.zw domain'}`);
      setTitle('Registration details need attention');
      setMessage(`Before we can complete the registration, some registrant information needs to be updated.${domainLines}${selectedIssueLines.length ? `\n\nPlease update:\n${selectedIssueLines.map((line) => `• ${line}`).join('\n')}` : ''}\n\nThe registrant details must belong to the actual person or organisation that will own the domain. If you are registering the domain for someone else or for a client, please provide their details rather than your own.\n\nOnce the details are updated, we can continue processing the registration.${note}`);
      return;
    }

    if (emailType === 'dns_nameserver') {
      setSubject(`DNS / nameserver attention required${names.length === 1 ? ` for ${names[0]}` : ''}`);
      setTitle('Your domain configuration needs attention');
      setMessage(`We need you to review the DNS or nameserver configuration for the domain${names.length === 1 ? '' : 's'} below.${domainLines}\n\nPlease check the details in your Runtime account or reply to this email if you need help resolving the issue.${note}`);
      return;
    }

    if (emailType === 'renewal') {
      setSubject(`Renewal information${names.length === 1 ? ` for ${names[0]}` : ''}`);
      setTitle('Domain renewal information');
      setMessage(`We are contacting you with information about the renewal of the domain${names.length === 1 ? '' : 's'} below.${domainLines}${note || '\n\nPlease review your Runtime account for the current domain details.'}`);
      return;
    }

    if (emailType === 'domain_information') {
      setSubject(`Information about ${names.length === 1 ? names[0] : 'your domain'}`);
      setTitle('Domain information');
      setMessage(`We are contacting you with an update about the domain${names.length === 1 ? '' : 's'} below.${domainLines}${note}`);
      return;
    }

    if (emailType === 'service_information') {
      setSubject('Information about your Runtime service');
      setTitle('Service information');
      setMessage(`We are contacting you with an update about your Runtime service.${domainLines}${note}`);
      return;
    }

    setSubject(names.length === 1 ? `Regarding ${names[0]}` : 'A message from Runtime');
    setTitle('A message from Runtime');
    setMessage(`${domainLines ? `We are contacting you regarding:${domainLines}` : 'We are contacting you regarding your Runtime account.'}${note}`);
  }, [emailType, issues, selectedDomains, customNote]);

  useEffect(() => { buildTemplate(); }, [buildTemplate]);

  const toggleDomain = (id: string) => {
    setDomainIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const toggleIssue = (value: string) => {
    setIssues((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const sendCustomerEmail = async () => {
    if (!userId || !subject.trim() || !title.trim() || !message.trim()) {
      setError('Choose a customer and complete the email before sending.');
      return;
    }
    const confirmed = window.confirm(`Send this email to ${customer?.email || 'the selected customer'}?\n\nSubject: ${subject}`);
    if (!confirmed) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await campaignApi('/customer-email/send', {
        method: 'POST',
        body: JSON.stringify({ userId, domainIds, emailType, subject, title, message }),
      });
      setNotice(`Email sent to ${result.recipient}.`);
      await loadHistory(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send customer email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950">Customer email</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Select the customer and their domain, choose the reason, review the generated message, then send it directly.</p>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-zinc-700">1. Customer</span>
            <select value={userId} disabled={customersLoading} onChange={(event) => setUserId(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10">
              <option value="">{customersLoading ? 'Loading customers...' : 'Choose a customer'}</option>
              {customers.map((item) => <option key={item.id} value={item.id}>{item.name ? `${item.name} — ${item.email}` : item.email}</option>)}
            </select>
          </label>

          <div>
            <span className="text-xs font-bold text-zinc-700">2. Related domain</span>
            {!userId ? <p className="mt-2 text-xs text-zinc-500">Choose a customer first.</p> : domainsLoading ? <p className="mt-2 text-xs text-zinc-500">Loading domains...</p> : domains.length === 0 ? <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-3 text-xs text-zinc-500">No domains found for this customer. You can still send a general service email.</p> : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {domains.map((domain) => <label key={domain.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${domainIds.includes(domain.id) ? 'border-[#3120ff] bg-[#3120ff]/5' : 'border-zinc-200'}`}>
                  <input type="checkbox" checked={domainIds.includes(domain.id)} onChange={() => toggleDomain(domain.id)} className="mt-0.5 h-4 w-4 accent-[#3120ff]" />
                  <span className="min-w-0"><span className="block truncate text-sm font-bold text-zinc-900">{domain.domain_name}</span><span className="mt-0.5 block text-[11px] capitalize text-zinc-500">{domain.status.replace(/_/g, ' ')}</span></span>
                </label>)}
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-bold text-zinc-700">3. Email type</span>
            <select value={emailType} onChange={(event) => { setEmailType(event.target.value); setIssues([]); setCustomNote(''); }} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10">
              {CUSTOMER_EMAIL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>

          {emailType === 'registration_details' && (
            <div>
              <span className="text-xs font-bold text-zinc-700">4. What needs updating?</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {REGISTRATION_ISSUES.map((issue) => <label key={issue.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${issues.includes(issue.value) ? 'border-[#3120ff] bg-[#3120ff]/5 text-[#3120ff]' : 'border-zinc-200 text-zinc-700'}`}><input type="checkbox" checked={issues.includes(issue.value)} onChange={() => toggleIssue(issue.value)} className="h-4 w-4 accent-[#3120ff]" />{issue.label}</label>)}
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-bold text-zinc-700">{emailType === 'registration_details' ? '5.' : '4.'} Extra information (optional)</span>
            <textarea rows={3} value={customNote} onChange={(event) => setCustomNote(event.target.value)} placeholder="Add only information specific to this customer or domain..." className="mt-2 w-full resize-y rounded-xl border border-zinc-200 px-3.5 py-3 text-sm outline-none focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10" />
          </label>

          <div className="border-t border-zinc-100 pt-5">
            <p className="mb-4 text-xs font-bold text-zinc-700">{emailType === 'registration_details' ? '6.' : '5.'} Review and edit</p>
            <div className="space-y-4">
              <Field label="Email subject" value={subject} onChange={setSubject} />
              <Field label="Email heading" value={title} onChange={setTitle} />
              <label className="block"><span className="text-xs font-bold text-zinc-700">Message</span><textarea rows={11} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-zinc-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10" /></label>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-500">The customer receives only the Runtime message above. Internal registrar correspondence, registrar pricing and internal processing details are not included.</div>

          <button type="button" disabled={sending || !userId || !subject || !title || !message} onClick={() => void sendCustomerEmail()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'Sending...' : 'Send Email'}</button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Email preview</p>
            {customer && <p className="mt-2 text-xs text-zinc-500">To: <span className="font-semibold text-zinc-700">{customer.name || customer.email}</span> · {customer.email}{selectedDomains.length > 0 ? ` · ${domainLabel}` : ''}</p>}
            <EmailPreview title={title || 'Your email heading'} message={message || 'Your message will appear here.'} />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <h3 className="text-sm font-bold text-zinc-950">Customer email history</h3>
            <p className="mt-1 text-xs text-zinc-500">Recent direct emails sent to the selected customer.</p>
            {!userId ? <p className="mt-4 text-xs text-zinc-500">Choose a customer to see history.</p> : history.length === 0 ? <p className="mt-4 text-xs text-zinc-500">No direct customer emails recorded yet.</p> : <div className="mt-4 space-y-2">{history.slice(0, 10).map((item) => <div key={item.id} className="rounded-xl border border-zinc-200 px-3.5 py-3"><p className="text-xs font-bold text-zinc-900">{item.subject}</p><p className="mt-1 text-[11px] text-zinc-500">{item.domains?.length ? `${item.domains.join(', ')} · ` : ''}{new Date(item.sent_at).toLocaleString()}</p></div>)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailPreview:
  React.FC<{
    title: string;
    message: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }> = ({
    title,
    message,
    ctaLabel,
    ctaUrl,
  }) => (
    <div className="mt-4 overflow-hidden border border-zinc-200 bg-white">
      <div className="px-6 pb-4 pt-6">
        <img
          src="https://runtime.co.zw/runtime-logo.png"
          alt="Runtime"
          className="h-auto w-35 max-w-full"
        />
      </div>

      <div className="px-6 pb-7">
        <h3 className="text-xl font-bold text-zinc-950">
          {title}
        </h3>

        <p className="mt-4 text-sm text-zinc-600">
          Hi Customer,
        </p>

        <div className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-600">
          {message}
        </div>

        {ctaLabel &&
          ctaUrl && (
            <div className="mt-6 inline-flex rounded-lg bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white">
              {ctaLabel}
            </div>
          )}
      </div>

      <div className="border-t border-zinc-200 px-6 py-4 text-[11px] leading-5 text-zinc-400">
        Runtime
        <br />
        You received this email because you have a Runtime account.
      </div>
    </div>
  );

const ReviewModal:
  React.FC<{
    campaign: Campaign;
    busy: string | null;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStart: () => void;
  }> = ({
    campaign,
    busy,
    onClose,
    onEdit,
    onDelete,
    onStart,
  }) => {
    const isDraft =
      campaign.status ===
      'draft';

    const isBusy =
      busy?.startsWith(
        `${campaign.id}:`
      ) || false;

    return (
      <div className="fixed inset-0 z-70 overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-[1px]">
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3120ff]">
                Saved campaign review
              </p>

              <h2 className="mt-1 truncate text-lg font-bold text-zinc-950">
                {campaign.subject}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close campaign review"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <ReviewField
                label="Subject"
                value={
                  campaign.subject
                }
              />
              <ReviewField
                label="Audience"
                value={campaign.audience === 'single_customer' ? `${campaign.target_name || campaign.target_email || 'Selected customer'} (${campaign.target_email || '1 recipient'})` : `${campaign.counts.total} customer${campaign.counts.total === 1 ? '' : 's'}`}
              />
              <ReviewField
                label="Status"
                value={
                  campaign.status
                }
              />
              <ReviewField
                label="Queued"
                value={String(
                  campaign.counts
                    .queued
                )}
              />
            </div>

            <div>
              <p className="text-xs font-bold text-zinc-700">
                Exact saved email preview
              </p>

              <EmailPreview
                title={
                  campaign.title
                }
                message={
                  campaign.message
                }
                ctaLabel={
                  campaign.cta_label ||
                  ''
                }
                ctaUrl={
                  campaign.cta_url ||
                  ''
                }
              />
            </div>

            {isDraft && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-600">
                Nothing has been sent. Starting only changes the campaign to Sending. You will still choose when to send the first batch.
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              {isDraft && (
                <>
                  <button
                    type="button"
                    disabled={
                      isBusy
                    }
                    onClick={
                      onDelete
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Draft
                  </button>

                  <button
                    type="button"
                    disabled={
                      isBusy
                    }
                    onClick={
                      onEdit
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Draft
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>

              {isDraft && (
                <button
                  type="button"
                  disabled={
                    isBusy
                  }
                  onClick={
                    onStart
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  Start Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

const ReviewField:
  React.FC<{
    label: string;
    value: string;
  }> = ({
    label,
    value,
  }) => (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 wrap-break-word text-sm font-bold text-zinc-900">
        {value}
      </p>
    </div>
  );

const Field: React.FC<{
  label: string;
  value: string;
  onChange:
    (value: string) =>
      void;
  placeholder?: string;
  required?: boolean;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  required = true,
}) => (
  <label className="block">
    <span className="text-xs font-bold text-zinc-700">
      {label}
    </span>

    <input
      required={required}
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      placeholder={
        placeholder
      }
      className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-[#3120ff] focus:ring-2 focus:ring-[#3120ff]/10"
    />
  </label>
);

const Stat: React.FC<{
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  label: string;
  value: number;
}> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-zinc-500">
          {label}
        </p>

        <p className="text-lg font-bold text-zinc-950">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const CampaignCard:
  React.FC<{
    campaign: Campaign;
    busy: string | null;
    onReview: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAction: (
      campaignId: string,
      action:
        | 'start'
        | 'pause'
        | 'process'
        | 'retry-failed'
    ) => Promise<void>;
  }> = ({
    campaign,
    busy,
    onReview,
    onEdit,
    onDelete,
    onAction,
  }) => {
    const isBusy =
      busy?.startsWith(
        `${campaign.id}:`
      ) || false;

    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-bold text-zinc-950">
                {
                  campaign.subject
                }
              </h3>

              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                {
                  campaign.status
                }
              </span>
            </div>

            <p className="mt-1 text-xs text-zinc-500">
              {
                campaign.counts
                  .sent
              }{' '}
              sent ·{' '}
              {
                campaign.counts
                  .queued
              }{' '}
              queued ·{' '}
              {
                campaign.counts
                  .failed
              }{' '}
              failed ·{' '}
              {
                campaign.counts
                  .total
              }{' '}
              recipients
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={
                isBusy
              }
              onClick={
                onReview
              }
              icon={Eye}
              label="Review"
            />

            {campaign.status ===
              'draft' && (
              <>
                <ActionButton
                  disabled={
                    isBusy
                  }
                  onClick={
                    onEdit
                  }
                  icon={Pencil}
                  label="Edit"
                />

                <ActionButton
                  disabled={
                    isBusy
                  }
                  onClick={
                    onDelete
                  }
                  icon={Trash2}
                  label="Delete"
                  destructive
                />

                <ActionButton
                  disabled={
                    isBusy
                  }
                  onClick={() =>
                    void onAction(
                      campaign.id,
                      'start'
                    )
                  }
                  icon={Play}
                  label="Start"
                  primary
                />
              </>
            )}

            {campaign.status ===
              'paused' && (
              <ActionButton
                disabled={
                  isBusy
                }
                onClick={() =>
                  void onAction(
                    campaign.id,
                    'start'
                  )
                }
                icon={Play}
                label="Resume"
                primary
              />
            )}

            {campaign.status ===
              'sending' && (
              <>
                <ActionButton
                  disabled={
                    isBusy ||
                    campaign.counts
                      .queued ===
                      0
                  }
                  onClick={() =>
                    void onAction(
                      campaign.id,
                      'process'
                    )
                  }
                  icon={Send}
                  label="Send next 5"
                  primary
                />

                <ActionButton
                  disabled={
                    isBusy
                  }
                  onClick={() =>
                    void onAction(
                      campaign.id,
                      'pause'
                    )
                  }
                  icon={Pause}
                  label="Pause"
                />
              </>
            )}

            {campaign.counts
              .failed > 0 && (
              <ActionButton
                disabled={
                  isBusy
                }
                onClick={() =>
                  void onAction(
                    campaign.id,
                    'retry-failed'
                  )
                }
                icon={RotateCcw}
                label="Retry failed"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

const ActionButton:
  React.FC<{
    disabled: boolean;
    onClick: () => void;
    icon:
      React.ComponentType<{
        className?: string;
      }>;
    label: string;
    primary?: boolean;
    destructive?: boolean;
  }> = ({
    disabled,
    onClick,
    icon: Icon,
    label,
    primary = false,
    destructive = false,
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold disabled:opacity-50 ${
        primary
          ? 'bg-[#3120ff] text-white'
          : destructive
            ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
            : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
