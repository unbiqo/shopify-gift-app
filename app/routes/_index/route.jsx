import { redirect } from "react-router";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const query = url.searchParams.toString();
  const shop = url.searchParams.get("shop") || "";
  const host = url.searchParams.get("host") || "";
  const embedded = url.searchParams.get("embedded") === "1";
  const standaloneMode = process.env.STANDALONE_MODE === "true";

  if (!standaloneMode && embedded && shop && host) {
    const target = query ? `/app?${query}` : "/app";
    return redirect(target);
  }

  return { shop };
};

export default function App() {
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
