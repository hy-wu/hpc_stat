export interface VerificationSource {
  label: string;
  url: string;
}

export type VerificationStatus =
  | "verified"
  | "partial"
  | "generated"
  | "unverified"
  | "unknown";

export interface Verification {
  status: VerificationStatus;
  checkedAt?: string;
  verifiedFields?: string[];
  sources?: VerificationSource[];
}
