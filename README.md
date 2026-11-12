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
| `proxy.ts` | `/dashboard` の認証ガード |
| `supabase/migrations/0001_init.sql` | テーブル・RLS・集計関数 |

## セットアップ
1. Supabase でプロジェクトを作り、`supabase/migrations/0001_init.sql` を SQL Editor で実行します。
2. Supabase の Authentication で次の2点を設定します。
   - **Site URL / Redirect URLs** に `https://<name>.vercel.app/auth/callback` を追加
   - 他人の登録を防ぐため、「Allow new users to sign up」を**初回ログインの後で**無効にする
   - **Emails → Magic Link** テンプレートのリンクを次に変更する（別の端末・アプリでメールを開いてもログインできるようにするため）
     ```html
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">ログインする</a>
     ```
3. Vercel にこのリポジトリをインポートし、`.env.example` にある環境変数を設定します（`IP_HASH_SECRET` は `openssl rand -hex 32` などで生成）。
4. デプロイし、`/login` から `ALLOWED_EMAIL` に設定したアドレスでログインします。

## 開発
```bash
cp .env.example .env.local   # 値を記入
npm install
npm run dev
npm test        # ロジックの単体テスト
npm run lint
```
※ ローカルでは Vercel の位置情報ヘッダが付かないため、国・地域・都市は空になります。
