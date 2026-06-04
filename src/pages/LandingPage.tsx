import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Brain, LineChart, Shield, Star, Clock, ChevronRight,
  GraduationCap, Users, Sparkles, CheckCircle
} from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Tutor',
    desc: 'Claude AI acts as a personal tutor — Socratic guidance, instant feedback, zero off-topic distractions.',
    color: 'bg-brand-100 text-brand-600',
  },
  {
    icon: LineChart,
    title: 'N-Year Roadmap',
    desc: 'Set a goal (Ivy League, STEM, Arts) and get a milestone-driven plan from today to admission day.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: BookOpen,
    title: 'Adaptive Learning',
    desc: 'Exercises and content that match your child\'s current level, adjusting in real time as they grow.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Shield,
    title: 'Full Parental Control',
    desc: 'Every AI–child conversation is logged and visible to parents. Children cannot delete history.',
    color: 'bg-red-100 text-red-600',
  },
  {
    icon: Star,
    title: 'Self-Study Ready',
    desc: 'No human tutor needed. AI knows when to give hints vs. answers, building true understanding.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Clock,
    title: 'Pre-Generated Content',
    desc: 'Upcoming lessons are queued and ready before the student reaches them — zero wait time.',
    color: 'bg-cyan-100 text-cyan-600',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    desc: 'Perfect for one child beginning their journey.',
    features: ['1 child profile', 'AI tutor (all subjects)', 'Weekly parent report', 'Basic roadmap'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Family',
    price: '$39',
    period: '/month',
    desc: 'Most popular — up to 3 children, full features.',
    features: ['Up to 3 children', 'N-Year roadmap planner', 'Daily parent digest', 'Advanced analytics', 'Priority AI responses'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Scholar',
    price: '$69',
    period: '/month',
    desc: 'Serious college prep for ambitious families.',
    features: ['Up to 5 children', 'Ivy League roadmap', 'Weekly AI coaching report', 'College essay AI coach', 'SAT/ACT prep included'],
    cta: 'Start Free Trial',
    highlight: false,
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">ScholarPath</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#roadmap" className="hover:text-brand-600 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-brand-600 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-purple-50 pt-20 pb-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Claude AI
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Your child's personal<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">
              AI tutor & path to college
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            ScholarPath combines adaptive AI tutoring with a personalised N-year academic
            roadmap — from today's lesson to Ivy League admission day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3.5 rounded-xl font-semibold text-base hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
            >
              Start free 14-day trial
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-6 py-3.5 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              See parent dashboard
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-4">No credit card required · COPPA compliant · Cancel anytime</p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y border-gray-100 bg-gray-50 py-4">
        <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 font-medium">
          {['10,000+ students', '4.9 ★ App Store', '500+ Ivy admits helped', 'COPPA & GDPR-K compliant', 'Available on all devices'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything a great tutor does — and more</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Designed for parents who want structure, and students who need guidance without dependency.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="roadmap" className="py-24 bg-gradient-to-br from-brand-50 to-purple-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">From today to admission day</h2>
            <p className="text-gray-500 text-lg">A real roadmap, not a vague promise.</p>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-brand-200 hidden sm:block" />
            {[
              { step: '01', title: 'Set your goal', desc: 'Parent enters the target university, current grade, and subjects.' },
              { step: '02', title: 'AI builds the N-year plan', desc: 'ScholarPath generates a milestone tree: yearly goals → semester goals → weekly tasks.' },
              { step: '03', title: 'Student studies daily', desc: 'The AI tutor guides the child through each day\'s personalised work.' },
              { step: '04', title: 'AI adapts in real time', desc: 'Exercises get harder or easier based on performance. No human needed.' },
              { step: '05', title: 'Parent stays in the loop', desc: 'Weekly digest, progress graphs, and full chat history — all locked, all visible.' },
              { step: '06', title: 'Admission day 🎓', desc: 'Years of structured progress pay off. Your child walks in prepared.' },
            ].map(item => (
              <div key={item.step} className="relative flex items-start gap-6 mb-8 sm:ml-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center shadow-md z-10">
                  {item.step}
                </div>
                <div className="bg-white rounded-2xl p-5 flex-1 border border-gray-100 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-lg">Start free for 14 days. No credit card required.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border flex flex-col ${
                plan.highlight
                  ? 'bg-brand-600 border-brand-600 text-white shadow-xl scale-105'
                  : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              <div className="mb-4">
                <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${plan.highlight ? 'text-brand-200' : 'text-brand-600'}`}>
                  {plan.name}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mt-1 ${plan.highlight ? 'text-brand-100' : 'text-gray-500'}`}>{plan.desc}</p>
              </div>
              <ul className="flex-1 space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-brand-200' : 'text-green-500'}`} />
                    <span className={plan.highlight ? 'text-white' : 'text-gray-700'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-white text-brand-700 hover:bg-brand-50'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-brand-600 to-purple-600 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to build your child's future?</h2>
          <p className="text-brand-100 mb-8 text-lg">Join thousands of families who've replaced guesswork with a plan.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl text-base hover:bg-brand-50 transition-colors shadow-lg"
          >
            Start free trial — no credit card
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">ScholarPath</span>
        </div>
        <p>© 2026 ScholarPath · COPPA & GDPR-K compliant · Privacy Policy · Terms</p>
      </footer>
    </div>
  )
}
