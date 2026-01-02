import { useEffect, useState } from "react";
import { animate, motion } from "framer-motion";
import { redirect, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const rotatingPhrases = [
  "a 5-minute task",
  "an automated growth engine",
  "measurable ROI",
];

const longestPhrase = rotatingPhrases.reduce(
  (longest, phrase) => (phrase.length > longest.length ? phrase : longest),
  ""
);

const featureCards = [
  {
    title: "The Magic Link",
    description: "Send one link. Influencers claim, confirm, and ship without chaos.",
  },
  {
    title: "Zero Manual Entry",
    description: "Creator data flows in automatically. No copy-paste marathons.",
  },
  {
    title: "Automatic Tracking",
    description: "Claims to delivery, every status update stays in one place.",
  },
];

const hardTruthRows = [
  {
    label: "Logistics",
    old: "Manual address collection in DMs.",
    seedform: "Automated claim links in Shopify.",
  },
  {
    label: "Inventory",
    old: "Overselling products via spreadsheets.",
    seedform: "Inventory-aware claim checks.",
  },
  {
    label: "Order Creation",
    old: "Manual Sunday night copy-pasting.",
    seedform: "Instant Draft Order generation.",
  },
  {
    label: "Tracking",
    old: "Hunting carrier sites one-by-one.",
    seedform: "Live shipment sync to dashboard.",
  },
];

const embeddedStyles = `
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap");

.seed-root {
  --seed-cream: #F5F2ED;
  --seed-ink: #1A1A1A;
  --seed-orange: #FF4D00;
  --seed-line: rgba(26, 26, 26, 0.35);
  color: var(--seed-ink);
  background-color: var(--seed-cream);
  font-family: "Space Grotesk", "Helvetica Neue", Arial, sans-serif;
  background-image: linear-gradient(
      to right,
      rgba(26, 26, 26, 0.12) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      rgba(26, 26, 26, 0.12) 1px,
      transparent 1px
    );
  background-size: 72px 72px;
}

.seed-border {
  border-color: var(--seed-ink);
}

.seed-border-muted {
  border-color: var(--seed-line);
}

.seed-muted {
  color: rgba(26, 26, 26, 0.7);
}

.seed-muted-light {
  color: rgba(26, 26, 26, 0.55);
}

.seed-shadow {
  box-shadow: 6px 6px 0 var(--seed-ink);
}

.seed-shadow-sm {
  box-shadow: 4px 4px 0 var(--seed-ink);
}

.seed-shadow-lg {
  box-shadow: 8px 8px 0 var(--seed-ink);
}

.seed-surface {
  background-color: var(--seed-cream);
}

.seed-grid-surface {
  background-color: var(--seed-cream);
  background-image: linear-gradient(
      to right,
      rgba(26, 26, 26, 0.12) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      rgba(26, 26, 26, 0.12) 1px,
      transparent 1px
    );
  background-size: 72px 72px;
}

.seed-ink-surface {
  background-color: var(--seed-ink);
  color: var(--seed-cream);
}

.seed-orange-surface {
  background-color: var(--seed-orange);
  color: var(--seed-cream);
}

.seed-orange-text {
  color: var(--seed-orange);
}

.seed-ink-text {
  color: var(--seed-ink);
}

.seed-white-surface {
  background-color: #ffffff;
  color: var(--seed-ink);
}

.seed-sf-icon {
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid var(--seed-ink);
  background-color: var(--seed-cream);
  color: var(--seed-ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.seed-video-frame {
  border: 4px solid var(--seed-orange);
  box-shadow: 8px 8px 0 var(--seed-ink);
}

.seed-bullet {
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--seed-ink);
  display: inline-block;
}

.seed-bullet-solid {
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--seed-ink);
  background-color: var(--seed-orange);
  display: inline-block;
}
`;

const assembleSection = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut", staggerChildren: 0.12 },
  },
};

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const queryString = url.searchParams.toString();
  const appStoreUrl = process.env.SHOPIFY_APP_STORE_URL || "";
  const ctaHref =
    appStoreUrl || (queryString ? `/auth/login?${queryString}` : "/auth/login");
  const isShopifyAdminContext =
    url.searchParams.has("host") ||
    url.searchParams.get("embedded") === "1" ||
    url.searchParams.has("shop");

  // If this request is coming from Shopify Admin (embedded), bypass the marketing page
  // and send the user into the embedded app flow.
  if (isShopifyAdminContext) {
    const targetSearch = queryString ? `?${queryString}` : "";
    return redirect(`/app${targetSearch}`);
  }

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
  const accentColor = "var(--seed-orange)";
  const demoVideoSrc = "https://www.youtube.com/embed/VIDEO_ID";

  useEffect(() => {
    let isCancelled = false;
    let typeControls;
    let eraseControls;
    const phrase = rotatingPhrases[phraseIndex];
    const typeDuration = Math.max(phrase.length * 0.06, 0.6);
    const eraseDuration = Math.max(phrase.length * 0.035, 0.35);
    const revealFromLeft = (count) => {
      const nextLength = Math.round(count);
      setTypedText(phrase.slice(0, nextLength));
    };

    const runAnimation = async () => {
      setTypedText("");
      typeControls = animate(0, phrase.length, {
        duration: typeDuration,
        ease: "linear",
        onUpdate: (latest) => {
          if (!isCancelled) {
            revealFromLeft(latest);
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
            revealFromLeft(latest);
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
    if (typeof window === "undefined") return;
    const target = document.getElementById("calculator");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="seed-root min-h-screen antialiased">
      <style>{embeddedStyles}</style>
      <header
        className="sticky top-0 z-40 border-b border-solid seed-border-muted backdrop-blur"
        style={{ backgroundColor: "rgba(245, 242, 237, 0.95)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="seed-orange-surface flex h-12 w-12 items-center justify-center border-4 border-solid seed-border text-sm font-black">
              SF
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-wide">Seedform</p>
              <p className="seed-muted text-xs font-semibold uppercase tracking-[0.2em]">
                Influencer gifting OS
              </p>
            </div>
          </div>
          <a
            href={ctaHref}
            className="seed-orange-surface seed-shadow inline-flex items-center justify-center border-4 border-solid seed-border px-5 py-2 text-sm font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5"
          >
            Start Free Trial
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl border-l border-r border-solid seed-border-muted px-4 pb-20 pt-12 md:px-8 lg:pt-16">
        <section className="relative border-t border-solid seed-border-muted py-10 lg:py-16">
          <div
            aria-hidden="true"
            className="seed-orange-surface pointer-events-none absolute -right-6 top-10 h-16 w-16"
          />
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <div className="seed-surface seed-shadow-sm inline-flex w-fit items-center border-2 border-solid seed-border px-3 py-1 text-xs font-black uppercase tracking-[0.25em]">
              Influencer Gifting OS
            </div>
            <h1 className="text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
              Stop Wasting Your Life on Manual Influencer Gifting.
            </h1>
            <p className="text-base font-medium leading-relaxed md:text-lg">
              Seedform turns hours of manual work into{" "}
              <span className="relative inline-flex align-baseline">
                <span className="invisible" aria-hidden="true">
                  {longestPhrase}
                </span>
                <motion.span
                  key={phraseIndex}
                  className="absolute inset-0 flex items-center justify-start whitespace-nowrap text-left"
                  initial={{ x: 16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <span className="seed-orange-text font-semibold">
                    {typedText}
                  </span>
                  <motion.span
                    aria-hidden="true"
                    className="ml-0.5 inline-block h-[1em] w-[2px] align-middle"
                    style={{ backgroundColor: accentColor }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.span>
              </span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={ctaHref}
                className="seed-orange-surface seed-shadow inline-flex items-center justify-center border-4 border-solid seed-border px-6 py-3 text-sm font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5"
              >
                Start Free Trial
              </a>
              <button
                type="button"
                onClick={handleScrollToCalculator}
                className="seed-surface seed-shadow-sm inline-flex items-center justify-center border-2 border-solid seed-border px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-transform hover:-translate-y-0.5"
              >
                Calculate ROI
              </button>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <div className="seed-video-frame seed-surface w-full max-w-3xl">
              <div className="seed-ink-surface relative aspect-video">
                <div className="seed-surface seed-ink-text absolute left-4 top-4 z-10 border-2 border-solid seed-border px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">
                  1:00 Demo Video
                </div>
                <iframe
                  src={demoVideoSrc}
                  title="Seedform demo video"
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="seed-surface border-t border-solid seed-border px-5 py-4 text-sm font-semibold">
                Claims, draft orders, and live status sync in one minute.
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {featureCards.map((card) => (
              <div
                key={card.title}
                className="seed-surface seed-shadow flex h-full flex-col gap-4 border-2 border-solid seed-border p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black">{card.title}</h3>
                  <span
                    aria-hidden="true"
                    className="seed-orange-surface h-3 w-3 border-2 border-solid seed-border"
                  />
                </div>
                <p className="text-sm font-semibold leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <motion.section
          id="calculator"
          className="mt-16 scroll-mt-[120px] border-t border-solid seed-border-muted pt-16"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={assembleSection}
        >
          <div className="seed-surface seed-shadow border-4 border-solid seed-border p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="seed-muted text-xs font-black uppercase tracking-[0.2em]">
                  ROI speed calculator
                </p>
                <h2 className="text-3xl font-black md:text-4xl">
                  See exactly how much time your current process is bleeding.
                </h2>
                <p className="seed-muted mt-3 max-w-xl text-sm font-medium">
                  Slide the count to reveal the monthly hours saved.
                </p>
              </div>
              <div className="seed-surface seed-shadow-sm border-2 border-solid seed-border px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Monthly hours saved
                </p>
                <p className="seed-orange-text mt-2 text-4xl font-black">
                  {formatHours(savedHours)} hrs
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <label
                    htmlFor="influencer-count"
                    className="uppercase tracking-[0.2em]"
                  >
                    Number of influencers
                  </label>
                  <output className="seed-surface border-4 border-solid seed-border px-3 py-1 text-lg font-black">
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
                  className="h-3 w-full cursor-pointer"
                  style={{ accentColor: "var(--seed-orange)" }}
                />
                <div className="seed-muted flex justify-between text-xs font-semibold uppercase tracking-[0.2em]">
                  <span>10</span>
                  <span>250</span>
                  <span>500</span>
                </div>
                <p className="seed-muted text-sm font-medium">
                  Manual gifting scales linearly. Automation does not.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="seed-surface border-4 border-solid seed-border p-4">
                  <p className="seed-muted text-xs font-black uppercase tracking-[0.2em]">
                    The old way
                  </p>
                  <p className="mt-3 text-3xl font-black">
                    {formatHours(oldHours)} hrs
                  </p>
                  <p className="seed-muted text-sm font-semibold">
                    Manual emails, CSV cleanup, blind shipping.
                  </p>
                </div>
                <div className="seed-surface border-4 border-solid seed-border p-4">
                  <p className="seed-muted text-xs font-black uppercase tracking-[0.2em]">
                    Seedform
                  </p>
                  <p className="seed-orange-text mt-3 text-3xl font-black">
                    {formatHours(seedformHours)} hrs
                  </p>
                  <p className="seed-muted text-sm font-semibold">
                    Automated claims, live status sync, tracked ROI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mt-16 border-t border-solid seed-border-muted pt-16"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={assembleSection}
        >
          <div className="seed-surface seed-shadow border-4 border-solid seed-border">
            <div className="border-b border-solid seed-border px-6 py-6 md:px-8">
              <p className="seed-muted text-xs font-black uppercase tracking-[0.2em]">
                Hard truth
              </p>
              <h2 className="text-3xl font-black md:text-4xl">
                The Hard Truth: Your old way is a liability.
              </h2>
            </div>
            <div className="border-b border-solid seed-border">
              <div className="grid md:grid-cols-[1.2fr_2fr_2fr]">
                <div
                  aria-hidden="true"
                  className="seed-grid-surface hidden px-5 py-3 md:block md:border-r md:border-solid seed-border"
                />
                <div className="seed-orange-surface border-solid seed-border px-5 py-3 text-xs font-black uppercase tracking-[0.2em]">
                  Seedform - Modern Standard
                </div>
                <div className="seed-surface seed-muted border-b border-solid seed-border px-5 py-3 text-xs font-black uppercase tracking-[0.2em] md:border-b-0 md:border-l">
                  The Old Way
                </div>
              </div>
            </div>
            <div className="border-t border-solid seed-border">
              {/* Mobile: separate tables for clarity */}
              <div className="md:hidden">
                <div className="border-b border-solid seed-border">
                  <div className="seed-orange-surface border-b border-solid seed-border px-5 py-3 text-xs font-black uppercase tracking-[0.2em]">
                    Seedform - Modern Standard
                  </div>
                  {hardTruthRows.map((row) => (
                    <div
                      key={`seedform-${row.label}`}
                      className="grid grid-cols-[1fr] border-t border-solid seed-border"
                    >
                      <div className="seed-grid-surface border-b border-solid seed-border px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em]">
                        {row.label}
                      </div>
                      <div className="seed-surface seed-ink-text px-5 py-4">
                        <div className="flex items-start gap-3 text-sm font-semibold">
                          <span className="seed-sf-icon mt-1" aria-hidden="true">
                            SF
                          </span>
                          <p>{row.seedform}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-solid seed-border">
                  <div className="seed-surface seed-muted border-b border-solid seed-border px-5 py-3 text-xs font-black uppercase tracking-[0.2em]">
                    The Old Way
                  </div>
                  {hardTruthRows.map((row) => (
                    <div
                      key={`old-${row.label}`}
                      className="grid grid-cols-[1fr] border-t border-solid seed-border"
                    >
                      <div className="seed-grid-surface border-b border-solid seed-border px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em]">
                        {row.label}
                      </div>
                      <div className="seed-surface px-5 py-4">
                        <div className="flex items-start gap-3 text-sm font-semibold">
                          <span className="seed-bullet mt-1.5" aria-hidden="true" />
                          <p>{row.old}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop grid stays unchanged */}
              <div className="hidden md:block">
                {hardTruthRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid gap-0 border-t border-solid seed-border first:border-t-0 md:grid-cols-[1.2fr_2fr_2fr]"
                  >
                    <div className="seed-grid-surface border-b border-solid seed-border px-5 py-4 text-xs font-black uppercase tracking-[0.2em] md:border-b-0 md:border-r">
                      {row.label}
                    </div>
                    <div className="seed-surface seed-ink-text border-b border-solid seed-border px-5 py-4 md:border-b-0">
                      <div className="flex items-start gap-3 text-sm font-semibold">
                        <span className="seed-sf-icon mt-1" aria-hidden="true">
                          SF
                        </span>
                        <p>{row.seedform}</p>
                      </div>
                    </div>
                    <div className="seed-surface border-b border-solid seed-border px-5 py-4 md:border-b-0 md:border-l">
                      <div className="flex items-start gap-3 text-sm font-semibold">
                        <span className="seed-bullet mt-1.5" aria-hidden="true" />
                        <p>{row.old}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <a
              href={ctaHref}
              className="seed-orange-surface seed-shadow inline-flex w-full max-w-3xl items-center justify-center border-4 border-solid seed-border px-8 py-5 text-lg font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5"
            >
              Start Free
            </a>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
