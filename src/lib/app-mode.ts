export function isSelfHostedMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE !== "valyu";
}

export function isValyuMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE === "valyu";
}

export function getValyuApiKey(): string {
  const key = process.env.VALYU_API_KEY;
  if (!key) {
    throw new Error("VALYU_API_KEY environment variable is required");
  }
  return key;
}
