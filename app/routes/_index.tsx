import { useEffect, useState } from "react";
import { animate, motion } from "framer-motion";
import { redirect, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const rotatingPhrases = [
  "a repeatable growth engine",
  "a 5-minute workflow",
  "measurable, tracked ROI",
];
const accentColors = ["#CCFF00", "#FF9F1C", "#4CC9F0", "#F472B6"];
const longestPhrase = rotatingPhrases.reduce(
  (longest, phrase) => (phrase.length > longest.length ? phrase : longest),
  ""
);

const heroSubhead =
  "Launch campaigns in under 5 minutes with claim links, draft orders, and live tracking inside Shopify Admin. No spreadsheets, no shipping errors, no blind ROI.";

const featureCards = [
  {
    title: "Native Shopify Power",
    description: "Runs inside Shopify Admin so your team never leaves the dashboard.",
    detail: "Launch, track, and optimize campaigns with Shopify-native context.",
  },
  {
    title: "Zero-Error Claims",
    description: "Inventory-aware claim links lock in accurate quantities.",
    detail: "No overselling, no mismatched sizes, no manual fixes.",
  },
  {
    title: "Full-Cycle Tracking",
    description: "Claims to conversion tracked in one live status board.",
    detail: "See shipments, posts, and ROI without hunting for data.",
  },
];

const comparisonRows = [
  {
    label: "Gift claims",
    seedform: "Automated claim links with inventory checks.",
    old: "Manual emails and creator follow-ups.",
  },
  {
    label: "Order creation",
    seedform: "Draft orders created instantly with correct data.",
    old: "CSV uploads and copy-paste mistakes.",
  },
  {
    label: "Shipping status",
    seedform: "Live status synced to every creator.",
    old: "No visibility until problems surface.",
  },
  {
    label: "ROI tracking",
    seedform: "Campaign-level performance in one dashboard.",
    old: "Untracked links and scattered reports.",
  },
  {
    label: "Launch speed",
    seedform: "Campaigns live in under 5 minutes.",
    old: "Hours of prep before anything ships.",
  },
];

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
  viewport: { once: true, amount: 0.3 },
};

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const queryString = url.searchParams.toString();
  const ctaHref = queryString ? `/auth/login?${queryString}` : "/auth/login";

  try {
    const { sessionToken } = await authenticate.public.checkout(request);
    if (sessionToken?.dest) {
      const target = queryString ? `/app?${queryString}` : "/app";
      return redirect(target);
    }
  } catch (error) {
    if (error instanceof Response) {
      if (error.status !== 401) {
        throw error;
      }
    } else {
      throw error;
    }
  }

  return { ctaHref };
};

