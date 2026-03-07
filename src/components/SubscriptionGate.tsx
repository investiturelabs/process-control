import { useState } from 'react';
import { useAppStore } from '@/context';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { captureException } from '@/lib/errorTracking';
import { PRICING } from '@/lib/pricing';

const FEATURES = [
  'Unlimited audit sessions',
  'Analytics & trend dashboards',
  'Team management & roles',
  'Reminders & scheduling',
  'Full audit trail',
];

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { subscription, createCheckoutSession, loading, orgRole } = useAppStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [annual, setAnnual] = useState(false);

  // Still loading — don't flash the gate
  if (loading) return null;

  // Has active subscription — pass through
  if (
    subscription &&
    (subscription.status === 'trialing' ||
      subscription.status === 'active')
  ) {
    return <>{children}</>;
  }

  const isAdmin = orgRole === 'admin';
  const proPrice = annual ? PRICING.annual : PRICING.monthly;

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-1">Start your free trial</h1>
          <p className="text-sm text-slate-500 mb-6">
            Get 14 days of full access to AuditFlows Pro. No credit card required to start.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-full p-0.5 mb-6">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                !annual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                annual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Annual
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>

          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            ${proPrice}<span className="text-base font-normal text-slate-400">/user/mo</span>
          </div>
          <p className="text-xs text-slate-400 mb-6">{PRICING.minSeats}-seat minimum{annual ? ' · billed annually' : ''}</p>

          <ul className="text-left space-y-2.5 mb-6">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {isAdmin ? (
            <Button
              className="w-full h-11 text-sm shadow-lg shadow-blue-600/20"
              disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const { url } = await createCheckoutSession(annual);
                  if (!url) { toast.error('Unable to create checkout session.'); return; }
                  window.location.href = url;
                } catch (err) {
                  captureException(err);
                  toast.error('Failed to start checkout. Please try again.');
                } finally {
                  setCheckoutLoading(false);
                }
              }}
            >
              {checkoutLoading ? 'Loading...' : 'Start 14-Day Free Trial'}
              {!checkoutLoading && <ArrowRight size={16} className="ml-1" />}
            </Button>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-600">
                Ask your organization admin to start the free trial.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-4">
            Trial converts to paid after 14 days. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
