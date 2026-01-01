import { redirect, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const heroVariants = {
  control: {
    headline: "Turn influencer gifting from a manual headache into a scalable growth engine.",
    subhead:
      "Seedform automates influencer seeding from gift claims to order tracking, right inside Shopify Admin. Launch campaigns in under 5 minutes and finally see ROI without the spreadsheet chaos.",
    primaryCta: "Start free trial",
    secondaryCta: "See Seedform vs the old way",
    supporting: "No credit card required. Install in minutes.",
    proof: [
      "Built for Shopify merchants and brand founders",
      "Draft orders plus real-time status sync",
      "Zero CSVs, fewer shipping errors, tracked ROI",
    ],
  },
  punchy: {
    headline: "Seedform turns gifting into a repeatable, trackable growth loop.",
    subhead:
      "Automate claims, draft orders, and live tracking in Shopify Admin so every seeding drop ships fast and reports clean ROI.",
    primaryCta: "Start free trial",
    secondaryCta: "Compare workflows",
    supporting: "Launch in under 5 minutes. Zero setup friction.",
    proof: [
      "Shopify-native workflow for lean teams",
      "Live status board from claim to delivery",
      "Clean data for repeatable campaigns",
    ],
  },
};

const activeHeroKey = "control";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const queryString = url.searchParams.toString();
  const shop = url.searchParams.get("shop") || "";
  const host = url.searchParams.get("host") || "";
  const ctaHref = queryString ? `/auth/login?${queryString}` : "/auth/login";

  if (shop && host) {
    try {
      await authenticate.admin(request);
      const target = queryString ? `/app?${queryString}` : "/app";
      return redirect(target);
    } catch (error) {
      if (error instanceof Response) {
        const location = error.headers.get("Location") || "";
        const isAuthRedirect = location.includes("/auth");
        if (!isAuthRedirect && error.status !== 401) {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  return { ctaHref };
};

export default function Index() {
  const { ctaHref } = useLoaderData();
  const hero = heroVariants[activeHeroKey];

  return (
    <div className="relative min-h-screen overflow-hidden bg-cream font-sans text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(17,17,17,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-10 top-20 h-40 w-40 rounded-full border-4 border-black bg-lime shadow-neo animate-float"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full border-4 border-black bg-sky shadow-neo-lg animate-float"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-10 left-1/3 h-24 w-24 rounded-full border-4 border-black bg-coral shadow-neo"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-40 border-b-4 border-black bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border-4 border-black bg-sun font-black">
              SF
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-wide">Seedform</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
                Influencer gifting OS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#comparison"
              className="hidden border-4 border-black bg-cream px-4 py-2 text-sm font-semibold shadow-neo transition-transform hover:-translate-y-0.5 md:inline-flex"
            >
              Compare workflows
            </a>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center border-4 border-black bg-lime px-5 py-2 text-sm font-black uppercase tracking-wide shadow-neo transition-transform hover:-translate-y-0.5"
            >
              Start free trial
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-8 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
              <div className="inline-flex items-center gap-2 rounded-full border-4 border-black bg-sun px-4 py-2 text-xs font-black uppercase tracking-[0.2em] shadow-neo">
                PPC-ready Shopify seeding
              </div>
              <h1 className="font-display text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
                {hero.headline}
              </h1>
              <p className="text-base font-medium md:text-lg">{hero.subhead}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={ctaHref}
                  className="inline-flex items-center justify-center border-4 border-black bg-lime px-6 py-3 text-sm font-black uppercase tracking-wide shadow-neo transition-transform hover:-translate-y-0.5"
                >
                  {hero.primaryCta}
                </a>
                <a
                  href="#comparison"
                  className="inline-flex items-center justify-center border-4 border-black bg-cream px-6 py-3 text-sm font-semibold shadow-neo transition-transform hover:-translate-y-0.5"
                >
                  {hero.secondaryCta}
                </a>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
                {hero.supporting}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {hero.proof.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border-4 border-black bg-blush px-4 py-3 text-sm font-semibold shadow-neo"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
              <div className="rounded-2xl border-4 border-black bg-cream p-6 shadow-neo-lg">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Sample campaign</p>
                  <span className="rounded-full border-4 border-black bg-lime px-3 py-1 text-xs font-black uppercase">
                    Syncing
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-black">
                  Spring Seeding Drop
                </h2>
                <p className="text-sm font-medium text-ink/70">
                  Claim, auto-draft, ship, track. All in one view.
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    {
                      title: "Claims captured",
                      detail: "Auto-verified inventory",
                    },
                    {
                      title: "Draft orders created",
                      detail: "Shipping details locked in",
                    },
                    {
                      title: "Status synced",
                      detail: "Delivered and content tracked",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between rounded-xl border-4 border-black bg-sky px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-black">{item.title}</p>
                        <p className="text-xs font-semibold text-ink/70">{item.detail}</p>
                      </div>
                      <span className="rounded-full border-4 border-black bg-cream px-3 py-1 text-xs font-black">
                        Done
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Gifts shipped", value: "48" },
                    { label: "Content posted", value: "31" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border-4 border-black bg-lime px-4 py-3"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.2em]">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-black">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                The 6 W framework
              </p>
              <h2 className="font-display text-3xl font-black md:text-4xl">
                The fastest way to explain Seedform
              </h2>
            </div>
            <p className="max-w-md text-sm font-medium text-ink/70">
              Every campaign answers the who, what, where, when, why, and how in
              a single, Shopify-native workflow.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-6">
            {[
              {
                label: "Who",
                copy: "Shopify merchants and brand founders scaling creator gifting.",
                tone: "bg-blush",
                span: "md:col-span-3",
              },
              {
                label: "What",
                copy: "Automated seeding from gift claims to order tracking.",
                tone: "bg-sky",
                span: "md:col-span-3",
              },
              {
                label: "Where",
                copy: "Runs directly inside Shopify Admin.",
                tone: "bg-lime",
                span: "md:col-span-2",
              },
              {
                label: "When",
                copy: "Launch campaigns in under 5 minutes.",
                tone: "bg-cream",
                span: "md:col-span-2",
              },
              {
                label: "Why",
                copy: "Eliminate CSVs, shipping errors, and untracked ROI.",
                tone: "bg-sun",
                span: "md:col-span-2",
              },
              {
                label: "How",
                copy: "Draft order automation plus real-time status syncing.",
                tone: "bg-coral",
                span: "md:col-span-6",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`${item.span} rounded-2xl border-4 border-black ${item.tone} p-6 shadow-neo`}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em]">{item.label}</p>
                <p className="mt-3 text-lg font-semibold">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="comparison" className="border-y-4 border-black bg-blush">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                  Seedform vs. the old way
                </p>
                <h2 className="font-display text-3xl font-black md:text-4xl">
                  Stop gifting like it is 2019
                </h2>
              </div>
              <p className="max-w-md text-sm font-medium text-ink/70">
                One system to replace spreadsheets, email threads, and blind
                shipping.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border-4 border-black bg-cream shadow-neo-lg">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-sun">
                    <tr>
                      <th className="border-b-4 border-black border-r-4 p-4 font-black uppercase tracking-wide">
                        Workflow
                      </th>
                      <th className="border-b-4 border-black border-r-4 bg-lime p-4 font-black uppercase tracking-wide">
                        Seedform
                      </th>
                      <th className="border-b-4 border-black p-4 font-black uppercase tracking-wide">
                        The old way
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        head: "Gift claims",
                        seedform: "Automated claim links with inventory checks.",
                        old: "Manual emails and creator follow-ups.",
                      },
                      {
                        head: "Order creation",
                        seedform: "Draft orders created instantly with correct data.",
                        old: "CSV uploads and copy-paste mistakes.",
                      },
                      {
                        head: "Shipping status",
                        seedform: "Live status synced to every creator.",
                        old: "No visibility until problems surface.",
                      },
                      {
                        head: "ROI tracking",
                        seedform: "Campaign-level performance in one dashboard.",
                        old: "Untracked links and scattered reports.",
                      },
                      {
                        head: "Launch speed",
                        seedform: "Campaigns live in under 5 minutes.",
                        old: "Hours of prep before anything ships.",
                      },
                    ].map((row) => (
                      <tr key={row.head}>
                        <td className="border-b-4 border-black border-r-4 p-4 font-semibold">
                          {row.head}
                        </td>
                        <td className="border-b-4 border-black border-r-4 bg-lime p-4 font-semibold">
                          {row.seedform}
                        </td>
                        <td className="border-b-4 border-black p-4 font-semibold">
                          {row.old}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/70">
                How it works
              </p>
              <h2 className="font-display text-3xl font-black md:text-4xl">
                Launch a campaign in under 5 minutes
              </h2>
            </div>
            <p className="max-w-md text-sm font-medium text-ink/70">
              Seedform keeps every step in Shopify, so your team can move fast
              without losing visibility.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create a campaign",
                detail: "Pick products, set eligibility, and generate claim links.",
                tone: "bg-cream",
              },
              {
                step: "2",
                title: "Auto-create draft orders",
                detail: "Every claim turns into a clean draft order with shipping data.",
                tone: "bg-sky",
              },
              {
                step: "3",
                title: "Track every shipment",
                detail: "Real-time status updates and ROI visibility in one view.",
                tone: "bg-lime",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`rounded-2xl border-4 border-black ${item.tone} p-6 shadow-neo`}
              >
                <p className="text-2xl font-black">{item.step}</p>
                <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-medium text-ink/70">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t-4 border-black bg-sun">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-8">
            <div>
              <h2 className="font-display text-3xl font-black md:text-4xl">
                Ready to scale influencer gifting without the chaos?
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium text-ink/70">
                Install Seedform, launch your first campaign, and watch every
                gift move from claim to conversion in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center border-4 border-black bg-cream px-6 py-3 text-sm font-black uppercase tracking-wide shadow-neo transition-transform hover:-translate-y-0.5"
              >
                Start free trial
              </a>
              <a
                href="#comparison"
                className="inline-flex items-center justify-center border-4 border-black bg-ink px-6 py-3 text-sm font-black uppercase tracking-wide text-cream shadow-neo transition-transform hover:-translate-y-0.5"
              >
                See the switch
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
