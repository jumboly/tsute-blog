---
title: AWS Lambda『完全に理解した』瞬間
pubDatetime: 2026-10-16T22:47:00+09:00
modDatetime: 2026-10-17T07:28:00+09:00
description: AWS公式のカスタムランタイムのサンプルにある短いシェルスクリプトを読んで、Lambdaのランタイムの中だけでなく、その外側にあるAWS側の仕組みまで透けて見えた話。ASP.NETをAPI Gateway・ALB・SQSのどこからでも動かすために読んだときのこと。
tags:
  - AWS Lambda
  - 学習
---

AWSのドキュメントに、Lambdaのカスタムランタイムを作るチュートリアルがある[[1]](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/runtimes-walkthrough.html)。そこに`bootstrap`というシェルスクリプトが載っている。本物はリンク先で見てもらうとして、本質の部分だけ抜き出して簡略化すると、こうなる。エラー処理やリクエストIDの取得などを省略した、処理の流れを示すコードである。

```sh
# 公式のbootstrapを簡略化したもの
source "$LAMBDA_TASK_ROOT/function.sh"  # ハンドラーを読み込む

while true
do
  # 次のイベントを取ってくる
  EVENT_DATA=$(curl "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next")

  # ハンドラーを実行する
  RESPONSE=$(handler "$EVENT_DATA")

  # 結果を返す（REQUEST_IDはGETのレスポンスヘッダーから取るが、その処理は省略）
  curl -X POST "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/$REQUEST_ID/response" -d "$RESPONSE"
done
```

自分にとっては、これが衝撃だった。これでLambdaのすべてが見えた気がした。

もうなんか、Lambdaの勉強はこれだけでええやん、となった。

## 使えるけど、しっくり来ていない

Lambdaは、たいていWebのコンソール画面から始めると思う。そこにいきなり関数を書く。Node.jsなら、だいたいこんな形になる。

```js
// コンソールで書く関数のイメージ（Node.js、loadConfigは架空）

// 初期化処理
const config = loadConfig();

// これが関数ハンドラー
export const handler = async (event) => {
  const message = `${config.greeting}, ${event.name}!`;
  return { statusCode: 200, body: message };
};
```

で、コンソールから何か知らないけどJSONを入力して実行すると、出力のJSONが返ってくる。

見ていてまあ分かるけど、全然腑に落ちていなかった。例えば初期化処理は関数の上に書くことになっているが、それはどういうことなんやろう、と。使えるけど、しっくり来ていない状態だった。

## カスタムランタイムが要った事情

このスクリプトを読んだのは、2020〜21年ごろだったと思う。ASP.NETのアプリをLambdaで動かそうとしていて、前段にはAPI GatewayやALBなど、HTTPの受け口が複数あった。

