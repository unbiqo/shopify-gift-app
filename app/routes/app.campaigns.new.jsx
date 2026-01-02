import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import SeedformApp from "../gifty/App.jsx";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function CampaignsNew() {
  return <SeedformApp />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
