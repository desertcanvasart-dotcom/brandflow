"use client"

import { useState } from "react"
import {
  Sparkles,
  PenTool,
  BarChart3,
  Lightbulb,
  ClipboardList,
  ListChecks,
  BookOpen,
  MousePointerClick,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react"

interface Capability {
  icon: LucideIcon
  label: string
  description: string
}

const capabilities: Capability[] = [
  {
    icon: ClipboardList,
    label: "Extract briefs from meetings",
    description:
      "AI analyzes meeting transcripts and extracts structured service briefs for every service discussed.",
  },
  {
    icon: ListChecks,
    label: "Generate task lists from briefs",
    description:
      "Auto-generate project tasks from completed briefs — AI includes or excludes tasks with clear reasoning.",
  },
  {
    icon: Sparkles,
    label: "Generate campaign ideas",
    description:
      "Get AI-powered campaign concepts tailored to your brand strategy and audience.",
  },
  {
    icon: PenTool,
    label: "Write marketing copy",
    description:
      "Create ad copy, social posts, and blog content in your brand voice.",
  },
  {
    icon: BarChart3,
    label: "Create performance reports",
    description:
      "Auto-generate detailed reports with insights and recommendations.",
  },
  {
    icon: MousePointerClick,
    label: "Generate high-converting CTAs",
    description:
      "Create CTA variations optimized for conversions with A/B testing recommendations.",
  },
  {
    icon: Lightbulb,
    label: "Suggest optimization insights",
    description:
      "Get data-driven suggestions to improve campaign performance.",
  },
  {
    icon: MessageSquareText,
    label: "Chat with meeting transcripts",
    description:
      "Ask questions about any meeting — AI searches transcripts and can create tasks or add to briefs from the conversation.",
  },
  {
    icon: BookOpen,
    label: "Knowledge Base & AI Auto-Fill",
    description:
      "Upload documents or paste URLs — AI extracts structured personas, strategies, and competitor profiles. All content feeds into RAG for smarter outputs.",
  },
]

const mockResponses: Record<number, { prompt: string; response: string }> = {
  0: {
    prompt: "Extract briefs from client kickoff meeting transcript",
    response:
      "\ud83d\udccb Intake Extracted \u2014 3 Service Briefs Generated\n\n1. Website Brief \u2014 12-page responsive site, WordPress CMS, e-commerce integration, modern minimal design\n2. SEO Brief \u2014 15 target keywords, 3 competitor URLs, local SEO for 2 locations, technical audit\n3. Content Brief \u2014 Blog (2x/week), social posts (daily), brand tone: professional yet approachable\n\nTimeline: 12 weeks | Budget: $45K | Priority: Website first",
  },
  1: {
    prompt: "Generate tasks for completed Website brief",
    response:
      "\u2705 12 tasks created, 4 excluded\n\nIncluded:\n\u2022 Site audit & requirements gathering (~4h)\n\u2022 Wireframes & sitemap (~6h)\n\u2022 Responsive mockups (~8h)\n\u2022 WordPress setup & theme dev (~12h)\n\u2022 E-commerce integration (~8h)\n\u2022 QA & cross-browser testing (~4h)\n\nExcluded:\n\u2718 Custom CRM integration \u2014 not in scope\n\u2718 Multi-language setup \u2014 single language per brief",
  },
  2: {
    prompt: "Generate campaign ideas for Q2 product launch",
    response:
      '1. "Behind the Build" series \u2014 4-part social campaign showcasing product development\n2. Influencer collab with 3 micro-creators in the SaaS space\n3. Interactive ROI calculator landing page with paid traffic\n4. Customer success spotlight series on LinkedIn',
  },
  3: {
    prompt: "Write Instagram caption for new feature announcement",
    response:
      "\u2728 Big news! We just shipped something you've been asking for...\n\nIntroducing Smart Reports \u2014 AI-powered analytics that tell you exactly what's working (and what's not).\n\n\ud83c\udfaf Real-time insights\n\ud83d\udcca Auto-generated recommendations\n\u26a1 One-click client sharing\n\nLink in bio to start your free trial \ud83d\udc46",
  },
  4: {
    prompt: "Generate monthly performance summary",
    response:
      "\ud83d\udcca March 2026 Performance Summary\n\n\u25b2 Impressions: 245K (+18% MoM)\n\u25b2 Engagement Rate: 4.2% (+0.8%)\n\u25b2 Content Published: 47 pieces\n\u25b2 Client Satisfaction: 94%\n\nTop Performer: LinkedIn carousel series (12K impressions)\nRecommendation: Increase video content \u2014 3x higher engagement vs. static posts.",
  },
  5: {
    prompt: "Generate CTA variations for the SaaS free trial landing page",
    response:
      "\ud83c\udfaf 6 CTA Variations Generated\n\nPrimary (high-urgency):\n1. \"Start Your Free Trial — No Credit Card Required\"\n2. \"Get Started Free in 30 Seconds\"\n\nValue-driven:\n3. \"See How Teams Ship 3x Faster\"\n4. \"Try the Platform 2,400+ Agencies Trust\"\n\nSocial proof:\n5. \"Join 12,000 Marketers — Start Free\"\n6. \"Rated #1 by Agency Leaders — Try It Now\"\n\n\ud83d\udca1 Recommendation: A/B test #1 vs #4 — urgency + value performs best for SaaS trials.",
  },
  6: {
    prompt: "What should we optimize this week?",
    response:
      "\ud83c\udfaf Top 3 Optimization Opportunities:\n\n1. Instagram Reels \u2014 Your video content gets 3x more engagement. Post 2 more Reels this week.\n2. LinkedIn posting time \u2014 Shift from 9am to 11am EST for +22% reach.\n3. Blog SEO \u2014 \u201cmarketing automation\u201d keyword has low competition. Publish a guide this week.",
  },
  7: {
    prompt: "What did the client say about the homepage design in last Tuesday's call?",
    response:
      "\ud83d\udcdd Searching transcript: \"Client Kickoff — Acme Corp\" (Mar 4, 2026)\n\nThe client mentioned:\n\u2022 They want a \"clean, modern look\" with heavy whitespace\n\u2022 Hero section should lead with the ROI calculator, not a video\n\u2022 They prefer the navigation style from competitor site (coolstartup.io)\n\u2022 Mobile-first is critical — 68% of their traffic is mobile\n\n[ADD_TO_BRIEF: Homepage must be mobile-first with ROI calculator hero]\n[CREATE_TASK: Update homepage wireframe — mobile-first layout with ROI calculator hero | priority:high]",
  },
  8: {
    prompt: "Auto-fill competitor profile from https://acme-rival.com/about",
    response:
      "\u2728 AI Auto-Fill Complete \u2014 Competitor Profile\n\n\u2022 Company Name: Acme Rival Inc. \u2705 high confidence\n\u2022 Positioning: \"All-in-one growth platform for SMBs\" \u2705 high\n\u2022 Strengths: Self-serve onboarding, freemium model, 12K+ customers \u2705 high\n\u2022 Weaknesses: No enterprise tier, limited integrations \ud83d\udfe1 medium\n\u2022 Market Share: ~8% in SMB segment \ud83d\udfe1 medium\n\u2022 Key Products: Growth Suite, Analytics Pro, CRM Lite \u2705 high\n\n\ud83d\udca1 6 fields filled with amber highlights \u2014 review and confirm before saving.\nSource URL saved for reference.",
  },
}

export function AIShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)

  const activeResponse = mockResponses[activeIndex]

  return (
    <section id="ai-agents" className="bg-background py-20 md:py-28 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI that works like your best marketing analyst
          </h2>
          <p className="mt-4 text-muted-foreground">
            Built-in AI agents that understand your brand, learn from your data,
            and deliver results that get better over time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: capability cards */}
          <div className="space-y-3">
            {capabilities.map((cap, index) => (
              <button
                key={cap.label}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex items-start gap-3 p-4 rounded-xl border w-full text-left transition-colors cursor-pointer ${
                  activeIndex === index
                    ? "border-indigo-500 bg-indigo-50"
                    : "bg-card hover:border-indigo-200"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <cap.icon className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{cap.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cap.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Right: AI interaction mockup */}
          <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 min-h-[300px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs text-indigo-300 font-medium">
                Agency Beats AI
              </span>
            </div>

            <div className="bg-white/5 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-400">Prompt</p>
              <p className="text-sm text-slate-200 mt-1">
                {activeResponse.prompt}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-indigo-400">Response</p>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {activeResponse.response}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
