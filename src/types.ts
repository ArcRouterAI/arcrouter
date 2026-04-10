export type ComplexityTier = "SIMPLE" | "MEDIUM" | "COMPLEX" | "REASONING";

export interface ComplexityScore {
  tier: ComplexityTier;
  score: number;
  reason: string;
  /** 0-1 sigmoid-calibrated confidence in tier classification */
  confidence: number;
  /** true when request contains tools[] or agentic keywords */
  isAgentic: boolean;
}
