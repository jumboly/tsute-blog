import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    // 公開 URL はソースに書かず、ビルド時の環境変数（CI では GitHub Actions Variables）から与える
    url: process.env.SITE_URL || "http://localhost:4321/",
    title: "作業ログ",
    description: "作ったもの、調べたこと、途中で気になったことなど。忘れないうちに書いておく場所です。",
    author: "jumboly",
    // 構造化データ（JSON-LD）の author.url に使われる
    profile: "https://www.jumboly.jp/",
    ogImage: "default-og.jpg",
    lang: "ja",
    // 読者は日本在住が前提。ビルド環境（CI は UTC）に依存せず JST で表示・集計する
    timezone: "Asia/Tokyo",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    // X のカードはタイトルを画像の上に小さく重ねるだけなので、記事ごとにタイトル入りの画像を作る。
    // 記事以外のページは public/default-og.jpg のまま
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/jumboly", linkTitle: "GitHub" },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=", linkTitle: "X でシェア" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=", linkTitle: "Facebook でシェア" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=", linkTitle: "メールで共有" },
  ],
});
