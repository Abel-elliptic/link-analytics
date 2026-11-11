import { createHash, createHmac } from "node:crypto";
import { UAParser } from "ua-parser-js";

// 既知のクローラ・リンクプレビュー取得・自動化ツール。
// 注意: LINE アプリ内ブラウザの UA には "Line/" が含まれるが実ユーザーなので除外しない。
const BOT_RE =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebookcatalog|embedly|preview|Google-PageRenderer|HeadlessChrome|curl\/|wget\/|python-requests|python-urllib|Go-http-client|okhttp|node-fetch|axios\//i;

export function isBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_RE.test(ua);
}

export function parseUA(ua: string | null) {
  const r = new UAParser(ua ?? "").getResult();
  return {
    // ua-parser-js は PC の場合 device.type を返さないため desktop とみなす
    device_type: r.device.type ?? "desktop",
    os: r.os.name ?? null,
    browser: r.browser.name ?? null,
  };
}

export function getGeo(h: Headers) {
  const dec = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    country: h.get("x-vercel-ip-country"),
    region: h.get("x-vercel-ip-country-region"),
    city: dec(h.get("x-vercel-ip-city")),
  };
}

export function getClientIp(h: Headers): string | null {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** 生 IP を保存しないための日替わりハッシュ。日付ごとにソルトが変わるため日をまたいだ追跡はできない。 */
export function hashVisitor(ip: string | null, ua: string | null, now = new Date()): string | null {
  const secret = process.env.IP_HASH_SECRET;
  if (!ip || !secret) return null;
  const day = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD
  const salt = createHmac("sha256", secret).update(day).digest();
  return createHash("sha256").update(salt).update(ip).update("|").update(ua ?? "").digest("hex").slice(0, 32);
}

export function parseReferrer(ref: string | null) {
  if (!ref) return { referrer: null, referrer_host: null };
  try {
    return { referrer: ref.slice(0, 1000), referrer_host: new URL(ref).hostname };
  } catch {
    return { referrer: ref.slice(0, 1000), referrer_host: null };
  }
}

export function primaryLanguage(h: Headers): string | null {
  const v = h.get("accept-language");
  return v ? v.split(",")[0].split(";")[0].trim().slice(0, 20) || null : null;
}
