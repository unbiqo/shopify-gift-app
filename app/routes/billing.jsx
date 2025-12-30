import { data as json, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { PLAN_KEYS, normalizePlan } from "../gifty/lib/plans";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const rawPlan = url.searchParams.get("plan");
  const plan = normalizePlan(rawPlan);

  if (plan === PLAN_KEYS.FREE) {
    return redirect("/app");
  }

  const returnUrl = `${url.origin}/app`;
  await billing.request({
    plan,
    returnUrl,
    isTest: process.env.SHOPIFY_BILLING_TEST === "true",
  });

  return json({ ok: true });
};
