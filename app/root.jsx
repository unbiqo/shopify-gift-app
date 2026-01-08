import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import { Analytics } from "@vercel/analytics/react";
import tailwindStyles from "./styles/tailwind.css?url";

export const links = () => [{ rel: "stylesheet", href: tailwindStyles }];

export const loader = async () => {
  return {
    env: {
      VITE_GIFT_BRIDGE_URL: process.env.VITE_GIFT_BRIDGE_URL || "",
      VITE_SHOPIFY_SHOP: process.env.VITE_SHOPIFY_SHOP || "",
      VITE_SHOPIFY_ORDER_MODE: process.env.VITE_SHOPIFY_ORDER_MODE || "",
      VITE_FORCE_SHOPIFY_DRAFT: process.env.VITE_FORCE_SHOPIFY_DRAFT || "",
      VITE_SHOPIFY_API_KEY: process.env.VITE_SHOPIFY_API_KEY || "",
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
      VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY || "",
      VITE_GOOGLE_MAPS_KEY: process.env.VITE_GOOGLE_MAPS_KEY || "",
      VITE_GA_MEASUREMENT_ID: process.env.VITE_GA_MEASUREMENT_ID || "",
    },
  };
};

export default function App() {
  const { env } = useLoaderData();
  const gaMeasurementId = env.VITE_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
        {gaMeasurementId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');
`,
              }}
            />
          </>
        ) : null}
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(env)};`,
          }}
        />
        <Analytics />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
