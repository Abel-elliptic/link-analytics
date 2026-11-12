# link-analytics

自社用の短縮URL＋クリック解析システム（bitly の簡易版）です。Next.js（App Router）・Vercel・Supabase で動きます。

## できること
- URL を入力して短縮URL（`https://<name>.vercel.app/<slug>`）を作成し、QRコードを出力
- クリックごとに **日時・国・都道府県・都市（IPからの推定）・端末・OS・ブラウザ・流入元・言語** を記録
- ボット（SNS のリンクプレビュー取得やクローラ）を判定して集計から除外
- 遷移先URLに UTM を自動で付与（`utm_content` = スラッグ）。遷移先サイトに導入した GA4 で、**年齢・性別の推計値を短縮リンク別に**確認できる（→ [docs/ga4-setup.md](docs/ga4-setup.md)）

## 取得できないもの・限界
- **年齢・性別はクリックからは取得できません**（HTTP リクエストに含まれないため）。GA4 の集計推計値で補います。
- 位置情報は Vercel が付与するヘッダ（`x-vercel-ip-country` / `-country-region` / `-city`）の値です。IP アドレスからの推定なので、市区町村の精度は公表されていません。モバイル回線では実際の位置とずれることがあります。出典: https://vercel.com/docs/headers/request-headers
- LINE や Instagram などのアプリ内ブラウザから開かれた場合、流入元（Referer）が空になることが多いです。流入元は UTM（リンクを使い分けること）で判断してください。
- 生の IP アドレスは保存しません。ユニーク数は「日ごとに変わるハッシュ」から出した**日別の推定値の合計**です。

## 構成
| パス | 役割 |
|---|---|
| `app/[slug]/route.ts` | 短縮URLのリダイレクト（302）とクリック記録（`after()` を使い、レスポンスの後で非同期に記録） |
| `lib/tracking.ts` | UA 解析・ボット判定・位置情報・IP ハッシュ |
| `lib/links.ts` | スラッグ生成・UTM 付与・都道府県名の変換 |
| `app/dashboard/*` | 管理画面（リンクの作成・一覧・分析） |
| `proxy.ts` | `/dashboard` の認証ガード（メンバー以外を拒否） |
| `lib/members.ts` | ロール判定・初期管理者の自動登録 |
| `app/dashboard/accounts/*` | アカウント管理（管理者のみ） |
| `app/dashboard/ga4/*` | GA4 連携ガイドとタグ生成 |
| `supabase/migrations/0001_init.sql` | テーブル・RLS・集計関数 |
| `supabase/migrations/0002_members.sql` | メンバー・権限と共有 RLS |

## アカウントと権限
- ログインはメールアドレス＋パスワードのみ（メールのリンクでのログインは廃止）。
- 環境変数 `ALLOWED_EMAIL` のユーザー＝**初期管理者**。初回ログイン時に自動で管理者として登録され、削除・権限変更はできません。
- 管理者は「アカウント管理」画面で、アカウントの追加（初期パスワードを指定。確認メールは送らない）、権限の変更、パスワード再設定、削除ができます。
- 短縮リンクと分析は全メンバーで共有。リンクの削除（DB上）は管理者のみ。

| 権限 | リンク作成・停止・分析 | アカウント管理 |
| --- | --- | --- |
| 管理者 | ○ | ○ |
| メンバー | ○ | × |

## セットアップ
1. Supabase でプロジェクトを作り、SQL Editor で `supabase/migrations/0001_init.sql` → `0002_members.sql` の順に実行します。
2. Supabase の Authentication で次を設定します。
   - **Users → Add user → Create new user** で初期管理者（`ALLOWED_EMAIL` と同じアドレス）をパスワード付きで作成（Auto Confirm をオン）
   - **Sign In / Providers** の「Allow new users to sign up」をオフ（アカウントは管理画面から追加するため）
3. Vercel にこのリポジトリをインポートし、`.env.example` にある環境変数を設定します（`IP_HASH_SECRET` は `openssl rand -hex 32` などで生成）。
4. デプロイし、`/login` から初期管理者でログインします。
5. GA4 を使う場合は、管理画面の「GA4連携」ページの手順に従います（[docs/ga4-setup.md](docs/ga4-setup.md) も同内容）。

## 開発
```bash
cp .env.example .env.local   # 値を記入
npm install
npm run dev
npm test        # ロジックの単体テスト
npm run lint
```
※ ローカルでは Vercel の位置情報ヘッダが付かないため、国・地域・都市は空になります。
