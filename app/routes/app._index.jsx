import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import GiftyApp from "../gifty/App.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndex() {
  return <GiftyApp />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
