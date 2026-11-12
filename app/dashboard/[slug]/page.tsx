import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { buildDestination, regionLabel, shortUrl, type LinkRow } from "@/lib/links";
import { requireMember } from "@/lib/members";
import { siteUrl } from "@/lib/site";
import Nav from "../Nav";

export const dynamic = "force-dynamic";

type Item = { key: string; n: number };
type Stats = { total: number; unique_daily: number; bots: number; breakdown: Record<string, Item[]> };

const RANGES = { "7": 7, "30": 30, "90": 90, "365": 365 } as const;

function Bars({ title, items, label = (k: string) => k, sort = "n", limit = 15 }: {
  title: string; items?: Item[]; label?: (k: string) => string; sort?: "n" | "key"; limit?: number;
}) {
  const list = [...(items ?? [])].sort((a, b) => (sort === "key" ? a.key.localeCompare(b.key) : b.n - a.n)).slice(0, sort === "key" ? undefined : limit);
  const max = Math.max(1, ...list.map((i) => i.n));
  const total = (items ?? []).reduce((s, i) => s + i.n, 0);
  return (
    <section className="card">
      <h3>{title}</h3>
      {list.length === 0 ? <p className="sub">データなし</p> : (
        <ul className="bars">
          {list.map((i) => (
            <li key={i.key}>
              <span className="lbl" title={label(i.key)}>{label(i.key)}</span>
              <span className="bar"><span style={{ width: `${(i.n / max) * 100}%` }} /></span>
              <span className="num">{i.n}<small> ({Math.round((i.n / total) * 100)}%)</small></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function LinkDetail({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ days?: string }>;
}) {
  const me = await requireMember();
  const { slug } = await params;
  const { days: d } = await searchParams;
  const days = RANGES[(d ?? "30") as keyof typeof RANGES] ?? 30;

  const supabase = await createClient();
  const { data: link } = await supabase.from("links").select("*").eq("slug", slug).maybeSingle<LinkRow>();
  if (!link) notFound();

  const to = new Date();
  const from = new Date(to.getTime() - days * 86400_000);
  const { data, error } = await supabase.rpc("link_stats", { p_link_id: link.id, p_from: from.toISOString(), p_to: to.toISOString() });
  const stats = data as Stats | null;
  const b = stats?.breakdown ?? {};

  const short = shortUrl(await siteUrl(), link.slug);
  const qr = await QRCode.toDataURL(short, { margin: 1, width: 240 });

  return (
    <main>
      <Nav me={me} />
      <p><Link href="/dashboard">← 一覧へ</Link></p>
      <h1>{link.title || link.slug}</h1>
      <div className="card grid-detail">
        <div className="stack">
          <div><span className="sub">短縮URL</span><br /><code>{short}</code></div>
          <div><span className="sub">実際の遷移先（UTM付与後）</span><br /><code className="wrap">{buildDestination(link)}</code></div>
          {link.archived && <p className="error">このリンクは停止中です（アクセスすると404になります）。</p>}
        </div>
        <div className="qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QRコード" width={160} height={160} />
          <a href={qr} download={`${link.slug}.png`}>QRをダウンロード</a>
        </div>
      </div>

      <nav className="row">
        {Object.keys(RANGES).map((k) => (
          <Link key={k} href={`?days=${k}`} className={Number(k) === days ? "pill on" : "pill"}>{k}日</Link>
        ))}
      </nav>

      {error && <p className="error">集計に失敗しました: {error.message}</p>}

      <div className="kpis">
        <div className="card"><span className="sub">クリック（ボット除外）</span><strong>{stats?.total ?? 0}</strong></div>
        <div className="card"><span className="sub">ユニーク（日別推定の合計）</span><strong>{stats?.unique_daily ?? 0}</strong></div>
        <div className="card"><span className="sub">除外したボット等</span><strong>{stats?.bots ?? 0}</strong></div>
      </div>

      <div className="grid-cards">
        <Bars title="日別（日本時間）" items={b.day} sort="key" />
        <Bars title="時間帯（日本時間）" items={b.hour} sort="key" label={(k) => `${k}時`} />
        <Bars title="都道府県・地域" items={b.region} label={regionLabel} />
        <Bars title="都市（IPからの推定）" items={b.city} />
        <Bars title="端末" items={b.device} />
        <Bars title="OS" items={b.os} />
        <Bars title="ブラウザ" items={b.browser} />
        <Bars title="流入元" items={b.referrer} />
        <Bars title="言語" items={b.language} />
      </div>

      <section className="card note">
        <h3>年齢・性別（GA4）</h3>
        <p>
          年齢・性別はクリック時のリクエストに含まれないため、ziplink では取得していません。遷移先サイトに GA4 を導入すると、
          GA4 の「探索」でディメンション「セッションの手動広告コンテンツ」を <code>{link.slug}</code> に絞り込み、このリンク経由の年齢・性別（集計の推計値）を確認できます。
        </p>
        <p><Link href={`/dashboard/ga4?slug=${encodeURIComponent(link.slug)}`}>GA4 の連携方法と、このリンクの見方 →</Link></p>
        <p className="sub">位置情報は Vercel が IP アドレスから推定した値です。モバイル回線などでは実際の所在地と異なることがあります。</p>
      </section>
    </main>
  );
}
