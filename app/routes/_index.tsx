import { useState } from "react";
import { redirect, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const slackMessages = [
  {
    name: "Mark (Marketing)",
    time: "9:12 AM",
    avatar: "M",
    text: "Hey team, who has the updated address for @FashionistaJane? Her package bounced again.",
  },
  {
    name: "Emily (Ops)",
    time: "9:14 AM",
    avatar: "E",
    text: "Checking spreadsheet... wait, someone deleted the 'Addresses' tab! \u{1F633}",
  },
  {
    name: "Mark (Marketing)",
    time: "9:15 AM",
    avatar: "M",
    text: "Are you kidding me? We need to ship 20 gifts today. This is madness.",
  },
  {
    name: "Emily (Ops)",
    time: "9:17 AM",
    avatar: "E",
    text: "Digging through DMs now. This is going to take hours. \u{1FAE0}",
  },
];

const differentiationItems = [
  "Built for teams who value speed over complex features.",
  "Built for teams who want Shopify as the single source of truth.",
  "Built for teams who hate manual data entry.",
  "Built for teams who need a 1-click install, not a week-long code solution.",
];

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
  const [giftsPerMonth, setGiftsPerMonth] = useState(50);
  const [hourlyRate, setHourlyRate] = useState(45);

  const hoursSaved = Math.max(Math.round(giftsPerMonth * 2.5), 0);
  const reclaimed = Math.max(Math.round(hoursSaved * hourlyRate), 0);
  const formatNumber = (value) => value.toLocaleString("en-US");

  return (
    <div
      className="relative min-h-screen bg-white text-black antialiased"
      style={{
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#FF4F00]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/5 blur-3xl" />
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 md:px-8">
        <section
          className="animate-fade-up py-12 md:py-16"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex flex-col items-start text-left md:items-center md:text-center">
            <h1 className="text-5xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Stop paying marketing salaries for copy-pasting addresses.
            </h1>
            <p className="mt-4 max-w-3xl text-lg font-medium text-black">
              Manual gifting ops is burning your cash. Automate it inside Shopify.
            </p>
          </div>

          <div className="mt-8">
            <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-8 text-left shadow-xl md:text-center">
              <h2 className="mb-6 text-xl font-bold">
                Gifting ROI Calculator: Calculate Your Reclaimed Time & Cash
              </h2>

              <div className="grid gap-6 md:grid-cols-2 md:text-left">
                <label className="text-left text-sm font-semibold">
                  <span className="mb-2 block">Gifts per month</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="50"
                    value={giftsPerMonth}
                    onChange={(event) =>
                      setGiftsPerMonth(Number(event.target.value) || 0)
                    }
                    className="w-full rounded-md border border-black px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF4F00]"
                  />
                </label>
                <label className="text-left text-sm font-semibold">
                  <span className="mb-2 block">Team hourly rate ($)</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="45"
                    value={hourlyRate}
                    onChange={(event) =>
                      setHourlyRate(Number(event.target.value) || 0)
                    }
                    className="w-full rounded-md border border-black px-3 py-2 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF4F00]"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-[#FF4F00] p-6 text-left text-black md:text-center">
                  <div className="inline-block rounded-md border border-black/20 bg-black/10 px-4 py-3 text-6xl font-black font-mono leading-none tracking-[0.08em] shadow-[inset_0_-6px_0_rgba(0,0,0,0.2)] md:text-7xl">
                    {formatNumber(hoursSaved)}
                  </div>
                  <p className="mt-2 text-base font-semibold">Hours Saved</p>
                  <p className="text-sm">per month</p>
                </div>
                <div className="rounded-lg bg-[#FF4F00] p-6 text-left text-black md:text-center">
                  <div className="inline-block rounded-md border border-black/20 bg-black/10 px-4 py-3 text-6xl font-black font-mono leading-none tracking-[0.08em] shadow-[inset_0_-6px_0_rgba(0,0,0,0.2)] md:text-7xl">
                    ${formatNumber(reclaimed)}
                  </div>
                  <p className="mt-2 text-base font-semibold">Reclaimed</p>
                  <p className="text-sm">per month</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="animate-fade-up py-12 md:py-16"
          style={{ animationDelay: "150ms" }}
        >
          <h2 className="mb-8 text-center text-3xl font-black tracking-tight">
            Chaos vs. Control
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4 text-left md:text-center">
              <h3 className="text-xl font-semibold">
                Manual Madness (Spreadsheet Hell)
              </h3>
              <div className="relative overflow-hidden rounded-xl border border-black/20 bg-white shadow-lg">
                <img
                  src="/image_0.png"
                  alt="Spreadsheet with manual gifting chaos"
                  className="h-64 w-full object-cover blur-sm md:h-72"
                />
                <div className="absolute bottom-4 right-4 text-[72px] font-black leading-none text-red-600 md:text-[88px]">
                  X
                </div>
              </div>
            </div>
            <div className="space-y-4 text-left md:text-center">
              <h3 className="text-xl font-semibold">
                Automated Control (Shopify Sync)
              </h3>
              <div className="relative overflow-hidden rounded-xl border border-black/20 bg-white shadow-lg">
                <img
                  src="/image_0.png"
                  alt="Shopify automation interface"
                  className="h-64 w-full object-cover md:h-72"
                />
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="absolute bottom-4 right-4 h-16 w-16 text-[#FF4F00] md:h-20 md:w-20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section
          className="animate-fade-up py-12 md:py-16"
          style={{ animationDelay: "300ms" }}
        >
          <h2 className="mb-8 text-center text-2xl font-black tracking-tight">
            Vignette: Monday 9:12 AM: The Manual Gifting Nightmare
          </h2>
          <div className="mx-auto max-w-2xl rounded-lg bg-[#4A154B] p-6 text-white">
            <div className="flex items-center gap-2 border-b border-white/20 pb-3 text-sm font-semibold">
              <span className="text-white/70">#</span>
              <span>influencer-ops</span>
            </div>
            <div className="mt-4 space-y-4 text-left">
              {slackMessages.map((message, index) => (
                <div key={`${message.name}-${index}`} className="flex gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                    {message.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span>{message.name}</span>
                      <span className="text-xs text-white/60">{message.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/90">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="animate-fade-up py-12 md:py-16"
          style={{ animationDelay: "450ms" }}
        >
          <h2 className="mb-8 text-center text-2xl font-black tracking-tight">
            Differentiation Block: Why us vs. The Others
          </h2>
          <ul className="mx-auto max-w-xl list-disc list-inside space-y-4 text-left marker:text-[#FF4F00] md:text-center">
            {differentiationItems.map((item) => (
              <li key={item} className="text-base font-medium">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="animate-fade-up py-12 md:py-16"
          style={{ animationDelay: "600ms" }}
        >
          <div className="mx-auto max-w-3xl text-left md:text-center">
            <a
              href={ctaHref}
              className="block w-full rounded-lg bg-[#FF4F00] py-4 text-center text-xl font-bold text-white transition-colors hover:bg-[#E64500]"
            >
              See your time savings
            </a>
            <p className="mt-2 text-left text-sm md:text-center">
              Start your 14-day free trial. No credit card required.
            </p>
            <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-gray-200 pt-8 md:flex-row md:items-center">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-black text-xs font-bold">
                  S
                </div>
                <span>shopify app store</span>
              </div>
              <div className="flex flex-wrap items-center justify-start gap-4 text-sm font-medium md:justify-end">
                <a href="#" className="transition-colors hover:text-[#FF4F00]">
                  Features
                </a>
                <a href="#" className="transition-colors hover:text-[#FF4F00]">
                  Pricing
                </a>
                <a href="#" className="transition-colors hover:text-[#FF4F00]">
                  Support
                </a>
                <a
                  href="/privacy"
                  className="transition-colors hover:text-[#FF4F00]"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
