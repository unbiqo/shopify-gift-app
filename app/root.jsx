import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
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
    },
  };
};

export default function App() {
  const { env } = useLoaderData();

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
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
