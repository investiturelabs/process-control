import { useState, useCallback, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  CheckCircle2,
  X,
  ArrowRight,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { StoreContext } from '@/context';
import { captureException } from '@/lib/errorTracking';
import { PRICING } from '@/lib/pricing';
import logoImg from '@/assets/auditflowslogo.png';

/* ------------------------------------------------------------------ */
/*  Scroll-triggered fade-in                                           */
/* ------------------------------------------------------------------ */
function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);

  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (obsRef.current) {
      obsRef.current.disconnect();
      obsRef.current = null;
    }
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(node);
    obsRef.current = obs;
  }, []);

  useEffect(() => {
    return () => obsRef.current?.disconnect();
  }, []);

  return (
    <div
      ref={callbackRef}
      className={`${visible ? 'animate-in fade-in slide-in-from-bottom-4 duration-700' : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar (matches LandingPage)                                       */
/* ------------------------------------------------------------------ */
function PricingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-b border-slate-200/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logoImg} alt="AuditFlows" className="w-8 h-8 rounded-lg shadow-sm group-hover:shadow transition-shadow" />
          <span className="text-lg font-bold tracking-tight text-slate-800">AuditFlows</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link to="/#features" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors">
            Features
          </Link>
          <Link to="/#how-it-works" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors">
            How It Works
          </Link>
          <Link to="/pricing" className="px-3 py-2 text-sm text-slate-900 font-medium rounded-lg hover:bg-slate-100/80 transition-colors">
            Pricing
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sign-in">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/sign-up">Get Started</Link>
          </Button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/60 px-4 pb-4 space-y-2">
          <Link to="/#features" className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80">
            Features
          </Link>
          <Link to="/#how-it-works" className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80">
            How It Works
          </Link>
          <Link to="/pricing" className="block w-full text-left px-3 py-2 text-sm text-slate-900 font-medium rounded-lg hover:bg-slate-100/80">
            Pricing
          </Link>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" className="flex-1" asChild>
              <Link to="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" className="flex-1" asChild>
              <Link to="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature comparison data                                            */
/* ------------------------------------------------------------------ */
const COMPARISON_FEATURES = [
  { name: '14-day free trial', pro: true, enterprise: true },
  { name: 'Audit sessions', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Team members', pro: 'Per-seat (3 min)', enterprise: 'Unlimited' },
  { name: 'Departments', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Questions', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Analytics & trends', pro: true, enterprise: true },
  { name: 'CSV import/export', pro: true, enterprise: true },
  { name: 'Reminders & scheduling', pro: true, enterprise: true },
  { name: 'Saved answer templates', pro: true, enterprise: true },
  { name: 'Audit trail / activity log', pro: true, enterprise: true },
  { name: 'Org branding (logo)', pro: true, enterprise: true },
  { name: 'SSO (coming soon)', pro: false, enterprise: true },
  { name: 'Priority support', pro: false, enterprise: true },
  { name: 'Custom onboarding', pro: 'Add-on', enterprise: 'Included' },
] as const;

const FAQ = [
  {
    q: 'What happens after the 14-day trial?',
    a: 'Your trial converts to a paid Pro subscription. We\'ll email you a reminder before the trial ends, and you can cancel anytime.',
  },
  {
    q: 'What is the 3-seat minimum?',
    a: 'The Pro plan requires at least 3 seats ($87/mo). This ensures your team gets the collaborative value of AuditFlows from day one.',
  },
  {
    q: 'Can I add more seats later?',
    a: 'Absolutely. Add or remove seats anytime from your team settings. Billing adjusts automatically on your next cycle.',
  },
  {
    q: 'What does the onboarding add-on include?',
    a: 'A dedicated session to configure custom question sets for your departments, import your existing data, and train your team. Priced at $500-$1,000 depending on scope.',
  },
  {
    q: 'How does Enterprise pricing work?',
    a: 'Enterprise pricing is volume-based, typically $18-22/user/mo for 25+ seats. Contact our sales team for a custom quote.',
  },
];

/* ------------------------------------------------------------------ */
/*  Cell renderer for comparison table                                 */
/* ------------------------------------------------------------------ */
function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle2 size={18} className="text-blue-600 mx-auto" />;
  if (value === false) return <X size={18} className="text-slate-300 mx-auto" />;
  return <span className="text-sm text-slate-700 font-medium">{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Pricing Page                                                       */
/* ------------------------------------------------------------------ */
function ProCTA({ annual, className = '' }: { annual: boolean; className?: string }) {
  const { isSignedIn } = useAuth();
  const store = useContext(StoreContext);
  const [loading, setLoading] = useState(false);

  // Signed out: link to sign-up
  if (!isSignedIn || !store) {
    return (
      <Button className={className} asChild>
        <Link to="/sign-up">
          Start Free Trial <ArrowRight size={18} />
        </Link>
      </Button>
    );
  }

  const { subscription, createCheckoutSession, createPortalSession } = store;

  // Already subscribed (active/trialing)
  if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
    return (
      <Button
        variant="outline"
        className={className}
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const { url } = await createPortalSession();
            if (!url) { toast.error('Unable to create checkout session.'); return; }
            window.location.href = url;
          } catch (err) {
            captureException(err);
            toast.error('Failed to open billing portal.');
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? 'Loading...' : 'Manage Billing'}
      </Button>
    );
  }

  // Non-admin: show disabled state
  if (store.orgRole !== 'admin') {
    return (
      <Button className={className} variant="outline" disabled>
        Ask your admin to subscribe
      </Button>
    );
  }

  // No subscription or canceled: start checkout
  return (
    <Button
      className={className}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const { url } = await createCheckoutSession(annual);
          if (!url) { toast.error('Unable to create checkout session.'); return; }
          window.location.href = url;
        } catch (err) {
          captureException(err);
          toast.error('Failed to start checkout.');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? 'Loading...' : 'Start Free Trial'} {!loading && <ArrowRight size={18} />}
    </Button>
  );
}

export function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const proPrice = annual ? PRICING.annual : PRICING.monthly;
  const proMinimum = proPrice * PRICING.minSeats;

  return (
    <div className="min-h-screen bg-white">
      <PricingNavbar />

      {/* Hero */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)]" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Simple, transparent{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              pricing
            </span>
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl mx-auto mb-10">
            Start with a 14-day free trial. No credit card required. Scale as your team grows.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !annual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Annual
              <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Pro card */}
              <div className="relative bg-white rounded-2xl border-2 border-blue-600 p-8 shadow-lg shadow-blue-600/10 ring-1 ring-blue-600">
                <div className="absolute -top-3.5 left-8">
                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-sm px-4 py-1">
                    Recommended
                  </Badge>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-1">Pro</h3>
                <p className="text-sm text-slate-500 mb-6">Everything you need to run better audits</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-slate-900">${proPrice}</span>
                    <span className="text-slate-500 text-sm">/user/mo</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    3-seat minimum — ${proMinimum}/mo base
                    {annual && <span className="text-emerald-600 font-medium ml-2">billed annually</span>}
                  </p>
                </div>

                <ProCTA annual={annual} className="w-full h-12 text-base shadow-lg shadow-blue-600/25 mb-8" />

                <ul className="space-y-3">
                  {[
                    'Unlimited audit sessions',
                    'Analytics & trend dashboards',
                    'CSV import/export',
                    'Reminders & scheduling',
                    'Saved answer templates',
                    'Audit trail / activity log',
                    'Team management',
                    'Custom departments & questions',
                    'Org branding (logo)',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enterprise card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Enterprise</h3>
                <p className="text-sm text-slate-500 mb-6">For large teams with advanced needs</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-slate-900">Custom</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Volume pricing for 25+ seats
                  </p>
                </div>

                <Button variant="outline" className="w-full h-12 text-base mb-8" asChild>
                  <a href="mailto:sales@auditflows.com">
                    Contact Sales <ArrowRight size={18} />
                  </a>
                </Button>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Everything in Pro, plus:
                </p>
                <ul className="space-y-3">
                  {[
                    'Unlimited seats',
                    'SSO / SAML (coming soon)',
                    'Dedicated onboarding included',
                    'Priority support',
                    'Custom audit template development',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-center mb-10">
              Feature comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 pr-4 text-sm font-semibold text-slate-500 w-1/2">Feature</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900 w-1/4">Pro</th>
                    <th className="text-center py-3 pl-4 text-sm font-semibold text-slate-900 w-1/4">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((feature) => (
                    <tr key={feature.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-3.5 pr-4 text-sm text-slate-600">{feature.name}</td>
                      <td className="py-3.5 px-4 text-center"><FeatureCell value={feature.pro} /></td>
                      <td className="py-3.5 pl-4 text-center"><FeatureCell value={feature.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20 sm:pb-28 bg-slate-50/50 border-t border-slate-200/60 pt-20 sm:pt-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-center mb-10">
              Frequently asked questions
            </h2>

            <div className="space-y-6">
              {FAQ.map((item) => (
                <div key={item.q} className="bg-white rounded-xl border border-slate-200/80 p-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">{item.q}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-white/5" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Start your 14-day free trial
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            No credit card required. Set up your team and run your first audit in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ProCTA annual={annual} className="bg-white text-blue-700 hover:bg-blue-50 text-base px-8 h-12 shadow-lg shadow-blue-900/20" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src={logoImg} alt="AuditFlows" className="w-7 h-7 rounded-lg" />
              <span className="text-sm font-semibold text-slate-700">AuditFlows</span>
            </div>
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} AuditFlows. An{' '}
              <span className="text-slate-500 font-medium">Investiture Labs</span> product.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
