import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import satori from "satori";
import sharp from "sharp";
import { loadDefaultJapaneseParser } from "budoux";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

const FONT_NAME = "Noto Sans JP";
const budoux = loadDefaultJapaneseParser();

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const fonts = fontData["--font-noto-sans-jp"];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  const [regularData, boldData] = await Promise.all([
    fetch(experimental_getFontFileURL(regularFontPath, url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(boldFontPath, url)).then(res =>
      res.arrayBuffer()
    ),
  ]);

  // 日本語は任意の文字間で改行されて「理解／する」のように語の途中で折り返すため、
  // BudouX で文節に分け、文節を 1 つずつの要素にして文節の間でだけ折り返させる
  // （ゼロ幅スペースを挟む方法は、satori だとその文字が豆腐になる）
  const titlePhrases = budoux.parse(props.data.title).map(phrase => ({
    type: "span",
    props: { children: phrase },
  }));
  const date = props.data.pubDatetime.toLocaleDateString("sv-SE", {
    timeZone: config.site.timezone,
  });

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fdfdfd",
          padding: "64px 80px 80px",
          fontFamily: FONT_NAME,
        },
        children: [
          // X はカード左下にタイトルとドメインの帯を重ねるため、サイト名は上に置く
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                color: "#006cac",
              },
              children: config.site.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexWrap: "wrap",
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.4,
                color: "#282728",
              },
              children: titlePhrases,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "flex-end",
                fontSize: 26,
                color: "#6b7280",
              },
              children: `${date} · ${props.data.author}`,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        { name: FONT_NAME, data: regularData, weight: 400, style: "normal" },
        { name: FONT_NAME, data: boldData, weight: 700, style: "normal" },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
