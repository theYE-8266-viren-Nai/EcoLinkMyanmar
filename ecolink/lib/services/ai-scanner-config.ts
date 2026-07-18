export type AiScannerConfig = {
  openRouterApiKey: string;
  model: string;
  maxUploadMb: number;
};

export function getAiScannerConfig(): AiScannerConfig {
  return {
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
    model: process.env.AI_SCANNER_MODEL ?? "",
    maxUploadMb: Number(process.env.AI_SCANNER_MAX_UPLOAD_MB ?? 10),
  };
}

export function assertValidAiScannerConfig(config: AiScannerConfig) {
  if (!config.openRouterApiKey || !config.model || !Number.isFinite(config.maxUploadMb) || config.maxUploadMb <= 0) {
    throw new Error("AI scanner environment configuration is invalid.");
  }
}
