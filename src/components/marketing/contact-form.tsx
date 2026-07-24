'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  subject: '',
  message: '',
}

export function ContactForm() {
  const [values, setValues] = useState(initialState)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof typeof initialState>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      toast.success("Message sent — we'll get back to you within one business day.")
      setValues(initialState)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium mb-1.5">
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="John"
            required
            autoComplete="given-name"
            value={values.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium mb-1.5">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="john@agency.com"
          required
          autoComplete="email"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Company */}
      <div>
        <label htmlFor="company" className="block text-sm font-medium mb-1.5">
          Agency / Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          placeholder="Acme Agency"
          autoComplete="organization"
          value={values.company}
          onChange={(e) => update('company', e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          required
          value={values.subject}
          onChange={(e) => update('subject', e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
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
        <label htmlFor="message" className="block text-sm font-medium mb-1.5">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us about your agency and how we can help..."
          required
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg px-6 py-3 text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
