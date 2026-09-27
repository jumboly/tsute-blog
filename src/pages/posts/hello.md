---
layout: ../../layouts/Post.astro
title: ブログを開設しました
date: 2026-09-27
description: このブログの構成について
---

このブログは静的サイトジェネレータ（Astro）で生成し、アプリと同じ FQDN のルートで配信しています。

- `/` … このブログ（S3 + CloudFront）
- `/api/*` と `/ws` … アプリケーションの API（別リポジトリ・別デプロイ）

ブログの更新はアプリケーションの Backend を再デプロイしません。
