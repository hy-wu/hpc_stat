import type { Verification } from "./verification";

export interface PricingPlan {
  name: string;
  priceUSD?: number;
  period?: string;
  priceLabel?: string;
  pricingUrl?: string;
  note?: string;
}

export interface AgentTool {
  id: string;
  name: string;
  vendor: string;
  categoryTags?: string[];
  deploymentTags?: string[];
  platforms?: string[];
  githubStars?: number | null;
  pricing?: {
    startingUSD?: number;
    freeTier?: boolean;
    openSource?: boolean;
    usageMeter?: string;
    plans?: PricingPlan[];
  };
  access?: {
    byok?: boolean;
    openAICompatible?: boolean;
    localModel?: boolean;
    modelChoice?: string;
  };
  integrations?: {
    mcp?: boolean;
    git?: boolean;
  };
  capabilities?: {
    multiFileEdit?: boolean;
    terminal?: boolean;
    testRun?: boolean;
    pullRequest?: boolean;
    backgroundAgent?: boolean;
    browser?: boolean;
  };
  customization?: string;
  privacy?: string;
  builtInModels?: string[];
  supportedModels?: string[];
  officialUrl?: string;
  logoUrl?: string;
  notes?: string;
  verification?: Verification;
}
