import type { UIStrings } from "../types";

export default {
  nav: {
    home: "ホーム",
    posts: "記事",
    tags: "タグ",
    about: "About",
    archives: "アーカイブ",
    search: "検索",
  },
  post: {
    publishedAt: "公開",
    updatedAt: "更新",
    sharePostIntro: "この記事をシェア:",
    sharePostOn: "{{platform}} でシェア",
    sharePostViaEmail: "メールで共有",
    tagLabel: "タグ",
    backToTop: "トップへ戻る",
    goBack: "戻る",
    editPage: "このページを編集",
    previousPost: "前の記事",
    nextPost: "次の記事",
  },
  pagination: {
    prev: "前へ",
    next: "次へ",
    page: "ページ",
  },
  home: {
    socialLinks: "ソーシャル",
    featured: "おすすめ",
    recentPosts: "新着記事",
    allPosts: "すべての記事",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    tagTitle: "タグ",
    tagDesc: "このタグが付いた記事",

    tagsTitle: "タグ",
    tagsDesc: "記事に付いているタグの一覧",

    postsTitle: "記事",
    postsDesc: "これまでに公開した記事",

    archivesTitle: "アーカイブ",
    archivesDesc: "公開した記事を月別に並べています",

    searchTitle: "検索",
    searchDesc: "記事を検索",
  },
  a11y: {
    skipToContent: "本文へスキップ",
    openMenu: "メニューを開く",
    closeMenu: "メニューを閉じる",
    toggleTheme: "ライト／ダークを切り替え",
    searchPlaceholder: "記事を検索...",
    noResults: "見つかりませんでした",
    goToPreviousPage: "前のページへ",
    goToNextPage: "次のページへ",
  },
  notFound: {
    title: "404 Not Found",
    message: "ページが見つかりません",
    goHome: "ホームへ戻る",
  },
} satisfies UIStrings;
