-- 短縮リンクとクリックログ
create table public.links (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug          text not null unique check (slug ~ '^[A-Za-z0-9_-]{3,64}$'),
  destination_url text not null check (destination_url ~* '^https?://'),
  title         text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.clicks (
  id            bigint generated always as identity primary key,
  link_id       uuid not null references public.links(id) on delete cascade,
  clicked_at    timestamptz not null default now(),
  country       text,   -- ISO 3166-1 alpha-2 (x-vercel-ip-country)
  region        text,   -- ISO 3166-2 の地域部分。日本では都道府県コード 01〜47
  city          text,   -- x-vercel-ip-city（精度は公表されていない）
  device_type   text,   -- mobile / tablet / desktop など
  os            text,
  browser       text,
  referrer      text,
  referrer_host text,
  language      text,
  ip_hash       text,   -- 生IPは保存しない。日替わりソルト付きハッシュ
  is_bot        boolean not null default false
);

create index clicks_link_time_idx on public.clicks (link_id, clicked_at);

alter table public.links  enable row level security;
alter table public.clicks enable row level security;

-- links: 所有者のみ参照・作成・更新・削除
create policy links_owner_select on public.links for select to authenticated using (owner_id = auth.uid());
create policy links_owner_insert on public.links for insert to authenticated with check (owner_id = auth.uid());
create policy links_owner_update on public.links for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy links_owner_delete on public.links for delete to authenticated using (owner_id = auth.uid());

-- clicks: 所有者は参照のみ。挿入はサーバー側 service role（RLSをバイパス）からのみ
create policy clicks_owner_select on public.clicks for select to authenticated
  using (exists (select 1 from public.links l where l.id = clicks.link_id and l.owner_id = auth.uid()));

-- 集計RPC（security invoker なので RLS が適用され、他人のリンクは集計できない）
create or replace function public.link_stats(p_link_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with c as (
    select * from public.clicks
    where link_id = p_link_id and clicked_at >= p_from and clicked_at < p_to and not is_bot
  ),
  top as (
    select dim, key, n from (
      select 'region' as dim, coalesce(country || '-' || region, country, '不明') as key, count(*) as n from c group by 2
      union all select 'city', coalesce(country || ' / ' || city, '不明'), count(*) from c group by 2
      union all select 'device', coalesce(device_type, '不明'), count(*) from c group by 2
      union all select 'os', coalesce(os, '不明'), count(*) from c group by 2
      union all select 'browser', coalesce(browser, '不明'), count(*) from c group by 2
      union all select 'referrer', coalesce(referrer_host, '(直接・不明)'), count(*) from c group by 2
      union all select 'language', coalesce(language, '不明'), count(*) from c group by 2
      union all select 'hour', lpad(extract(hour from clicked_at at time zone 'Asia/Tokyo')::int::text, 2, '0'), count(*) from c group by 2
      union all select 'day', to_char(clicked_at at time zone 'Asia/Tokyo', 'YYYY-MM-DD'), count(*) from c group by 2
    ) t
  )
  select jsonb_build_object(
    'total', (select count(*) from c),
    'unique_daily', (select count(distinct (date_trunc('day', clicked_at at time zone 'Asia/Tokyo'), ip_hash)) from c),
    'bots', (select count(*) from public.clicks where link_id = p_link_id and clicked_at >= p_from and clicked_at < p_to and is_bot),
    'breakdown', coalesce((
      select jsonb_object_agg(dim, items) from (
        select dim, jsonb_agg(jsonb_build_object('key', key, 'n', n) order by n desc, key) as items
        from top group by dim
      ) g
    ), '{}'::jsonb)
  );
$$;

-- 一覧用：リンクごとの総クリック数（ボット除外）
create or replace view public.link_click_counts with (security_invoker = true) as
  select l.id as link_id, count(c.id) filter (where not c.is_bot) as clicks
  from public.links l left join public.clicks c on c.link_id = l.id
  group by l.id;
