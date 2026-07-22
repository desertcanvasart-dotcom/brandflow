import { Star } from "lucide-react"

const testimonials = [
  {
    quote:
      "This platform replaced 5 tools for our agency. Campaign management, client approvals, and reporting — all in one place.",
    name: "Sarah Kim",
    title: "Founder @ Growth Marketing Co.",
  },
  {
    quote:
      "The AI features are game-changing. We generate reports in seconds that used to take hours. Our clients love the transparency.",
    name: "Michael Rodriguez",
    title: "Director @ Digital Spark Agency",
  },
  {
    quote:
      "Agency Beats' client portal eliminated 80% of our back-and-forth emails. Clients can approve content with one click.",
    name: "Emma Watson",
    title: "Head of Operations @ Creative Lab",
  },
]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

export function TestimonialsSection() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by agencies worldwide
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See what marketing teams are saying about Agency Beats.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-2xl border bg-card p-6 space-y-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                  {getInitials(testimonial.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
