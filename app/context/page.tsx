import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ContextPage() {
  return (
    <div className="px-12 py-10 max-w-3xl">
      <Link
        href="/shows"
        className="inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-ink-900 mb-8 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to product
      </Link>

      <div className="mb-20">
        <div className="eyebrow mb-3">
          Where to start
        </div>
        <h1 className="font-display text-[48px] font-medium text-ink-900 leading-[1.05]" style={{ letterSpacing: "-0.02em", fontOpticalSizing: "auto" }}>
          Welcome to Greenroom.
        </h1>
        <p className="text-[14.5px] text-ink-600 mt-4 leading-relaxed max-w-2xl">
          You&apos;re looking at our product as Mariana, lead booker at The
          Crescent. The product works. It&apos;s also visibly mediocre in
          places. Both of those things are true on purpose - this is the
          sandbox for exploring settlement quality.
        </p>
      </div>

      {/* Product problem callout */}
      <div className="rounded-lg border border-brand-200/60 bg-brand-50/30 p-5 flex gap-3 mb-12">
        <AlertCircle className="h-4 w-4 text-brand-700 mt-0.5 shrink-0" />
        <p className="text-[13px] text-ink-800 leading-relaxed">
          <strong className="font-semibold">
            Start with the product problem.
          </strong>{" "}
          The workflow is intentionally messy: deal notes, structured fields,
          disputes, and payouts do not always agree. This page is orientation
          inside the product itself.
        </p>
      </div>

      {/* Tour */}
      <h2 className="font-display text-[24px] font-medium text-ink-900 mb-4" style={{ letterSpacing: "-0.02em" }}>
        A 5-minute tour
      </h2>
      <ol className="space-y-5 text-[13.5px] text-ink-600 leading-relaxed mb-14">
        <Step n={1}>
          Open{" "}
          <Link
            href="/shows"
            className="text-brand-700 font-medium hover:text-brand-800 hover:underline"
          >
            /shows
          </Link>
          . You&apos;ll see ~540 shows across 24 months at The Crescent. Click
          into any show to see its deal terms, ticket sales, expenses, and
          settlement.
        </Step>
        <Step n={2}>
          Read the deal terms on a show detail page. Notice the gap between
          the structured fields (guarantee, percentage, expense cap) and the
          free-text <em>deal notes</em> — the prose is what Mariana actually
          trusts.
        </Step>
        <Step n={3}>
          Click the green <strong>Settle show</strong> button. For most deal
          types - Vs deals, % of net, door deals - the tool will tell you it
          isn&apos;t supported. That empty state is the product gap this demo
          focuses on.
        </Step>
        <Step n={4}>
          Try Settle on a show with a <strong>Flat</strong> badge. The tool
          actually works for those. Flat guarantees are the most common deal
          type at The Crescent (about 33% of bookings), and one of only two
          kinds the tool can settle end-to-end.
        </Step>
        <Step n={5}>
          Open{" "}
          <Link
            href="/shows/show_coastal_spell_dispute"
            className="text-brand-700 font-medium hover:text-brand-800 hover:underline"
          >
            the Coastal Spell show from March 14, 2025
          </Link>
          . That&apos;s the one referenced in{" "}
          <code className="text-[12px] bg-ink-100/80 px-1 py-0.5 rounded">
            data/dispute-thread.md
          </code>
          .
        </Step>
      </ol>

      {/* Materials */}
      <h2 className="font-display text-[24px] font-medium text-ink-900 mb-4" style={{ letterSpacing: "-0.02em" }}>
        Materials in the repo
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
        <DocLink
          icon={FileText}
          title="CEO memo"
          file="data/ceo-memo.md"
          desc="Pri's Q4 all-hands on craft vs. completeness. The strategic frame."
        />
        <DocLink
          icon={FileText}
          title="The dispute thread"
          file="data/dispute-thread.md"
          desc="The full email chain on the marketing-recoup ambiguity that cost The Crescent $720."
        />
        <DocLink
          icon={Users}
          title="User research transcripts"
          file="data/transcripts/"
          desc="Mariana, Diego (tour manager), Marcus (GM), and Sarah Kim (WME agent). Mine these."
        />
        <DocLink
          icon={FileText}
          title="README"
          file="README.md"
          desc="Quickstart, file map, tech stack, expectations."
        />
      </div>

      {/* How we evaluate */}
      <h2 className="font-display text-[24px] font-medium text-ink-900 mb-4" style={{ letterSpacing: "-0.02em" }}>
        How to think about the product slice
      </h2>
      <p className="text-[13.5px] text-ink-600 leading-relaxed">
        Settlement isn&apos;t one problem. It&apos;s several adjacent ones -
        deal modeling, audit trails, real-time prediction, the 2am
        walkthrough conversation, post-show agent communication. Pick one
        slice (or a tightly coupled pair). Take it deep. Don&apos;t try to
        fix the whole thing.
      </p>
      <p className="text-[13.5px] text-ink-600 leading-relaxed mt-3">
        This demo focuses on one slice: making settlement calculations
        explainable and surfacing records that need review. The point is not
        to fix the whole app; it is to make the riskiest workflow more
        trustworthy.
      </p>

      {/* Data skepticism hint */}
      <div className="mt-10 rounded-lg border border-ink-200/60 bg-canvas-soft p-5">
        <div className="eyebrow text-[10px] text-ink-600 mb-2">
          One note before you dive in
        </div>
        <p className="text-[13px] text-ink-600 leading-relaxed">
          Real venue data is messy. Fields drift, prose contradicts structured
          values, statuses don&apos;t always match the underlying reality, and
          patterns hide across many shows that look unremarkable in isolation.
          What the UI shows you isn&apos;t always what the data says — and
          neither is necessarily what actually happened. We&apos;d encourage
          you to read the data closely, query it directly, and bring
          skepticism to anything that seems too clean.
        </p>
      </div>

      <div className="mt-12 pt-6 border-t border-ink-200/60 flex items-center justify-between">
        <Link
          href="/shows"
          className="inline-flex items-center gap-1.5 text-[13px] text-brand-700 font-medium hover:text-brand-800 hover:underline"
        >
          Start exploring <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-[11.5px] text-ink-400">
          Welcome to The Crescent.
        </span>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="shrink-0 w-6 h-6 rounded-full bg-ink-900 text-white text-[11px] font-semibold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>{children}</div>
    </li>
  );
}

function DocLink({
  icon: Icon,
  title,
  file,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  file: string;
  desc: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-400" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <code className="text-[11px] font-mono text-ink-500 bg-canvas-soft px-2 py-0.5 rounded ring-1 ring-ink-200/60">
          {file}
        </code>
        <p className="text-[12.5px] text-ink-600 mt-2 leading-relaxed">
          {desc}
        </p>
      </CardContent>
    </Card>
  );
}
