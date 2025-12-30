import { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const query = url.searchParams.toString();
  const shop = url.searchParams.get("shop") || "";

  return { shop, query };
};

export default function App() {
  const { shop, query } = useLoaderData();
  const [redirectFailed, setRedirectFailed] = useState(false);
  const authUrl = useMemo(() => {
    if (!query) return "/auth";
    return `/auth?${query}`;
  }, [query]);

  useEffect(() => {
    if (!shop) return;
    try {
      if (window.top) {
        window.top.location.assign(authUrl);
      } else {
        window.location.assign(authUrl);
      }
    } catch (error) {
      console.warn("Top-level redirect blocked:", error);
      setRedirectFailed(true);
    }
  }, [shop, authUrl]);

  if (shop) {
    return (
      <div className={styles.index}>
        <div className={styles.content}>
          <h1 className={styles.heading}>Connecting your store</h1>
          <p className={styles.text}>
            Redirecting you to Shopify Admin to finish installation...
          </p>
          {redirectFailed && (
            <div className={styles.list}>
              <strong>Continue:</strong>{" "}
              <a href={authUrl} target="_top" rel="noreferrer">
                Open in Shopify Admin
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Gifty for Shopify</h1>
        <p className={styles.text}>
          Install Gifty from the Shopify App Store to start sending gifts.
        </p>
        <div className={styles.list}>
          <strong>Next step:</strong> Open the app from your Shopify Admin to connect your store.
        </div>
        <ul className={styles.list}>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
          <li>
            <strong>Product feature</strong>. Some detail about your feature and
            its benefit to your customer.
          </li>
        </ul>
      </div>
    </div>
  );
}
