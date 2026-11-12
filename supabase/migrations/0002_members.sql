-- 複数アカウント対応: メンバー（admin / member）と、メンバー全員でリンクを共有する RLS
-- 適用前でも初期管理者（ALLOWED_EMAIL）はログインできるようにアプリ側でフォールバックしている。

create table public.members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- RLS の中から members を参照するための関数（security definer で再帰を避ける）
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_member() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- members: 自分の行は常に読める。一覧は管理者のみ。追加・変更・削除はサーバー側（service role）だけが行う
create policy members_select on public.members for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 初期管理者（環境変数 ALLOWED_EMAIL のユーザー）は、初回ログイン時にアプリが admin として登録する

-- links / clicks: 所有者だけ → メンバー全員で共有
drop policy if exists links_owner_select on public.links;
drop policy if exists links_owner_insert on public.links;
drop policy if exists links_owner_update on public.links;
drop policy if exists links_owner_delete on public.links;
drop policy if exists clicks_owner_select on public.clicks;

create policy links_member_select on public.links for select to authenticated using (public.is_member());
create policy links_member_insert on public.links for insert to authenticated with check (public.is_member() and owner_id = auth.uid());
create policy links_member_update on public.links for update to authenticated using (public.is_member()) with check (public.is_member());
create policy links_member_delete on public.links for delete to authenticated using (public.is_admin());
create policy clicks_member_select on public.clicks for select to authenticated using (public.is_member());

-- 作成者のアカウントが削除されてもリンクとクリック記録は残す
alter table public.links alter column owner_id drop not null;
alter table public.links drop constraint if exists links_owner_id_fkey;
alter table public.links add constraint links_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;
