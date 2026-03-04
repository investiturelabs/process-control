import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Trophy,
  BarChart3,
  Building2,
  Users,
  Bell,
  History,
  Download,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Menu,
  X,
  Star,
  Smartphone,
  TrendingUp,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logoImg from '@/assets/auditflowslogo.png';

/* ------------------------------------------------------------------ */
/*  Scroll-triggered fade-in hook                                     */
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
/*  Data                                                              */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { icon: ClipboardCheck, title: 'Flashcard-Style Audits', desc: 'Swipe through questions one at a time. No long forms, no confusion — just focus.', tag: 'Core' },
  { icon: Trophy, title: 'Instant Scoring & Grades', desc: 'See letter grades and percentages the moment an audit is complete. No waiting.', tag: 'Core' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Trend lines, department comparisons, and radar charts reveal what matters.', tag: 'Insights' },
  { icon: Building2, title: 'Department Management', desc: 'Organize audits by department with custom questions and templates.', tag: 'Setup' },
  { icon: Users, title: 'Team Collaboration', desc: 'Invite team members, assign roles, and track who audited what.', tag: 'Team' },
  { icon: Bell, title: 'Recurring Reminders', desc: 'Schedule weekly or monthly audit reminders so nothing falls through the cracks.', tag: 'Automation' },
  { icon: History, title: 'Complete Audit Trail', desc: 'Every answer, every score, every session — timestamped and searchable.', tag: 'Compliance' },
  { icon: Download, title: 'CSV Import & Export', desc: 'Bulk-import questions or export results for offline analysis and reporting.', tag: 'Data' },
] as const;

const STEPS = [
  { num: '01', title: 'Choose Department', desc: 'Pick from 9 pre-built templates or create your own audit structure.', icon: Building2 },
  { num: '02', title: 'Complete Audit', desc: 'Swipe through flashcard questions — works beautifully on mobile.', icon: ClipboardCheck },
  { num: '03', title: 'Review Results', desc: 'Get instant scores, letter grades, and actionable trend data.', icon: Trophy },
] as const;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

/** Floating nav with glass effect */
function Navbar() {
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
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logoImg} alt="AuditFlows" className="w-8 h-8 rounded-lg shadow-sm group-hover:shadow transition-shadow" />
          <span className="text-lg font-bold tracking-tight text-slate-800">AuditFlows</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors"
          >
            How It Works
          </button>
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors"
          >
            Pricing
          </button>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sign-in">Sign In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/sign-up">Get Started</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/60 px-4 pb-4 space-y-2">
          <button
            onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); }}
            className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80"
          >
            Features
          </button>
          <button
            onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); }}
            className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80"
          >
            How It Works
          </button>
          <button
            onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); }}
            className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80"
          >
            Pricing
          </button>
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

