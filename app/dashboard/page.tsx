import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shortUrl, type LinkRow } from "@/lib/links";
import { siteUrl } from "@/lib/site";
import { signOut } from "../login/actions";
import { setArchived } from "./actions";
import CreateForm from "./CreateForm";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: links, error }, { data: counts }] = await Promise.all([
    supabase.from("links").select("*").order("created_at", { ascending: false }).returns<LinkRow[]>(),
    supabase.from("link_click_counts").select("link_id, clicks"),
  ]);
  const countMap = new Map((counts ?? []).map((c) => [c.link_id as string, Number(c.clicks)]));
  const base = await siteUrl();

  return (
    <main>
      <header className="row between">
        <h1>短縮リンク</h1>
        <form action={signOut}>
          <button className="ghost">ログアウト</button>
        </form>
      </header>
      <CreateForm />
      {error && <p className="error">読み込みに失敗しました: {error.message}</p>}
      <table>
        <thead>
          <tr>
            <th>タイトル / 短縮URL</th>
            <th>遷移先</th>
            <th className="num">クリック</th>
            <th>作成日</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(links ?? []).map((l) => (
            <tr key={l.id} className={l.archived ? "muted" : undefined}>
              <td>
                <Link href={`/dashboard/${l.slug}`}>{l.title || l.slug}</Link>
                <div className="sub">{shortUrl(base, l.slug)}</div>
              </td>
              <td className="truncate" title={l.destination_url}>{l.destination_url}</td>
              <td className="num">{countMap.get(l.id) ?? 0}</td>
              <td>{new Date(l.created_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</td>
              <td>
                <form action={setArchived}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="archived" value={String(!l.archived)} />
                  <button className="ghost small">{l.archived ? "再開" : "停止"}</button>
                </form>
              </td>
            </tr>
          ))}
          {links?.length === 0 && (
            <tr>
              <td colSpan={5} className="sub">まだリンクがありません。</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
