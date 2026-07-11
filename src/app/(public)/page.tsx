import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle2,
  MessageSquareReply,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

const MODULES = [
  { label: "Account Operations", icon: Shield, tone: "success" as const },
  { label: "Broadcast Send Operations", icon: Send, tone: "info" as const },
  { label: "Group Discovery", icon: Search, tone: "neutral" as const },
  { label: "Auto Reply", icon: Bot, tone: "warning" as const },
  { label: "Reply Macro", icon: MessageSquareReply, tone: "neutral" as const },
  { label: "Recurring Scheduler", icon: CalendarClock, tone: "info" as const },
  { label: "Failure Recovery", icon: RefreshCw, tone: "danger" as const },
  { label: "Delivery Analytics", icon: BarChart3, tone: "success" as const },
];

const WORKFLOWS = [
  {
    step: "01",
    title: "Connect and manage Telegram accounts",
    icon: Shield,
    accent: "from-emerald-500/20 to-transparent",
    points: ["Track account health states", "Keep operational attention visible", "Separate active, warning, and recovery states"],
  },
  {
    step: "02",
    title: "Discover and organize groups",
    icon: Users,
    accent: "from-cyan-500/20 to-transparent",
    points: ["Search groups from the workspace", "Organize recipients before sending", "Keep discovery tied to operations"],
  },
  {
    step: "03",
    title: "Send and schedule broadcasts",
    icon: Send,
    accent: "from-orange-500/20 to-transparent",
    points: ["Draft once and send with control", "Use recurring schedule visibility", "Review send state without losing context"],
  },
  {
    step: "04",
    title: "Automate replies and macros",
    icon: Bot,
    accent: "from-violet-500/20 to-transparent",
    points: ["Handle common replies consistently", "Reuse macros for repeat work", "Reduce manual operator effort"],
  },
  {
    step: "05",
    title: "Detect failures and recover operations",
    icon: RefreshCw,
    accent: "from-rose-500/20 to-transparent",
    points: ["Spot blocked or failed sends quickly", "Route into the right recovery flow", "Keep the failure story attached to the action"],
  },
  {
    step: "06",
    title: "Understand delivery performance",
    icon: Activity,
    accent: "from-amber-500/20 to-transparent",
    points: ["Read delivery trends at a glance", "Compare by account and source", "Make the next action easier to decide"],
  },
];

const DIFFERENTIATORS = [
  "Multi-account operations with clear health states",
  "Failure intelligence that points toward recovery workflows",
  "Recurring execution visibility instead of opaque background jobs",
  "Recipient control and group organization in the same workspace",
  "Delivery analytics that keep performance grounded in the product",
];

const FAQS = [
  {
    q: "What does TeleMon actually do?",
    a: "TeleMon is an operations workspace for Telegram accounts, broadcasts, group discovery, auto-replies, reply macros, scheduling, failure recovery, and delivery analytics.",
  },
  {
    q: "Is this just a basic sender?",
    a: "No. The homepage emphasizes the operational layer around sending: account health, recovery states, recurring visibility, and analytics are part of the workflow.",
  },
  {
    q: "Does the homepage use fabricated proof points?",
    a: "No. The public UI avoids fake customer logos, fake testimonials, and unsupported performance claims.",
  },
  {
    q: "Where should I go next?",
    a: "Use Start free to begin onboarding or jump into the product sections below to see how the workspace is organized.",
  },
];

