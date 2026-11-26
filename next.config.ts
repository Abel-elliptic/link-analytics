import type { NextConfig } from "next";

// 管理画面・ログイン画面のセキュリティヘッダー。
// 短縮URL（/[slug]）は 302 で外部へ転送するだけなので対象外（ルート側で Referrer-Policy を設定）。
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // 他サイトへの埋め込み（クリックジャッキング）を禁止
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return ["/", "/login", "/dashboard", "/dashboard/:path*"].map((source) => ({ source, headers: securityHeaders }));
  },
};

export default nextConfig;