export default function Index() {
  const { ctaHref } = useLoaderData();
  const [influencers, setInfluencers] = useState(120);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const accentColor = accentColors[phraseIndex % accentColors.length];

  useEffect(() => {
    let isCancelled = false;
    let typeControls;
    let eraseControls;
    const phrase = rotatingPhrases[phraseIndex];
    const typeDuration = Math.max(phrase.length * 0.06, 0.6);
    const eraseDuration = Math.max(phrase.length * 0.035, 0.35);

    const runAnimation = async () => {
      setTypedText("");
      typeControls = animate(0, phrase.length, {
        duration: typeDuration,
        ease: "linear",
        onUpdate: (latest) => {
          if (!isCancelled) {
            setTypedText(phrase.slice(0, Math.round(latest)));
          }
        },
      });
      await typeControls.finished;
      if (isCancelled) return;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      eraseControls = animate(phrase.length, 0, {
        duration: eraseDuration,
        ease: "linear",
        onUpdate: (latest) => {
          if (!isCancelled) {
            setTypedText(phrase.slice(0, Math.round(latest)));
          }
        },
      });
      await eraseControls.finished;
      if (isCancelled) return;
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPhraseIndex((prev) => (prev + 1) % rotatingPhrases.length);
    };

    runAnimation();

    return () => {
      isCancelled = true;
      typeControls?.stop();
      eraseControls?.stop();
    };
  }, [phraseIndex]);

  const oldHours = 4 + influencers * 0.4;
  const seedformHours = 1 + influencers * 0.08;
  const savedHours = Math.max(oldHours - seedformHours, 0);
  const formatHours = (value) => value.toFixed(1);

  const handleScrollToCalculator = () => {
    if (typeof document === "undefined") return;
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="min-h-screen bg-cream font-sans text-ink"
      style={{
        "--seed-ink": "8 8 8",
        "--seed-cream": "249 249 249",
        "--seed-lime": "204 255 0",
      }}
    >
      <header className="sticky top-0 z-40 border-b-4 border-ink bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border-4 border-ink bg-lime text-sm font-black">
              SF
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-wide">Seedform</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
                Influencer gifting OS
              </p>
            </div>
          </div>
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center border-4 border-ink bg-lime px-5 py-2 text-sm font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] transition-transform hover:-translate-y-0.5"
          >
            Start free trial
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-14 md:px-8 lg:pt-20">
        <section className="flex flex-col gap-10 py-8 md:py-12 lg:flex-row lg:items-center lg:py-16">
          <div className="order-2 space-y-6 lg:order-1 lg:max-w-xl">
            <h1 className="font-display text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
              <span>Seedform turns influencer gifting into </span>
              <span className="relative inline-block align-baseline">
                <span className="invisible inline-block">{longestPhrase}</span>
                <span className="absolute inset-0 whitespace-nowrap" style={{ color: accentColor }}>
                  <span>{typedText}</span>
                  <motion.span
                    aria-hidden="true"
                    className="ml-1 inline-block h-[1em] w-[2px] align-middle"
                    style={{ backgroundColor: accentColor }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </span>
              </span>
            </h1>
            <p className="text-base font-medium md:text-lg">{heroSubhead}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border-4 border-ink bg-lime px-6 py-3 text-sm font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] transition-transform hover:-translate-y-0.5"
              >
                Start free trial
              </a>
              <button
                type="button"
                onClick={handleScrollToCalculator}
                className="inline-flex items-center justify-center border-4 border-ink bg-cream px-6 py-3 text-sm font-semibold shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] transition-transform hover:-translate-y-0.5"
              >
                Calculate ROI speed
              </button>
            </div>
          </div>

          <div className="order-1 w-full lg:order-2 lg:max-w-xl">
            <div className="border-4 border-ink bg-cream shadow-[8px_8px_0px_0px_rgba(8,8,8,1)]">
              <div className="relative aspect-video bg-ink text-cream">
                <div className="absolute left-4 top-4 border-4 border-ink bg-cream px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-ink">
                  1:00 silent demo
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-ink bg-lime text-ink">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-8 w-8 fill-current"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-[0.2em]">
                      Demo video placeholder
                    </p>
                    <p className="text-xs font-semibold text-cream/70">
                      Replace with your silent 60s walkthrough.
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t-4 border-ink bg-cream px-5 py-4 text-sm font-semibold">
                Seedform campaign dashboard: claims, draft orders, and shipment status
                in one view.
              </div>
            </div>
          </div>
        </section>

        <section
          id="calculator"
          className="mt-16 scroll-mt-[100px] border-4 border-ink bg-cream p-6 shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] md:p-8"
        >
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                ROI speed calculator
              </p>
              <h2 className="font-display text-3xl font-black md:text-4xl">
                Calculate your time saved
              </h2>
            </div>
            <div className="border-4 border-ink bg-lime px-4 py-2 text-sm font-black uppercase tracking-[0.2em]">
              Seedform saves you {formatHours(savedHours)} hours per month
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label htmlFor="influencer-count" className="uppercase tracking-[0.2em]">
                  Number of influencers
                </label>
                <output className="border-4 border-ink bg-cream px-3 py-1 text-lg font-black">
                  {influencers}
                </output>
              </div>
              <input
                id="influencer-count"
                type="range"
                min="10"
                max="500"
                step="10"
                value={influencers}
                onChange={(event) => setInfluencers(Number(event.target.value))}
                className="h-3 w-full cursor-pointer accent-lime"
              />
              <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.2em] text-ink/60">
                <span>10</span>
                <span>250</span>
                <span>500</span>
              </div>
              <p className="text-sm font-medium text-ink/70">
                Drag the slider to see how many manual hours disappear when Seedform
                automates claims, draft orders, and shipping updates.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="border-4 border-ink bg-cream p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                  The old way
                </p>
                <p className="mt-3 text-3xl font-black">
                  {formatHours(oldHours)} hrs
                </p>
                <p className="text-sm font-semibold text-ink/70">
                  Email threads, CSV cleanup, and manual follow-ups.
                </p>
              </div>
              <div className="border-4 border-ink bg-lime p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                  Seedform
                </p>
                <p className="mt-3 text-3xl font-black">
                  {formatHours(seedformHours)} hrs
                </p>
                <p className="text-sm font-semibold text-ink/70">
                  Automated claims, draft orders, and live status sync.
                </p>
              </div>
            </div>
          </div>
        </section>

        <motion.section className="mt-16" {...fadeIn}>
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                Simplified power
              </p>
              <h2 className="font-display text-3xl font-black md:text-4xl">
                The three blocks every gifting team needs
              </h2>
            </div>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center border-4 border-ink bg-lime px-5 py-2 text-sm font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] transition-transform hover:-translate-y-0.5"
            >
              Start free trial
            </a>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="flex h-full flex-col gap-4 border-4 border-ink bg-cream p-6 shadow-[6px_6px_0px_0px_rgba(8,8,8,1)]"
              >
                <h3 className="text-xl font-black">{card.title}</h3>
                <p className="text-sm font-semibold">{card.description}</p>
                <p className="text-sm font-medium text-ink/70">{card.detail}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="mt-16 border-4 border-ink bg-cream shadow-[6px_6px_0px_0px_rgba(8,8,8,1)]"
          {...fadeIn}
        >
          <div className="border-b-4 border-ink px-6 py-6 md:px-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
              Seedform vs. the old way
            </p>
            <h2 className="font-display text-3xl font-black md:text-4xl">
              High-contrast comparison
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b-4 border-ink border-r-4 p-4 font-black uppercase tracking-wide">
                    Workflow
                  </th>
                  <th className="border-b-4 border-ink border-r-4 bg-lime p-4 font-black uppercase tracking-wide">
                    Seedform
                  </th>
                  <th className="border-b-4 border-ink p-4 font-black uppercase tracking-wide">
                    The old way
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="border-b-4 border-ink border-r-4 p-4 font-semibold">
                      {row.label}
                    </td>
                    <td className="border-b-4 border-ink border-r-4 bg-lime p-4 font-semibold">
                      {row.seedform}
                    </td>
                    <td className="border-b-4 border-ink p-4 font-semibold">
                      {row.old}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <section className="mt-16 border-4 border-ink bg-lime p-8 text-ink shadow-[6px_6px_0px_0px_rgba(8,8,8,1)]">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-3xl font-black md:text-4xl">
                Ready to make every gift measurable?
              </h2>
              <p className="mt-3 max-w-xl text-sm font-semibold text-ink/80">
                Install Seedform, launch your next campaign in minutes, and give your
                team a live view of every claim and shipment.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border-4 border-ink bg-cream px-6 py-3 text-sm font-black uppercase tracking-wide shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] transition-transform hover:-translate-y-0.5"
              >
                Start free trial
              </a>
              <button
                type="button"
                onClick={handleScrollToCalculator}
                className="inline-flex items-center justify-center border-4 border-ink bg-ink px-6 py-3 text-sm font-black uppercase tracking-wide text-cream shadow-[6px_6px_0px_0px_rgba(8,8,8,1)] transition-transform hover:-translate-y-0.5"
              >
                Recalculate savings
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
