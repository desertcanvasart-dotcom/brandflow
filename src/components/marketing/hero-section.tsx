import Link from "next/link";
import { Star } from "lucide-react";
import { DashboardMockup } from "./dashboard-mockup";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 bg-[#0F172A]">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
        aria-hidden="true"
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(99,102,241,0.20), rgba(168,85,247,0.10), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Text block */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            Run your entire agency from one intelligent platform
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Plan campaigns, manage clients, track performance, and automate
            reports — without juggling multiple tools.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-8 py-3 text-lg font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              Start Free Trial
            </Link>
            <a
              href="#product-preview"
              className="inline-flex items-center justify-center border border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-white rounded-full px-8 py-3 text-lg font-medium transition-all"
            >
              Book Demo
            </a>
          </div>

          {/* Trust badge */}
          <div className="mt-10 flex items-center justify-center gap-3">
            {/* Avatar circles */}
            <div className="flex -space-x-2">
              {[
                "from-indigo-400 to-purple-400",
                "from-purple-400 to-pink-400",
                "from-cyan-400 to-indigo-400",
                "from-emerald-400 to-cyan-400",
              ].map((gradient, i) => (
                <div
                  key={i}
                  className={`size-8 rounded-full bg-gradient-to-br ${gradient} border-2 border-[#0F172A]`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="size-3.5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-sm text-slate-400">
              Trusted by 1,000+ agencies
            </span>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="animate-marketing-float bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-2 shadow-2xl shadow-indigo-500/10 transform [perspective:1200px] [transform:rotateX(2deg)]">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
