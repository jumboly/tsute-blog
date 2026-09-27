# 作業ログ

[Astro](https://astro.build/) + [AstroPaper](https://github.com/satnaing/astro-paper) テーマによる静的サイト。特定アプリの公式ブログではないが、配信はアプリ「つて」と同じ FQDN のルート（`/`）で配信される。

- 記事: `src/content/posts/*.md` に Markdown を追加する。frontmatter・タグの決め方などの執筆ルールは [AGENTS.md](AGENTS.md)
- サイト設定（タイトル・タイムゾーン・機能の ON/OFF）: `astro-paper.config.ts`
- UI 文言: `src/i18n/lang/ja.ts`
- ローカル: `npm install && npm run dev`
- デプロイ: main への push で GitHub Actions が S3 に同期し CloudFront を invalidation
  - invalidation は `dist/` のトップレベル（`_astro/` を除く）から組み立てた Blog のパスだけを対象にするため、`/api/*`, `/ws` には影響しない
  - `public/` や `src/pages/` にトップレベルの項目を足すと、対象パスも自動で増える（ワイルドカードは 1 パスとして数えるので、パス数は少ないまま）

## テーマからの主な変更

- 日本語化（`lang: "ja"`、`src/i18n/lang/ja.ts`）
- 日時表記を `YYYY-MM-DD HH:mm`（日本時間）に変更。アーカイブの年月もビルド環境の TZ ではなく日本時間で集計
- 記事ごとの動的 OG 画像を無効化（同梱フォントが日本語非対応のため）し、`public/default-og.jpg` を共通で使用
- パッケージマネージャを pnpm から npm に変更（デプロイワークフローに合わせるため）
- テーマ本体のライセンスは `LICENSE.astro-paper`（MIT）

## インフラの所有責務

CloudFront・Blog 用 S3 バケット・このリポジトリ用デプロイロールは、アプリ側リポジトリ（tsute）の
`tsute-<env>-edge` スタックが所有する。このリポジトリはバケットへの同期と invalidation のみ行う。

## GitHub Actions Variables（Environment: production）

| 名前 | 例 / 取得元 |
|---|---|
| `APP_BASE_URL` | `https://<APP_BASE_URL>` |
| `AWS_REGION` | バケットのリージョン（edge スタックは us-east-1） |
| `AWS_BLOG_DEPLOY_ROLE_ARN` | edge スタック出力 `BlogDeployRoleArn` |
| `BLOG_BUCKET` | edge スタック出力 `BlogBucketName` |
| `CLOUDFRONT_DISTRIBUTION_ID` | edge スタック出力 `DistributionId` |
