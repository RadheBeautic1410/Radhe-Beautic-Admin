const PHONEPE_BASE_URL =
  process.env.PHONEPE_BASE_URL ||
  process.env.PHONE_PAY_BASE_URL ||
  "https://api-preprod.phonepe.com/apis/pg-sandbox";

const PHONEPE_AUTH_BASE_URL =
  process.env.PHONEPE_AUTH_BASE_URL ||
  process.env.PHONE_PAY_AUTH_BASE_URL ||
  (PHONEPE_BASE_URL.includes("/apis/pg-sandbox")
    ? "https://api-preprod.phonepe.com/apis/identity-manager"
    : PHONEPE_BASE_URL.includes("/apis/pg")
      ? PHONEPE_BASE_URL.replace("/apis/pg", "/apis/identity-manager")
      : PHONEPE_BASE_URL.includes("/apis/")
        ? PHONEPE_BASE_URL.replace(/\/apis\/[^/]+/, "/apis/identity-manager")
        : "https://api.phonepe.com/apis/identity-manager");

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "";
const PHONEPE_CLIENT_ID = process.env.PHONE_PAY_CLIENT_ID || "";
const PHONEPE_CLIENT_SECRET = process.env.PHONE_PAY_CLIENT_SECRET || "";
const PHONEPE_CLIENT_VERSION = process.env.PHONE_PAY_CLIENT_VERSION || "";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function readBodyAsJsonOrText(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("application/json")) {
    return await res.json();
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function fetchAccessToken(): Promise<{ token: string; expiresAt: number }> {
  const url = `${PHONEPE_AUTH_BASE_URL}/v1/oauth/token`;
  const bodyParams: Record<string, string> = {
    client_id: PHONEPE_CLIENT_ID,
    client_secret: PHONEPE_CLIENT_SECRET,
    grant_type: "client_credentials",
  };

  if (PHONEPE_CLIENT_VERSION) {
    bodyParams.client_version = PHONEPE_CLIENT_VERSION;
  }

  const body = new URLSearchParams(bodyParams);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = await readBodyAsJsonOrText(res);
  if (!res.ok || !data?.access_token) {
    const msg =
      data?.message ||
      data?.error_description ||
      data?.error ||
      `Failed to obtain PhonePe access token (status ${res.status})`;
    throw new Error(msg);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = Number(data.expires_at) || nowSec + 600;
  return { token: `${data.token_type || "O-Bearer"} ${data.access_token}`, expiresAt };
}

async function getAccessToken(): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > nowSec) {
    return cachedAccessToken.token;
  }

  const fresh = await fetchAccessToken();
  cachedAccessToken = fresh;
  return fresh.token;
}

export function isPhonePeConfigured(): boolean {
  return Boolean(
    PHONEPE_CLIENT_ID &&
      PHONEPE_CLIENT_SECRET &&
      PHONEPE_BASE_URL &&
      PHONEPE_AUTH_BASE_URL,
  );
}

export async function getPhonePeOrderStatus(
  merchantOrderId: string,
  details = false,
) {
  const token = await getAccessToken();
  const url = `${PHONEPE_BASE_URL}/checkout/v2/order/${encodeURIComponent(
    merchantOrderId,
  )}/status?details=${details ? "true" : "false"}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token,
  };

  if (PHONEPE_MERCHANT_ID) {
    headers["X-MERCHANT-ID"] = PHONEPE_MERCHANT_ID;
  }

  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const data = await readBodyAsJsonOrText(res);
  return { status: res.status, data };
}
