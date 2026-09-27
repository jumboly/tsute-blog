// サイトの公開 URL はソースに書かず、ビルド時の環境変数（CI では GitHub Actions Variables）から与える。
import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  // CloudFront Function が "/path/" → "/path/index.html" を解決する前提のディレクトリ形式
  build: { format: "directory" },
  trailingSlash: "ignore",
});
