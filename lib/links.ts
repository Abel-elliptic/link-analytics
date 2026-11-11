export type LinkRow = {
  id: string;
  slug: string;
  destination_url: string;
  title: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  archived: boolean;
  created_at: string;
};

/** ルートと衝突するため使えない slug */
export const RESERVED_SLUGS = new Set(["dashboard", "login", "logout", "auth", "api", "_next", "favicon.ico", "robots.txt"]);
export const SLUG_RE = /^[A-Za-z0-9_-]{3,64}$/;

const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export function randomSlug(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * 遷移先 URL に UTM を付与する。既に遷移先 URL 側に同名パラメータがあればそちらを優先。
 * utm_content には slug を入れ、GA4 で短縮リンク別に絞り込めるようにする。
 */
export function buildDestination(link: Pick<LinkRow, "slug" | "destination_url" | "utm_source" | "utm_medium" | "utm_campaign">): string {
  const url = new URL(link.destination_url);
  const set = (k: string, v: string | null) => {
    if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
  };
  set("utm_source", link.utm_source);
  set("utm_medium", link.utm_medium);
  set("utm_campaign", link.utm_campaign);
  set("utm_content", link.slug);
  return url.toString();
}

export function shortUrl(base: string, slug: string) {
  return `${base.replace(/\/$/, "")}/${slug}`;
}

export const JP_PREFECTURES: Record<string, string> = {
  "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県", "06": "山形県", "07": "福島県",
  "08": "茨城県", "09": "栃木県", "10": "群馬県", "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県",
  "15": "新潟県", "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県", "21": "岐阜県",
  "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県", "26": "京都府", "27": "大阪府", "28": "兵庫県",
  "29": "奈良県", "30": "和歌山県", "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県",
  "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県", "41": "佐賀県", "42": "長崎県",
  "43": "熊本県", "44": "大分県", "45": "宮崎県", "46": "鹿児島県", "47": "沖縄県",
};

/** "JP-13" → "東京都"。それ以外はそのまま */
export function regionLabel(key: string): string {
  const m = /^JP-(\d{2})$/.exec(key);
  return m ? (JP_PREFECTURES[m[1]] ?? key) : key;
}
