import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    const errors = loginErrorMessage(await login(request));
    return { errors, auto: true };
  }
  return { errors: { shop: "Open this page from your Shopify Admin to connect." }, auto: false };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const { errors, auto } = loaderData || {};

  return (
    <AppProvider embedded={false}>
      <s-page>
        <s-section heading="Connect your Shopify store">
          <s-text>
            {auto
              ? "Redirecting to Shopify..."
              : "Open Seedform from your Shopify Admin or the App Store to connect your store."}
          </s-text>
          {errors?.shop && <s-text tone="critical">{errors.shop}</s-text>}
        </s-section>
      </s-page>
    </AppProvider>
  );
}
