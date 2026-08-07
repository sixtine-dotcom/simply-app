import { db } from "@/lib/db";

export const FEATURE_CATALOG = [
  {
    key: "custom_domain",
    label: "Custom domains",
    description: "Eigen domein koppelen met automatische SSL.",
    plans: ["PRO", "ENTERPRISE"] as const,
  },
  {
    key: "hide_powered_by",
    label: "Hide powered by",
    description: "Verberg de powered-by badge in login en app.",
    plans: ["PRO", "ENTERPRISE"] as const,
  },
  {
    key: "custom_css",
    label: "Custom CSS",
    description: "Eigen CSS overrides voor volledige visuele controle.",
    plans: ["ENTERPRISE"] as const,
  },
  {
    key: "email_marketing",
    label: "Email marketing",
    description: "Broadcasts en geautomatiseerde mailflows.",
    plans: ["PRO", "ENTERPRISE"] as const,
  },
  {
    key: "affiliate_system",
    label: "Affiliate system",
    description: "Affiliate referrals en commissies.",
    plans: ["PRO", "ENTERPRISE"] as const,
  },
  {
    key: "api_access",
    label: "API access",
    description: "Publieke API en webhooks.",
    plans: ["ENTERPRISE"] as const,
  },
] as const;

export type FeatureKey = (typeof FEATURE_CATALOG)[number]["key"];
type PlanTier = "STARTER" | "PRO" | "ENTERPRISE";

export type ResolvedFeatureFlag = {
  key: FeatureKey;
  label: string;
  description: string;
  includedByPlan: boolean;
  overridden: boolean;
  enabled: boolean;
};

export function getPlanIncludedFeatures(plan: PlanTier) {
  return new Set(
    FEATURE_CATALOG.filter((feature) =>
      feature.plans.some((allowedPlan) => allowedPlan === plan)
    ).map(
      (feature) => feature.key
    )
  );
}

export async function resolveTenantFeatureFlags(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      featureFlags: {
        select: {
          key: true,
          isEnabled: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const included = getPlanIncludedFeatures(tenant.plan);
  const overrides = new Map(
    tenant.featureFlags.map((flag) => [flag.key, flag.isEnabled])
  );

  const features: ResolvedFeatureFlag[] = FEATURE_CATALOG.map((feature) => {
    const overridden = overrides.has(feature.key);
    const includedByPlan = included.has(feature.key);
    const enabled = overridden ? Boolean(overrides.get(feature.key)) : includedByPlan;

    return {
      key: feature.key,
      label: feature.label,
      description: feature.description,
      includedByPlan,
      overridden,
      enabled,
    };
  });

  return {
    tenantId: tenant.id,
    plan: tenant.plan,
    features,
  };
}

export async function isTenantFeatureEnabled(tenantId: string, key: FeatureKey) {
  const resolved = await resolveTenantFeatureFlags(tenantId);
  if (!resolved) return false;
  return resolved.features.some((feature) => feature.key === key && feature.enabled);
}
