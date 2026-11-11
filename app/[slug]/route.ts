import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDestination, SLUG_RE, type LinkRow } from "@/lib/links";
import { getClientIp, getGeo, hashVisitor, isBot, parseReferrer, parseUA, primaryLanguage } from "@/lib/tracking";

export const dynamic = "force-dynamic";

async function handle(request: NextRequest, slug: string, record: boolean) {
  if (!SLUG_RE.test(slug)) return new NextResponse("Not Found", { status: 404 });

  const supabase = createAdminClient();
  const { data: link } = await supabase
    .from("links")
    .select("id, slug, destination_url, utm_source, utm_medium, utm_campaign, archived")
    .eq("slug", slug)
    .maybeSingle<Pick<LinkRow, "id" | "slug" | "destination_url" | "utm_source" | "utm_medium" | "utm_campaign" | "archived">>();

  if (!link || link.archived) return new NextResponse("Not Found", { status: 404 });

  if (record) {
    const h = request.headers;
    const ua = h.get("user-agent");
    // レスポンス送信後に記録するので、リダイレクトは遅れない
    after(async () => {
      const { error } = await supabase.from("clicks").insert({
        link_id: link.id,
        ...getGeo(h),
        ...parseUA(ua),
        ...parseReferrer(h.get("referer")),
        language: primaryLanguage(h),
        ip_hash: hashVisitor(getClientIp(h), ua),
        is_bot: isBot(ua),
      });
      if (error) console.error("click insert failed", error.message);
    });
  }

  // 302: 301 だとブラウザがキャッシュし 2 回目以降が計測できないため
  const res = NextResponse.redirect(buildDestination(link), 302);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  return res;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  return handle(request, (await ctx.params).slug, true);
}

// HEAD はリンクチェッカー等が多いため記録しない
export async function HEAD(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  return handle(request, (await ctx.params).slug, false);
}
