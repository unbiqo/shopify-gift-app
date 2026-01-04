import { authenticate } from "../shopify.server";

export const loader = async () => {
  return new Response(null, { status: 200 });
};

export const action = async ({ request }) => {
  try {
    await authenticate.webhook(request);
  } catch (error) {
    console.error("Webhook auth failed", error);
    return new Response(null, { status: 401 });
  }
  return new Response(null, { status: 200 });
};
