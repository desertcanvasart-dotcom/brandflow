"use client"

import {
  Hash,
  Mail,
  MailOpen,
  CalendarDays,
  Figma,
  Video,
  Mic,
  CreditCard,
  Webhook,
} from "lucide-react"

const integrations = [
  { name: "Gmail", icon: Mail, color: "#EA4335", description: "Email sync & compose" },
  { name: "Outlook", icon: MailOpen, color: "#0078D4", description: "Email sync & compose" },
  { name: "Google Calendar", icon: CalendarDays, color: "#4285F4", description: "Event sync" },
  { name: "Figma", icon: Figma, color: "#A259FF", description: "Design file imports" },
  { name: "Slack", icon: Hash, color: "#4A154B", description: "Notification delivery" },
  { name: "LiveKit", icon: Video, color: "#FF6B35", description: "Video conferencing" },
  { name: "Deepgram", icon: Mic, color: "#13EF93", description: "AI transcription" },
  { name: "Stripe", icon: CreditCard, color: "#635BFF", description: "Billing & payments" },
]

export function IntegrationsSection() {
  return (
    <section id="integrations" className="bg-[#0F172A] text-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built-in integrations that power your workflow
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Native connections to email, calendar, design, video, and payment tools — all working together out of the box.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {integrations.map((item) => (
            <div
              key={item.name}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white/5 border border-white/5 p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 transition-colors duration-300">
                <item.icon
                  className="h-6 w-6 transition-all duration-300 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                  style={{ color: item.color }}
                />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-slate-400 transition-colors duration-300 group-hover:text-white block">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-500 transition-colors duration-300 group-hover:text-slate-400">
                  {item.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