ASP.NETをLambdaで動かすライブラリはあったが、API GatewayとALBでは別々の基底クラスを使う設計だった[[2]](https://github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.AspNetCoreServer)。自分がやりたかったのは、それらを一つの入り口で受け付け、さらにSQSも同じASP.NETの仕組みに流すことだった。

そこで、ランタイム部分から自分で実装することにした。

## GETとPOSTだけで、外側が透けて見える

冒頭のスクリプトに戻ると、やっていることは驚くほど少ない。ハンドラーのスクリプトを読み込んだら、あとは無限ループで次の3つを繰り返すだけである。

1. `GET /runtime/invocation/next`で次のイベントを取ってくる
2. ハンドラーを実行する
3. `POST /runtime/invocation/{リクエストID}/response`で結果を返す

これで、ランタイムの中で何が行われているかが分かる。それだけでなく、ランタイムと、Lambdaの管理部分とでも言うべきAWS側との関係も透けて見える。

GETは、イベントが届くまで返ってこない。公式のスクリプトのコメントにも「The HTTP request will block until one is received」と書いてある。ランタイムがサーバーを立てて待ち受けているわけではなく、自分から次の仕事を取りに行っている。ということは、このURLにGETが来た時点で、管理側は「このランタイムはいまリクエストを待っている」と気がつける。そしてPOSTで結果を受け取ったら、管理側がそれを先に進める。同期呼び出しなら、そのレスポンスが呼び出し元に返る[[3]](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/runtimes-api.html)。

AWSの中でイベントがどんなキューに積まれて、どう割り振られているのかまでは、もちろん分からない。でも、そういう役割を持つ仕組みが向こう側にあることは、このGETとPOSTだけで見えてくる。ここまで一気に見える。

コンソールで引っかかっていた初期化処理も、これでつながった。ハンドラーの読み込みはループの前で1回だけで、ハンドラーの呼び出しはループの中で毎回。さっきのコードでいえば、`loadConfig()`はハンドラーを読み込むときに1回だけ動き、`handler`はループの中で毎回呼ばれる。関数の上に書いた初期化処理が毎回は動かないのは、そういう形で呼ばれているからである。ドキュメントでも、初期化は関数のインスタンスごとに1回実行されると書かれている[[4]](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/runtimes-custom.html)。コンソールから入力した関数と、このシェルスクリプトが1本につながった感覚だった。

## 以下同文

こうなると、SQSとつなげるのも、Web APIとつなげるのも、もうこのシェルスクリプトの部分で以下同文と思えた。どこから来ても、ランタイムから見ればGETで取ってくるJSONでしかない。

実際に作ったものも、その考えのままである。SQSのメッセージにもHTTPの構造を表したJSONを入れておき、API Gateway・ALB・SQSのどれから来ても受け付けて、ASP.NETのフレームワークの形式にそろえて流した。SQSにわざわざHTTPの形を入れたのは、ASP.NETのコントローラーで書きたかったからだ。そうしておけば、ローカルではコントローラーを普通に、例えばSwaggerからテストできる。

あとはもう枝葉に思えてくる。他は言うてもAWSの基礎知識みたいなもんなので、まあなんとでもなるだろう、という感じだった。

## 完全に理解した

この業界で「完全に理解した」というのは、本当に完全に理解したという意味ではない。ちょっとネタっぽい言い方で、たいていこの後に「何もわからない」が来る。

ところがこのときは、作ってみたら基本的にすんなり動いた。「何もわからない」が来なかった。

全部分かったわけではもちろんない。芯になる部分をつかんだ、足がかりが見えた、という感覚である。あのサンプルは本当に秀逸だと思っている。

---

![「AWS Lambda『完全に理解した』瞬間」の内容を1枚で表した絵。ノートPCの短いシェルスクリプトを見て驚く技術者が「もうなんか、Lambdaの勉強はこれだけでええやん」とつぶやいている。画面の向こうに「AWS側」と書かれた大きな機械が透けて見え、「GET /runtime/invocation/next」（次のイベントを取ってくる）と「POST /runtime/invocation/{リクエストID}/response」（結果を返す）の2本の矢印でつながっている。機械にはAPI Gateway・ALB・SQSのパイプから同じJSONの封筒が流れ込み、「以下同文」と添えられている。下に「芯になる部分をつかんだ、足がかりが見えた」](@/assets/images/lambda-fully-understood-overview.png)

## 参考資料

※「」の日本語訳は内容をつかみやすくするための便宜的な訳で、公式な邦題ではありません。

1. Amazon Web Services, [「チュートリアル: カスタムランタイムの構築」](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/runtimes-walkthrough.html)  
   AWS Lambdaデベロッパーガイド. カスタムランタイムの`bootstrap`と、ハンドラーの`function.sh`が載っているチュートリアル。冒頭のコードはここの`bootstrap`を簡略化したもの。

2. Amazon Web Services, [“Amazon.Lambda.AspNetCoreServer”](https://github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.AspNetCoreServer)  
   **「ASP.NET Core用のLambdaライブラリ」**  
   GitHub. ASP.NET CoreをLambdaで動かすためのライブラリ。API GatewayのREST API・HTTP API、ALBのどこから呼ばれるかに合わせて基底クラスを選ぶ。

3. Amazon Web Services, [「カスタムランタイムに Lambda ランタイム API を使用する」](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/runtimes-api.html)  
   AWS Lambdaデベロッパーガイド. `/runtime/invocation/next`と`/runtime/invocation/{AwsRequestId}/response`の仕様。同期呼び出しのときはレスポンスがクライアントに送られる、と書かれている。

4. Amazon Web Services, [「AWS Lambda 用カスタムランタイムの構築」](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/runtimes-custom.html)  
   AWS Lambdaデベロッパーガイド. カスタムランタイムがやるべき初期化と処理のループ。初期化は関数のインスタンスごとに1回実行される。
