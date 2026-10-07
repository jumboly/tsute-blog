---
title: POSTでええやん
pubDatetime: 2026-10-07T21:16:00+09:00
description: アプリケーションが使うAPIは、GETもPUTもDELETEも使わず全部POSTでいいと考えている理由。メソッドの使い分けの議論が不毛だと思うこと、GETのクエリ文字列への不満、新しく決まったQUERYメソッドへの感想、実際に全部POSTでやってきた経験について。
tags:
  - ソフトウェア設計
---

最初に断っておくと、思想強めの話である。

APIは全部POSTでいいと思っている。

Webページの表示はもちろんGETでいい。ただ、アプリケーションがサーバーとやり取りするための、いわゆるAPIと呼ばれる用途については、すべてPOSTでいい。GETすら要らない。パラメーターはJSONで投げて、処理結果もJSONで受け取る。それで統一すればいい。

自分でもだいぶ過激派だと思う。

## APIで言いたいことは一つだけ

APIで言いたいことは、「サーバーのこの処理を、このパラメーターで呼び出したいです。戻り値はこうです」だけである。それが分かればいい。

そこにGETだ、PUTだ、POSTだ、DELETEだというのは、ノイズでしかない。

実際、HTTPの上ではただの`GET`とか`PUT`とかいう文字列でしかない。PUTで送ったから何かがinsertされる、なんてことはなくて、何が起きるかはあくまでサーバーアプリの作りで決まる。何の保証もない。だから、そこに何の意味も感じていない。

HTTPの仕様（RFC 9110）にも、GETのような「安全な」メソッドと、そうでないメソッドの区別は、セキュリティ上の性質ではなくクライアントの意図を表すものだ、と書いてある[[1]](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.1)。GETで呼ばれたからといって、サーバーが何も変えないことを仕様が保証してくれるわけではない。

## 「ここはPUTがふさわしい」

それなのに、このメソッドをめぐって議論が始まる。

チャットで「いやいや、ここはPUTがふさわしい」「POSTでいいんじゃないんですか」とずっとやっているのを見たことがある。ここはDELETEがふさわしい、いやPOSTだ、と。すごく不毛だと思う。そんなところで時間を費やしたくない。

## GETすら要らない理由

じゃあなんでGETすら要らないのかというと、まずパラメーターの送り方が違うのが気に入らない。POSTならボディに入れるのに、GETだとURLに仕込むことになる。

しかも文法として弱い。`キー=値&キー=値`と並べるだけで、同じキーがダブったときに最初の値を取るのか、最後の値を取るのか、配列にするのかは、フレームワークによって違う。こんな貧相なインターフェースでやりたくない。

で、なんだかんだ、複雑な検索条件に関してはPOSTでJSONを投げるとかやるわけである。

600ページくらいあるAPI仕様書を見たことがある。RESTfulをうたっていて、PUTやらなにやらちゃんと使い分けている。それなのに、検索条件が複雑なやつは結局POSTで投げていた。

本来、検索はサーバーの状態を変えないので、POSTは不適切なはずである。なのに急にそこだけ「しょうがないから」と特例処理みたいなことをする。それが気に入らない。やるんだったら徹底的にGETであれや、と思う。

ご都合のいいところだけ「ここはPOSTでしょうがない」をやるのであれば、もう全部POSTに寄せてしまえばいい。

## QUERYメソッド、洒落臭い

最近、まさにこの「複雑な検索条件をPOSTで投げている」問題のために、QUERYという新しいメソッドが出てきた。どこかで見た気がしていたが、2026年6月にRFC 10008として正式に決まっていた[[2]](https://www.rfc-editor.org/rfc/rfc10008.html)。

RFCの説明では、GETだとURLに詰められる長さに限りがあったり、URLがログに残りやすかったりする。かといってPOSTだと、安全で何度実行してもいい問い合わせなのかどうかが、外から見て分からない。その間を埋めるのがQUERYで、ボディに検索条件を入れられて、しかも安全なメソッドとして扱われる、ということらしい。

洒落臭いなあと思う。POSTでいいのでは。

結局、HTTPクライアントのライブラリにまた1個メソッドが増えるだけで、何も変わっていない。「ここはQUERYがふさわしい」という変な議論もまた増える。

普及するかどうかも怪しい。間に挟まるCloudFrontとか、そういう諸々がQUERYに対応してくれないと使えない。CloudFrontのドキュメントを見ると、許可するメソッドの選択肢はGET、HEAD、OPTIONS、PUT、POST、PATCH、DELETEまでで、QUERYはなかった[[3]](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html#DownloadDistValuesAllowedHTTPMethods)。いつになったら使えるんだ、という話である。結局「安全策でQUERYはやめておこう。POSTで」みたいになりそうである。POSTやん。

## 全部POSTでやってきた

で、実際に全部POSTでやってきた経験はめちゃくちゃある。過激派なので、自分が主導権を握れる場合は基本的にPOSTでやっている。特に困ったことはない。

ラッパーを作るのも楽である。受け取ったパラメーターをJSONにシリアライズして、特定のURLにPOSTする。戻ってきたらデシリアライズする。それを作るだけでいい。

```ts
// 擬似コード
async function call(name, params) {
  const res = await fetch(`/api/${name}`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return await res.json();
}
```

そこにGETだ、PUTだ、POSTだ、DELETEだを入れたところで、だから何、になるだけである。受ける側も同じようなラッパーで受け取ってしまえば、簡易RPCのように振る舞う。

HTTPクライアントのライブラリを使っていると、やっていることはJSONを送っているだけなのに、PUTメソッドだのDELETEメソッドだのを呼び分けることになる。本当に不毛だと思う。メソッドには情報が載っていない。呼び方が違うだけで、何の保証もない。そんなことに何のコストを費やしとんねん。

もうそんなんいいから、全部POSTにしてしまって、さっさとやってしまえや。

---

![「POSTでええやん」の内容を1枚で表した絵。ホワイトボードにGET・PUT・PATCH・DELETE・QUERYを書き込んで「ここはPUTがふさわしい」「QUERYというメソッドが決まったらしい」と議論する開発者たちの手前で、主人公が「メソッドはただの文字列やで」とつぶやきながら、POSTボタンだけの画面を押して帰り支度をしている。下に「全部POSTにして、さっさとやってしまえや」](@/assets/images/post-is-fine-overview.png)

## 参考資料

※「」の日本語訳は内容をつかみやすくするための便宜的な訳で、公式な邦題ではありません。

1. R. Fielding, M. Nottingham, J. Reschke, [“RFC 9110: HTTP Semantics”](https://www.rfc-editor.org/rfc/rfc9110.html) - 9.2.1 Safe Methods  
   **「HTTPのセマンティクス」**  
   IETF, 2022年6月. 安全なメソッドとそうでないメソッドの区別は、セキュリティ上の性質ではなくクライアントの意図を表すもの、と書かれている。

2. J. Reschke, J. M. Snell, M. Bishop, [“RFC 10008: The HTTP QUERY Method”](https://www.rfc-editor.org/rfc/rfc10008.html)  
   **「HTTPのQUERYメソッド」**  
   IETF, 2026年6月. ボディに問い合わせの内容を入れられる、安全で冪等なメソッドQUERYを定めた仕様。GETやPOSTで検索することの問題点もここに書かれている。

3. Amazon Web Services, [“Cache behavior settings”](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html) - Allowed HTTP methods  
   **「キャッシュ動作の設定」**  
   Amazon CloudFront Developer Guide. CloudFrontで許可できるHTTPメソッドの選択肢。2026-10-07に確認した時点ではQUERYは含まれていなかった。
