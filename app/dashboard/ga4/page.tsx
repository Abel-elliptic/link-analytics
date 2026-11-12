import { requireMember } from "@/lib/members";
import Nav from "../Nav";
import Snippet from "./Snippet";

export const dynamic = "force-dynamic";

const HELP_PROPERTY = "https://support.google.com/analytics/answer/9304153?hl=ja";
const HELP_SIGNALS = "https://support.google.com/analytics/answer/9445345?hl=ja";

export default async function Ga4Page({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const me = await requireMember();
  const { slug } = await searchParams;
  const s = slug && /^[A-Za-z0-9_-]{3,64}$/.test(slug) ? slug : "（見たいリンクのスラッグ）";

  return (
    <main>
      <Nav me={me} />
      <h1>GA4 連携</h1>
      <p className="note">
        ziplink は、遷移先URLに UTM パラメータを自動で付けて転送します（<code>utm_content</code> = スラッグ）。
        遷移先サイトに GA4 を入れておけば、GA4 側でこの値を使って<strong>短縮リンクごとの年齢・性別（集計の推計値）</strong>を見られます。
        ziplink と GA4 の間で、API キーなどの接続設定は必要ありません。
      </p>

      <section className="card stack">
        <h2>手順 1　GA4 プロパティとデータストリームを作る</h2>
        <ol>
          <li><a href="https://analytics.google.com" target="_blank" rel="noreferrer">Google アナリティクス</a>を開き、「管理」→「作成」→「プロパティ」。名前・タイムゾーン（日本）・通貨（円）を入れて作成</li>
          <li>「管理」→「データの収集と修正」→「データ ストリーム」→「ストリームを追加」→「ウェブ」</li>
          <li>「ウェブサイトの URL」に<strong>遷移先サイト（短縮URLの飛び先である自社サイト）のドメイン</strong>を入力（例: <code>https://www.example.co.jp</code>）。<strong>ziplink の URL（ziplink-ashen.vercel.app）は入れません</strong>。ストリーム名は分かりやすい名前で可。「作成して続行」</li>
          <li>表示される「ストリームの詳細」で <strong>測定ID（G- で始まる）</strong> を控える</li>
        </ol>
        <p className="sub">出典: <a href={HELP_PROPERTY} target="_blank" rel="noreferrer">Google アナリティクス ヘルプ「ウェブサイトやアプリ用にアナリティクスを設定する」</a></p>
      </section>

      <section className="card stack">
        <h2>手順 2　遷移先サイトに Google タグを貼る</h2>
        <p>
          下に測定IDを入れると、貼り付けるタグが表示されます。遷移先サイトの<strong>全ページ</strong>の HTML で、<code>&lt;head&gt;</code> の直後に貼ってください
          （WordPress などはテーマやプラグインの「Google タグ」「ヘッダーに追加」欄でも可）。
          GA4 の画面（データストリーム →「タグの実装手順を表示」→「手動でインストール」）に表示されるタグと同じ形式です。違いがあれば GA4 の画面のものを優先してください。
        </p>
        <Snippet />
        <p className="sub">反映まで最長30分ほどかかります。その後、GA4 の「リアルタイム」レポートに自分のアクセスが出れば成功です。</p>
      </section>

      <section className="card stack">
        <h2>手順 3　Google シグナルを有効にする（年齢・性別に必要）</h2>
        <ol>
          <li>「管理」→「データの収集と修正」→「データの収集」</li>
          <li>「Google シグナルのデータ収集を有効にする」をオン</li>
        </ol>
        <p className="sub">
          年齢・性別は、Google アカウントにログインし広告のパーソナライズをオンにしている人のデータから推計されます。人数が少ないと非表示になります（データのしきい値）。
          出典: <a href={HELP_SIGNALS} target="_blank" rel="noreferrer">Google アナリティクス ヘルプ「Google シグナルのデータ収集を有効にする」</a>
        </p>
      </section>

      <section className="card stack">
        <h2>手順 4　短縮リンクごとに年齢・性別を見る</h2>
        <ol>
          <li>GA4 の左メニュー「探索」→「空白」（自由形式）を開く</li>
          <li>「ディメンション」の＋で <strong>セッションの手動広告コンテンツ</strong>・<strong>年齢</strong>・<strong>性別</strong> を追加。「指標」の＋で <strong>アクティブ ユーザー</strong> を追加</li>
          <li>「行」に「年齢」（または「性別」）、「値」に「アクティブ ユーザー」をドラッグ</li>
          <li>「フィルタ」に「セッションの手動広告コンテンツ」を置き、「完全一致」で <code>{s}</code> を指定</li>
        </ol>
        <p className="sub">
          「セッションの手動広告コンテンツ」が <code>utm_content</code> の値を表すディメンションです。この名称と探索の画面表記は Google 公式ヘルプでは未確認で、解説記事に基づいています。GA4 の更新で変わることがあるため、実際の画面で確認してください。
          複数のリンクをまとめて見たいときは「セッションのキャンペーン」（= utm_campaign）で絞り込みます。
        </p>
      </section>

      <section className="card stack">
        <h2>確認と注意</h2>
        <ul>
          <li>短縮URLから開くと、遷移先URLの末尾に <code>?utm_source=…&amp;utm_content={s}</code> が付いていることを確認</li>
          <li>UTM の表記は大文字・小文字も区別されます（<code>Instagram</code> と <code>instagram</code> は別扱い）</li>
          <li>GA4 を入れると閲覧者の情報が Google に送られます。電気通信事業法の「外部送信規律」への対応（プライバシーポリシーへの記載など）が必要になる場合があります。雛形はリポジトリの <code>docs/privacy-template.md</code>（法的助言ではありません）</li>
        </ul>
      </section>
    </main>
  );
}