/** Tailwind-built product mockup for the hero */
function HeroMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-blue-400/20 rounded-3xl blur-2xl" />

      {/* Main dashboard card */}
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-blue-900/10 border border-slate-200/80 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-medium text-slate-400 tracking-wide">AuditFlows Dashboard</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Score cards row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Overall', score: '87%', grade: 'B+', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
              { label: 'Front End', score: '94%', grade: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
              { label: 'Bakery', score: '72%', grade: 'C', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
            ].map((item) => (
              <div key={item.label} className={`${item.bg} rounded-xl p-3 ring-1 ${item.ring}`}>
                <p className="text-[10px] font-medium text-slate-500 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color} tracking-tight leading-none`}>{item.score}</p>
                <p className={`text-[10px] font-semibold ${item.color} mt-0.5`}>{item.grade}</p>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-slate-600">Trend — Last 6 Audits</span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                <TrendingUp size={10} /> +12%
              </span>
            </div>
            {/* SVG sparkline */}
            <svg viewBox="0 0 200 50" className="w-full h-10" fill="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 40 L33 32 L66 35 L100 22 L133 18 L166 12 L200 8" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0 40 L33 32 L66 35 L100 22 L133 18 L166 12 L200 8 L200 50 L0 50Z" fill="url(#sparkGrad)" />
            </svg>
          </div>

          {/* Recent audit row */}
          <div className="flex items-center justify-between bg-white rounded-xl p-3 ring-1 ring-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardCheck size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Deli Department</p>
                <p className="text-[10px] text-slate-400">Completed 2h ago</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">91%</p>
              <p className="text-[10px] font-medium text-emerald-500">A-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification card */}
      <div className="absolute -right-4 -bottom-3 sm:-right-8 bg-white rounded-xl shadow-lg shadow-slate-900/5 border border-slate-200/80 p-3 flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-1000 delay-500">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 size={16} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-700">Audit Complete</p>
          <p className="text-[10px] text-slate-400">Front End — 94% (A)</p>
        </div>
      </div>
    </div>
  );
}

/** Tailwind-built mobile audit mockup for spotlight */
function MobileAuditMockup() {
  return (
    <div className="relative mx-auto w-[260px]">
      <div className="absolute -inset-3 bg-gradient-to-b from-blue-400/10 to-indigo-400/10 rounded-[2rem] blur-xl" />
      <div className="relative bg-slate-900 rounded-[2rem] p-2 shadow-2xl ring-1 ring-white/10">
        {/* Phone notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-b-2xl z-10" />
        <div className="bg-white rounded-[1.5rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-7 pb-2">
            <span className="text-[10px] font-semibold text-slate-800">Deli Audit</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">4 of 19</Badge>
          </div>
          {/* Progress bar */}
          <div className="px-5 mb-3">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-[21%] bg-blue-500 rounded-full" />
            </div>
          </div>
          {/* Flashcard */}
          <div className="mx-4 mb-4 bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 ring-1 ring-blue-100 shadow-sm">
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              Are all display cases clean and properly stocked?
            </p>
          </div>
          {/* Answer buttons */}
          <div className="px-4 pb-5 grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 text-emerald-700 rounded-lg py-2 text-center text-[10px] font-semibold ring-1 ring-emerald-200">Yes</div>
            <div className="bg-red-50 text-red-700 rounded-lg py-2 text-center text-[10px] font-semibold ring-1 ring-red-200">No</div>
            <div className="bg-slate-50 text-slate-600 rounded-lg py-2 text-center text-[10px] font-semibold ring-1 ring-slate-200">N/A</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tailwind-built analytics mockup for spotlight */
function AnalyticsMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-400/10 via-blue-400/10 to-indigo-400/10 rounded-3xl blur-2xl" />
      <div className="relative bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-200/80 overflow-hidden">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Department Scores</p>
              <p className="text-[10px] text-slate-400">Last 30 days</p>
            </div>
            <Badge variant="secondary" className="text-[9px]">
              <TrendingUp size={10} className="text-emerald-500" /> 8% avg improvement
            </Badge>
          </div>

          {/* Bar chart */}
          <div className="space-y-2.5">
            {[
              { dept: 'Front End', score: 94, color: 'bg-emerald-500' },
              { dept: 'Deli', score: 87, color: 'bg-blue-500' },
              { dept: 'Produce', score: 82, color: 'bg-blue-400' },
              { dept: 'Bakery', score: 72, color: 'bg-amber-500' },
              { dept: 'Meat', score: 68, color: 'bg-amber-400' },
            ].map((item) => (
              <div key={item.dept} className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-slate-500 w-16 shrink-0">{item.dept}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden">
                  <div className={`h-full ${item.color} rounded-md`} style={{ width: `${item.score}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{item.score}%</span>
              </div>
            ))}
          </div>

          {/* Insight callout */}
          <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2.5 ring-1 ring-blue-100">
            <Sparkles size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-blue-800">Insight</p>
              <p className="text-[10px] text-blue-600 leading-relaxed">Meat department dropped 14 points this month. 3 questions consistently scoring low.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                 */
/* ------------------------------------------------------------------ */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)]" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />

        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-medium mb-6 ring-1 ring-blue-200/60">
                <Sparkles size={12} />
                Built for multi-location retail
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-5">
                Retail audits that{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  actually get done
                </span>
              </h1>

              <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-md">
                Flashcard-style questions. Instant scoring. Trend analytics across every department. AuditFlows replaces clipboards and spreadsheets with a system your team will want to use.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="text-base px-8 h-12 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-shadow" asChild>
                  <Link to="/sign-up">
                    Start Free <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 h-12"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  See How It Works
                </Button>
              </div>

              {/* Social proof micro-line */}
              <div className="flex items-center gap-2 mt-6 text-xs text-slate-400">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span>Trusted by retail teams everywhere</span>
              </div>
            </div>

            {/* Product mockup */}
            <div className="lg:pl-4">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative border-y border-slate-200/60 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x sm:divide-slate-200">
            {[
              { value: '171', label: 'Pre-loaded Questions', sub: 'Ready to use' },
              { value: '9', label: 'Department Templates', sub: 'Fully customizable' },
              { value: '100%', label: 'Mobile-Optimized', sub: 'Works on any device' },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{stat.value}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">{stat.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="secondary" className="mb-4">Features</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                Everything you need to run better audits
              </h2>
              <p className="text-base text-slate-500 leading-relaxed">
                From flashcard questions to analytics dashboards, AuditFlows gives your team the tools to stay consistent and improve over time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <Card
                    key={f.title}
                    className="group relative overflow-hidden hover:shadow-md hover:shadow-blue-900/5 transition-all duration-300 hover:-translate-y-0.5 border-slate-200/80"
                  >
                    <CardContent className="pt-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 ring-1 ring-blue-100 group-hover:bg-blue-100 group-hover:ring-blue-200 transition-colors">
                          <Icon size={20} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-slate-800 leading-tight">{f.title}</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-slate-50/50 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                Three steps to better compliance
              </h2>
              <p className="text-base text-slate-500 leading-relaxed">
                No training manuals. No complex setup. Your team can complete their first audit in under five minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.num} className="relative">
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:block absolute top-12 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px bg-gradient-to-r from-blue-300 via-blue-200 to-transparent" />
                    )}
                    <div className="relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-600/20">
                        <Icon size={24} />
                      </div>
                      <span className="block text-[10px] font-bold tracking-widest text-blue-600/60 uppercase mb-2">{step.num}</span>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== FEATURE SPOTLIGHT 1: Mobile Audit UX ===== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <MobileAuditMockup />
              </div>
              <div>
                <Badge variant="secondary" className="mb-4">
                  <Smartphone size={12} /> Mobile-First Design
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                  Audits that feel like swiping through cards
                </h2>
                <p className="text-base text-slate-500 leading-relaxed mb-6">
                  Forget clunky forms and tiny checkboxes. AuditFlows presents one question at a time in a clean, focused flashcard format. Your team can complete a full department audit from their phone in minutes.
                </p>
                <ul className="space-y-3">
                  {[
                    'One question at a time — no scrolling, no overwhelm',
                    'Yes / No / N/A answers with optional notes',
                    'Progress bar shows completion at a glance',
                    'Works offline-ready for cold storage areas',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check size={16} className="text-blue-600 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== FEATURE SPOTLIGHT 2: Analytics ===== */}
      <section className="py-20 sm:py-28 bg-slate-50/50 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="mb-4">
                  <BarChart3 size={12} /> Analytics & Insights
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                  See trends before they become problems
                </h2>
                <p className="text-base text-slate-500 leading-relaxed mb-6">
                  Track every department&apos;s performance over time. Spot declining scores, compare locations, and identify the specific questions driving low marks — all from a single dashboard.
                </p>
                <ul className="space-y-3">
                  {[
                    'Trend lines across all departments and time periods',
                    'Letter grades make scores instantly understandable',
                    'Radar charts for multi-department comparison',
                    'Export any report to CSV for deeper analysis',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check size={16} className="text-blue-600 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <AnalyticsMockup />
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== PRICING PLACEHOLDER ===== */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <RevealSection>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="secondary" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                Simple pricing, coming soon
              </h2>
              <p className="text-base text-slate-500 leading-relaxed">
                We&apos;re finalizing our plans. Sign up now to lock in early access and special pricing.
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <Card className="relative overflow-hidden border-blue-200/80 shadow-lg shadow-blue-900/5">
                {/* Early access ribbon */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-sm">
                    <Sparkles size={10} /> Early Access
                  </Badge>
                </div>
                <CardContent className="text-center pt-0 pb-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
                    <Star size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Free During Beta</h3>
                  <p className="text-sm text-slate-500 mb-6">Full access to all features while we perfect the platform.</p>

                  <ul className="text-left space-y-2.5 mb-6">
                    {[
                      'Unlimited audits & team members',
                      'All 9 department templates',
                      'Full analytics dashboard',
                      'CSV export & import',
                      'Priority support',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full h-11 shadow-md shadow-blue-600/20" asChild>
                    <Link to="/sign-up">
                      Get Early Access <ChevronRight size={16} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== FINAL CTA BANNER ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        {/* Decorative shapes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Ready to transform your audit process?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            Join retail teams using AuditFlows to stay consistent, catch issues early, and improve scores across every department.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 text-base px-8 h-12 shadow-lg shadow-blue-900/20"
              asChild
            >
              <Link to="/sign-up">
                Start Free Today <ArrowRight size={18} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="border border-white/40 !text-white hover:bg-white/10 hover:!text-white text-base px-8 h-12"
              asChild
            >
              <Link to="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
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
