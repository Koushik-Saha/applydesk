export interface ExtensionConfig {
  token: string;
  apiBaseUrl: string;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const DEFAULT_API_BASE_URL = env?.WXT_API_BASE_URL || "http://localhost:3000";

const STORAGE_KEYS = {
  TOKEN: "applydesk_token",
  API_BASE_URL: "applydesk_api_base_url",
};

export async function getExtensionConfig(): Promise<ExtensionConfig> {
  try {
    const data = await browser.storage.local.get([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.API_BASE_URL,
    ]);

    return {
      token: (data[STORAGE_KEYS.TOKEN] as string) || "",
      apiBaseUrl: (data[STORAGE_KEYS.API_BASE_URL] as string) || DEFAULT_API_BASE_URL,
    };
  } catch (err) {
    console.error("Failed to read extension storage:", err);
    return {
      token: "",
      apiBaseUrl: DEFAULT_API_BASE_URL,
    };
  }
}

export async function saveExtensionConfig(config: Partial<ExtensionConfig>): Promise<void> {
  const payload: Record<string, string> = {};
  if (config.token !== undefined) {
    payload[STORAGE_KEYS.TOKEN] = config.token.trim();
  }
  if (config.apiBaseUrl !== undefined) {
    payload[STORAGE_KEYS.API_BASE_URL] = config.apiBaseUrl.trim();
  }

  await browser.storage.local.set(payload);
}

export async function clearExtensionConfig(): Promise<void> {
  await browser.storage.local.remove([
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.API_BASE_URL,
  ]);
}
