# 作業ログ

[Astro](https://astro.build/) + [AstroPaper](https://github.com/satnaing/astro-paper) テーマによる静的サイト。GitHub Pages でカスタムドメイン `tsute.jumboly.jp` のルート（`/`）に配信する。

- 記事: `src/content/posts/*.md` に Markdown を追加する。frontmatter・タグの決め方などの執筆ルールは [AGENTS.md](AGENTS.md)
- サイト設定（タイトル・タイムゾーン・機能の ON/OFF）: `astro-paper.config.ts`
- UI 文言: `src/i18n/lang/ja.ts`
- ローカル: `npm install && npm run dev`
- デプロイ: main への push で GitHub Actions がビルドし、GitHub Pages にデプロイする
  - 予約投稿（未来の `pubDatetime`）が公開されるのもデプロイ時だけ。時刻を過ぎたら Actions の `workflow_dispatch` で手動実行する
  - Pages はキャッシュヘッダーを指定できず、全ファイルが `max-age=600` で返る

## テーマからの主な変更

- 日本語化（`lang: "ja"`、`src/i18n/lang/ja.ts`）
- 日時表記を `YYYY-MM-DD HH:mm`（日本時間）に変更。アーカイブの年月もビルド環境の TZ ではなく日本時間で集計
- 記事ごとの OG 画像は Noto Sans JP で日本語タイトル入りに生成。記事以外のページは `public/default-og.jpg` を使用
- パッケージマネージャを pnpm から npm に変更（デプロイワークフローに合わせるため）
- テーマ本体のライセンスは `LICENSE.astro-paper`（MIT）

## 配信の設定

- GitHub Pages: Source は「GitHub Actions」、Custom domain は `tsute.jumboly.jp`（Enforce HTTPS）
- DNS: `jumboly.jp` は dns.ne.jp で管理し、`tsute` を `jumboly.github.io.` への CNAME にしている。
  値の末尾のドットを省くとゾーン名が後ろに付いて `jumboly.github.io.jumboly.jp.` になるので注意
- `jumboly.jp` はアカウントの Verified domains で検証済み（他アカウントにサブドメインを使われないため）

## GitHub Actions Variables（Environment: production）

| 名前 | 内容 |
|---|---|
| `APP_BASE_URL` | 公開 URL（`https://tsute.jumboly.jp`）。ビルド時に `SITE_URL` として渡す |
| `CF_BEACON_TOKEN` | Cloudflare Web Analytics のビーコンのトークン（HTML に埋め込まれる公開値） |
