# Technical Blog

Astro による静的サイト。アプリ「つて」と同じ FQDN のルート（`/`）で配信される。

- 記事: `src/pages/posts/*.md` に Markdown を追加するだけ（frontmatter: `layout`, `title`, `date`, `description`, `draft`）
- ローカル: `npm install && npm run dev`
- デプロイ: main への push で GitHub Actions が S3 に同期し CloudFront を invalidation（`/api/*`, `/ws` には影響しない）

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
