import { data as json } from "react-router";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    if (!session) {
      return json(
        { error: "Missing Shopify session." },
        { status: 401 },
      );
    }
    const result = await registerWebhooks({ session });
    return json({ ok: true, result });
  } catch (error) {
    return json(
      {
        error: "Failed to register webhooks.",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
};
