-- セキュリティ強化（0002 適用後に実行）

-- 1) メンバーがAPIを直接呼んでも、リンクの遷移先やスラッグを書き換えられないようにする。
--    画面から変更できるのは「停止/再開（archived）」だけなので、更新できる列をそれに限定する。
revoke update on public.links from authenticated;
grant update (archived) on public.links to authenticated;

-- 2) 遷移先URLの長さ上限（アプリ側と同じ 2048 文字）
alter table public.links drop constraint if exists links_destination_url_len;
alter table public.links add constraint links_destination_url_len check (char_length(destination_url) <= 2048);

-- 3) ログイン失敗の記録（総当たり対策）。IP とメールアドレスはハッシュ化して保存し、生の値は残さない。
--    RLS を有効にしてポリシーを作らない＝サーバー側（service role）以外は読み書きできない。
create table if not exists public.login_failures (
  id         bigint generated always as identity primary key,
  ip_hash    text,
  email_hash text,
  at         timestamptz not null default now()
);
create index if not exists login_failures_ip_idx on public.login_failures (ip_hash, at);
create index if not exists login_failures_email_idx on public.login_failures (email_hash, at);
alter table public.login_failures enable row level security;
revoke all on public.login_failures from anon, authenticated;
