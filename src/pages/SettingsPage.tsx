import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/context';
import { Building2, Save, Database, Download, HardDrive, History, CreditCard, Users, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createBackup, downloadBackup } from '@/lib/backup';
import { track } from '@/lib/analytics';
import { captureException } from '@/lib/errorTracking';
import { TeamSection } from '@/pages/TeamPage';
import { PRICING } from '@/lib/pricing';

export function SettingsPage() {
  const { company, setCompany, departments, generateTestData, users, sessions, invitations, orgRole, subscription, createCheckoutSession, createPortalSession } =
    useAppStore();
  const isAdmin = orgRole === 'admin';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSeats = users.filter((u) => u.active !== false).length;
  const [billingLoading, setBillingLoading] = useState(false);

  // Handle checkout success (clear param immediately to prevent double toast)
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
      toast.success('Subscription started! Welcome to AuditFlows Pro.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [generatingData, setGeneratingData] = useState(false);
  const [dataGenerated, setDataGenerated] = useState(false);

  // Fix #41: Company name validation + Fix #34: URL validation
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setCompanyError('Organization name is required.');
      return;
    }
    const trimmedUrl = logoUrl.trim();
    if (trimmedUrl && !trimmedUrl.startsWith('https://')) {
      setCompanyError('Logo URL must start with https://');
      return;
    }
    setCompanyError(null);
    setIsSaving(true);
    try {
      await setCompany({ id: '', name: trimmedName, logoUrl: trimmedUrl || undefined });
    } catch (err) {
      captureException(err);
      toast.error('Failed to save organization settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Only admins can modify settings.
        </p>
        {company && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <p className="text-sm">
                <strong>Organization:</strong> {company.name}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Plan & Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-muted-foreground" />
            Plan & Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">No active plan</p>
                    <p className="text-xs text-muted-foreground">Start a 14-day free trial of Pro</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={billingLoading}
                    onClick={async () => {
                      setBillingLoading(true);
                      try {
                        const { url } = await createCheckoutSession(false);
                        if (!url) { toast.error('Unable to create checkout session.'); return; }
                        window.location.href = url;
                      } catch (err) {
                        captureException(err);
                        toast.error('Failed to start checkout.');
                      } finally {
                        setBillingLoading(false);
                      }
                    }}
                  >
                    {billingLoading ? 'Loading...' : 'Start Free Trial'}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <Link to="/pricing">View plans <ExternalLink size={12} /></Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pro Plan</p>
                    {subscription.status === 'trialing' && subscription.trialEndsAt && (
                      <p className="text-xs text-muted-foreground">
                        Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                      </p>
                    )}
                    {subscription.status === 'active' && (
                      <p className="text-xs text-muted-foreground">
                        Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {subscription.status === 'trialing' && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      Trial
                    </span>
                  )}
                  {subscription.status === 'active' && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                  {subscription.status === 'past_due' && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Past Due
                    </span>
                  )}
                  {subscription.status === 'canceled' && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      Canceled
                    </span>
                  )}
                </div>

                {/* Past due warning */}
                {subscription.status === 'past_due' && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                    <AlertTriangle size={14} className="shrink-0" />
                    Payment failed. Please update your payment method to avoid service interruption.
                  </div>
                )}

                {/* Cancel at period end warning */}
                {subscription.cancelAtPeriodEnd && subscription.status !== 'canceled' && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
                    <AlertTriangle size={14} className="shrink-0" />
                    Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </div>
                )}

                {/* Seats */}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={14} />
                    Active seats
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {activeSeats} / {subscription.quantity} {subscription.quantity === 1 ? 'seat' : 'seats'}
                  </p>
                </div>

                {/* Pricing summary */}
                {(subscription.status === 'active' || subscription.status === 'trialing') && (
                  <div className="rounded-lg border border-slate-200 px-3 py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Billing</span>
                      <span className="font-medium text-slate-900">
                        {subscription.billingInterval === 'year' ? `$${PRICING.annual}/seat/mo (annual)` : `$${PRICING.monthly}/seat/mo`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-1 mt-1">
                      <span className="text-slate-600 font-medium">
                        {subscription.billingInterval === 'year' ? 'Estimated annual' : 'Estimated monthly'}
                      </span>
                      <span className="font-semibold text-slate-900">
                        ${subscription.billingInterval === 'year'
                          ? subscription.quantity * PRICING.annual * 12
                          : subscription.quantity * PRICING.monthly}/{subscription.billingInterval === 'year' ? 'yr' : 'mo'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {subscription.status === 'canceled' ? (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={billingLoading}
                      onClick={async () => {
                        setBillingLoading(true);
                        try {
                          const { url } = await createCheckoutSession(false);
                          if (!url) { toast.error('Unable to create checkout session.'); return; }
                          window.location.href = url;
                        } catch (err) {
                          captureException(err);
                          toast.error('Failed to start checkout.');
                        } finally {
                          setBillingLoading(false);
                        }
                      }}
                    >
                      {billingLoading ? 'Loading...' : 'Resubscribe'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={billingLoading}
                      onClick={async () => {
                        setBillingLoading(true);
                        try {
                          const { url } = await createPortalSession();
                          if (!url) { toast.error('Unable to create checkout session.'); return; }
                          window.location.href = url;
                        } catch (err) {
                          captureException(err);
                          toast.error('Failed to open billing portal.');
                        } finally {
                          setBillingLoading(false);
                        }
                      }}
                    >
                      {billingLoading ? 'Loading...' : subscription.status === 'past_due' ? 'Update Payment Method' : 'Manage Billing'}
                      <ExternalLink size={12} />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeamSection />
        </CardContent>
      </Card>

      {/* Sections below require an active subscription */}
      {subscription && (subscription.status === 'active' || subscription.status === 'trialing') && (
        <>
          {/* Company info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 size={16} className="text-muted-foreground" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany}>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="companyName">Organization name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                {companyError && (
                  <p className="text-sm text-red-600 mt-2" role="alert">{companyError}</p>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <Button type="submit" size="sm" className="gap-1.5" disabled={isSaving}>
                    <Save size={14} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Test data — dev only */}
          {import.meta.env.DEV && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database size={16} className="text-muted-foreground" />
                  Test Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Generate 6 months of sample audit data across all departments to preview charts and analytics.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={generatingData || dataGenerated}
                  onClick={async () => {
                    setGeneratingData(true);
                    try {
                      await generateTestData();
                      setDataGenerated(true);
                    } catch (err) {
                      captureException(err);
                      toast.error('Failed to generate test data.');
                    } finally {
                      setGeneratingData(false);
                    }
                  }}
                >
                  <Database size={14} />
                  {generatingData ? 'Generating...' : dataGenerated ? 'Data generated' : 'Generate test data'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Data backup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive size={16} className="text-muted-foreground" />
                Data Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Export all organization data as JSON. Contains departments, questions, audit history, users, and invitations.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  try {
                    downloadBackup(createBackup({ company, users, departments, sessions, invitations }));
                    track({ name: 'backup_exported', properties: {} });
                    toast.success('Backup exported.');
                  } catch (err) {
                    captureException(err);
                    toast.error('Failed to export backup.');
                  }
                }}
              >
                <Download size={14} />
                Export backup
              </Button>
            </CardContent>
          </Card>

          {/* Activity log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History size={16} className="text-muted-foreground" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                View a log of all administrative changes, role updates, and audit completions.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => navigate('/activity')}
              >
                <History size={14} />
                View activity log
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