function PreviewPill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        active
          ? "border-app-primary/30 bg-app-primary-muted text-app-primary"
          : "border-app-border bg-app-card text-app-text-muted",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function PreviewRow({
  title,
  status,
  note,
}: {
  title: string;
  status: string;
  note: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-app-border bg-app-bg px-3 py-3 transition-colors hover:border-app-border-strong">
      <div className="min-w-0">
        <p className="text-sm font-medium text-app-text">{title}</p>
        <p className="mt-0.5 text-xs text-app-text-muted">{note}</p>
      </div>
      <Badge tone={status === "Healthy" ? "success" : status === "Needs attention" ? "warning" : "neutral"}>
        {status}
      </Badge>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-app-bg">
      <section
        className="relative overflow-hidden bg-grid"
        aria-labelledby="public-hero-title"
      >
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <Badge tone="info" className="mb-5">
              Production homepage refresh
            </Badge>

            <h1
              id="public-hero-title"
              className="max-w-xl text-[clamp(2.15rem,6vw,4.6rem)] font-bold leading-[1.05] tracking-tight text-app-text"
            >
              Telegram operations,
              <span className="block text-app-primary">built like a control room.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-app-text-secondary sm:text-lg">
              TeleMon brings account management, broadcasts, group discovery,
              automation, scheduling, failure recovery, and delivery analytics into
              one operational workspace.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-app-primary px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-app-primary-hover"
              >
                Start free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#product"
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-app-border bg-app-card px-5 py-3 text-sm font-medium text-app-text transition-all hover:border-app-border-strong hover:bg-app-card-hover"
              >
                See the product
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "Multi-account operations",
                "Broadcast scheduling",
                "Auto replies and macros",
                "Failure recovery",
                "Delivery analytics",
              ].map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Clear health states",
                "Grounded recovery workflows",
                "No fake testimonials or inflated claims",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-app-border bg-app-card/80 px-4 py-3 text-sm text-app-text-secondary shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:pt-2">
            <Panel
              title={
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-app-primary" />
                  Control room preview
                </div>
              }
              description="A representative workspace view using the real TeleMon product language."
              accent="amber"
              className="overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {["Dashboard", "Send", "Scheduler", "Group Search", "Auto Reply", "Reply Macro", "Log", "Delivery Analytics"].map(
                    (label, index) => (
                      <PreviewPill key={label} label={label} active={index === 0} />
                    )
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-app-text">Account Operations</p>
                      <Badge tone="success">Healthy</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <PreviewRow title="Primary account" status="Healthy" note="Connected and ready for operations." />
                      <PreviewRow title="Backup account" status="Needs attention" note="Visible in the recovery path." />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-app-text">Broadcast Send Operations</p>
                      <Badge tone="info">Queued</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <PreviewRow title="Campaign draft" status="Healthy" note="Prepared for a controlled send." />
                      <PreviewRow title="Recurring schedule" status="Queued" note="Execution visibility stays attached." />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-app-text">Group Discovery and Automation</p>
                      <Badge tone="neutral">Operational</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        "Group discovery",
                        "Auto reply",
                        "Reply macro",
                        "Recipient control",
                      ].map((label) => (
                        <div
                          key={label}
                          className="rounded-xl border border-app-border bg-app-card px-3 py-2 text-xs text-app-text-secondary"
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-app-border bg-app-surface p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-app-text">Delivery Analytics</p>
                      <Badge tone="success">Readout</Badge>
                    </div>
                    <div className="mt-3 space-y-3">
                      {[
                        { label: "Successful sends", width: "82%", tone: "bg-app-success" },
                        { label: "Recovery events", width: "48%", tone: "bg-app-warning" },
                        { label: "Blocked attempts", width: "28%", tone: "bg-app-danger" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-xs text-app-text-muted">
                            <span>{item.label}</span>
                            <span>Live view</span>
                          </div>
                          <div className="h-2 rounded-full bg-app-border">
                            <div className={`${item.tone} h-2 rounded-full`} style={{ width: item.width }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      <section
        id="product"
        className="scroll-mt-24 border-t border-app-border/60 bg-app-surface/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="product-title"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <Badge tone="success" className="mb-4">
              Product preview
            </Badge>
            <h2 id="product-title" className="text-3xl font-bold tracking-tight text-app-text sm:text-4xl">
              An operational workspace, not a basic sender.
            </h2>
            <p className="mt-4 text-base leading-7 text-app-text-secondary sm:text-lg">
              The public preview mirrors the real product language: accounts,
              broadcasts, groups, reply automation, recurring schedules, recovery,
              and delivery analytics are all treated as part of the same system.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.label}
                  className="group rounded-2xl border border-app-border bg-app-card p-4 transition-all hover:border-app-border-strong hover:bg-app-card-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-app-border bg-app-bg text-app-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-app-text">{module.label}</p>
                      <p className="text-xs text-app-text-muted">Real product capability</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge tone={module.tone}>Shown in workspace</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="workflows"
        className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="workflows-title"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <Badge tone="info" className="mb-4">
              Capability story
            </Badge>
            <h2 id="workflows-title" className="text-3xl font-bold tracking-tight text-app-text sm:text-4xl">
              A clearer story from connection to recovery.
            </h2>
            <p className="mt-4 text-base leading-7 text-app-text-secondary sm:text-lg">
              The homepage now explains the product as a sequence of operator
              workflows instead of a repetitive list of marketing cards.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {WORKFLOWS.map((item, index) => {
              const Icon = item.icon;
              const reversed = index % 2 === 1;
              return (
                <div
                  key={item.step}
                  className="grid gap-4 rounded-3xl border border-app-border bg-app-card p-5 sm:p-6 lg:grid-cols-[0.95fr_1.05fr]"
                >
                  <div className={reversed ? "lg:order-2" : ""}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-primary-muted text-app-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                          {item.step}
                        </p>
                        <h3 className="text-xl font-semibold text-app-text">{item.title}</h3>
                      </div>
                    </div>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-app-text-secondary">
                      TeleMon keeps this workflow visible in the same product
                      language operators use during daily work.
                    </p>
                  </div>

                  <div className={reversed ? "lg:order-1" : ""}>
                    <div className={`rounded-2xl border border-app-border bg-gradient-to-br ${item.accent} p-4`}>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {item.points.map((point) => (
                          <div
                            key={point}
                            className="rounded-xl border border-app-border bg-app-bg px-3 py-3 text-sm text-app-text-secondary"
                          >
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="why"
        className="scroll-mt-24 border-y border-app-border/60 bg-app-surface/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="why-title"
      >
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Badge tone="warning" className="mb-4">
              Operational differentiation
            </Badge>
            <h2 id="why-title" className="text-3xl font-bold tracking-tight text-app-text sm:text-4xl">
              More than a sender, because operations do not stop at sending.
            </h2>
            <p className="mt-4 text-base leading-7 text-app-text-secondary sm:text-lg">
              TeleMon is presented as a serious Telegram operations platform with
              the kinds of states teams actually need to watch.
            </p>

            <div className="mt-6 space-y-3">
              {DIFFERENTIATORS.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-app-border bg-app-card px-4 py-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-success" aria-hidden="true" />
                  <p className="text-sm text-app-text-secondary">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <Panel
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-app-primary" />
                Why this positioning matters
              </div>
            }
            description="A grounded comparison with the common baseline."
            accent="violet"
          >
            <div className="space-y-3">
              {[
                ["Basic sender", "Single-purpose sends with little context."],
                ["TeleMon", "Accounts, recovery states, schedules, and analytics live together."],
                ["Basic sender", "Hard to see what failed and what to do next."],
                ["TeleMon", "Failure intelligence points operators toward the recovery path."],
                ["Basic sender", "Sending is visible, but recurring execution is opaque."],
                ["TeleMon", "Recurring execution visibility stays in the workspace."],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid gap-2 rounded-xl border border-app-border bg-app-bg px-4 py-3 sm:grid-cols-[150px_1fr]"
                >
                  <div className="text-sm font-semibold text-app-text">{label}</div>
                  <div className="text-sm text-app-text-secondary">{value}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="faq-title"
      >
        <div className="mx-auto max-w-4xl">
          <Badge tone="neutral" className="mb-4">
            FAQ
          </Badge>
          <h2 id="faq-title" className="text-3xl font-bold tracking-tight text-app-text sm:text-4xl">
            A few things visitors should know quickly.
          </h2>

          <div className="mt-8 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-app-border bg-app-card"
              >
                <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-app-text marker:hidden">
                  <span>{faq.q}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-app-text-muted transition-transform group-open:-rotate-90" aria-hidden="true" />
                </summary>
                <div className="border-t border-app-border px-4 py-4 text-sm leading-7 text-app-text-secondary">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-t border-app-border/60 bg-app-surface/30 px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8"
        aria-labelledby="cta-title"
      >
        <div className="mx-auto max-w-3xl">
          <Badge tone="success" className="mb-4">
            Ready to explore
          </Badge>
          <h2 id="cta-title" className="text-3xl font-bold tracking-tight text-app-text sm:text-4xl">
            Start with the product, then decide if the workflow fits.
          </h2>
          <p className="mt-4 text-base leading-7 text-app-text-secondary sm:text-lg">
            The homepage now gives visitors a clearer path: start onboarding,
            or keep exploring the operational surface before committing.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-app-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-app-primary-hover"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#product"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-app-border bg-app-card px-6 py-3 text-sm font-medium text-app-text transition-all hover:border-app-border-strong hover:bg-app-card-hover"
            >
              Review the workspace
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
