import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CheckCircle2,
  Mail,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Users,
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
  status:
    | 'draft'
    | 'sending'
    | 'paused'
    | 'completed';
  created_at: string;
  counts: CampaignCounts;
};

const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : '');

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

    const token =
      await user
        .getIdToken();

    const response =
      await fetch(
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
      'Thank you for being here early',
    message:
      "You're among the first people to use Runtime, and we wanted to say thank you.\n\nWe're still building, improving and adding more to the platform. Your early support means a lot to us.\n\nRuntime started with a simple goal: make domains and digital infrastructure easier to access and manage.\n\nThank you for being part of the beginning.",
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
};

export const AdminEmailCampaigns:
  React.FC = () => {
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

    useEffect(
      () => {
        void loadCampaigns();
      },
      [loadCampaigns]
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
    };

    const createCampaign =
      async (
        event:
          React.FormEvent
      ) => {
        event.preventDefault();

        setBusy('create');
        setError(null);
        setNotice(null);

        try {
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
                  }),
              }
            );

          setSubject('');
          setTitle('');
          setMessage('');
          setCtaLabel('');
          setCtaUrl('');

          setNotice(
            `Campaign created for ${result.recipientCount} customer${result.recipientCount === 1 ? '' : 's'}. Review it, then start sending.`
          );

          await loadCampaigns();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to create campaign.'
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
              Send product updates and customer messages from Runtime without sending the whole database at once.
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
              createCampaign
            }
            className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  New campaign
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Recipients are captured from customer accounts when the campaign is created.
                </p>
              </div>

              <Mail className="h-5 w-5 text-[#3120ff]" />
            </div>

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
            </div>

            <div className="mt-5 space-y-4">
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
                placeholder="Thank you for being here early"
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
              Creating a campaign does not send anything. It only builds the recipient queue. You start and process the campaign separately.
            </div>

            <button
              type="submit"
              disabled={
                busy ===
                'create'
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {busy ===
              'create'
                ? 'Creating...'
                : 'Create Campaign'}
            </button>
          </form>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Preview
            </p>

            <div className="mt-4 overflow-hidden border border-zinc-200 bg-white">
              <div className="px-6 pb-4 pt-6 text-xl font-bold text-[#3120ff]">
                Runtime
              </div>

              <div className="px-6 pb-7">
                <h3 className="text-xl font-bold text-zinc-950">
                  {title ||
                    'Your email heading'}
                </h3>

                <p className="mt-4 text-sm text-zinc-600">
                  Hi Customer,
                </p>

                <div className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-600">
                  {message ||
                    'Your message will appear here.'}
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
          </div>
        </div>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-bold text-zinc-950">
              Campaign history
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Process sends a maximum of 5 queued customers per click.
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
                    onAction={
                      action
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    );
  };

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
            {(campaign.status ===
              'draft' ||
              campaign.status ===
                'paused') && (
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
  }> = ({
    disabled,
    onClick,
    icon: Icon,
    label,
    primary = false,
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold disabled:opacity-50 ${
        primary
          ? 'bg-[#3120ff] text-white'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
