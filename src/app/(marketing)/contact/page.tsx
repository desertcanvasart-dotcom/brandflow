import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  ArrowRight,
  Headphones,
  BookOpen,
} from 'lucide-react'

const contactInfo = [
  {
    icon: MapPin,
    label: 'Office',
    value: '31 Central Avenue, Mokattam',
    detail: 'Cairo, 11571',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+20 11580 11600',
    detail: 'Mon - Fri, 9am - 6pm EET',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@agencybeats.app',
    detail: 'We reply within 24 hours',
  },
  {
    icon: Clock,
    label: 'Working Hours',
    value: 'Sun - Thu, 9:00 - 18:00',
    detail: 'EET (UTC+2)',
  },
]

const supportChannels = [
  {
    icon: Headphones,
    title: 'Technical Support',
    description:
      'Having trouble with a feature? Our support engineers are here to help.',
    cta: 'Open a Ticket',
    href: '#',
  },
  {
    icon: MessageSquare,
    title: 'Sales Inquiry',
    description:
      'Interested in Agency Beats for your agency? Let us walk you through the platform.',
    cta: 'Talk to Sales',
    href: '#',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    description:
      'Browse guides, API references, and tutorials to get started quickly.',
    cta: 'View Docs',
    href: '/docs',
  },
]

export default function ContactPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0F172A] pt-32 pb-20">
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.15), rgba(168,85,247,0.08), transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Have a question, need a demo, or want to discuss how Agency Beats can
              help your agency? We&apos;d love to hear from you.
            </p>
          </div>
        </section>

        {/* Contact Info + Form */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Left: Contact info */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl font-bold">Contact Information</h2>
                  <p className="mt-2 text-muted-foreground">
                    Reach out through any of these channels.
                  </p>
                </div>

                <div className="space-y-6">
                  {contactInfo.map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {item.label}
                          </p>
                          <p className="text-sm font-semibold mt-0.5">
                            {item.value}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Map placeholder */}
                <div className="rounded-xl overflow-hidden border border-border bg-muted/30 aspect-[4/3] flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Mokattam, Cairo
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Interactive map coming soon
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Contact form */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
                  <h3 className="text-xl font-bold mb-1">Send us a message</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Fill out the form and we&apos;ll get back to you within one
                    business day.
                  </p>

                  <form className="space-y-5">
                    {/* Name row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="block text-sm font-medium mb-1.5"
                        >
                          First Name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="lastName"
                          className="block text-sm font-medium mb-1.5"
                        >
                          Last Name
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder="john@agency.com"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Agency / Company
                      </label>
                      <input
                        id="company"
                        type="text"
                        placeholder="Acme Agency"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Subject
                      </label>
                      <select
                        id="subject"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select a topic
                        </option>
                        <option value="demo">Request a Demo</option>
                        <option value="sales">Sales Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing Question</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium mb-1.5"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        placeholder="Tell us about your agency and how we can help..."
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg px-6 py-3 text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/25"
                    >
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Support Channels */}
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold">Other Ways to Reach Us</h2>
              <p className="mt-2 text-muted-foreground">
                Choose the channel that works best for you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {supportChannels.map((channel) => {
                const Icon = channel.icon
                return (
                  <div
                    key={channel.title}
                    className="rounded-2xl border border-border bg-card p-6 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold">{channel.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {channel.description}
                    </p>
                    <Link
                      href={channel.href}
                      className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center gap-1"
                    >
                      {channel.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0F172A] py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-2xl font-bold text-white">
              Ready to streamline your agency?
            </h2>
            <p className="mt-3 text-slate-400">
              Start your free trial today. No credit card required.
            </p>
            <div className="mt-6">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-8 py-3 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
