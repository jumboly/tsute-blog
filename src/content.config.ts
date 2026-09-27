import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

// ファイル名の先頭に付けた日付（YYYY-MM-DD-）はエディタで日付順に並べるためだけのもの。
// URL に含めると日付を直したときにリンクが切れるので、ID（= URL の slug）からは外す。
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

const generatePostId = ({ entry }: { entry: string }) =>
  entry
    .replace(/\.(md|mdx)$/, "")
    .split("/")
    .map(segment => segment.replace(DATE_PREFIX, ""))
    .join("/");

const posts = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${BLOG_PATH}`,
    generateId: generatePostId,
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, pages };
