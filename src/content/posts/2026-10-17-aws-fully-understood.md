---
title: AWS『完全に理解した』瞬間
pubDatetime: 2026-10-17T13:38:00+09:00
description: AWSのサービスや機能がすべてフラットに見えていたころ、APIリファレンスを眺めて「AWS APIの配下」と「それ以外」の境界が見えた話。オートスケーリングの登場人物も、CloudFormationも、普通のものに見えるようになった。
tags:
  - AWS
  - 学習
---

以前、[AWS Lambda『完全に理解した』瞬間](/posts/lambda-fully-understood/)という記事を書いた。見返していて、「他は言うてもAWSの基礎知識みたいなもんなので、まあなんとでもなるだろう」というところを、そうそう確かに、と読んでいた。読みながら、そういえばAWSのその世界観はどうやってつかめたんだろう、と思い出した。

Lambdaの話より少し前のことである。

## 登場人物が湯水のように出てくる

2020年ごろ、とあるシステムのPoCをやっていて、AWSでやろうという話になった。それまでも、一応勉強したほうがいいだろうと思って、個人的になんとなく触ってはいた。ただ、ちょっと触った程度ではよくわからなかった。仕事なので、ここで初めて本格的に触り始めた。

本当に圧倒された。ものすごい数のサービスがある。

しんどかったのはオートスケーリングのところで、EC2をALBで負荷分散して、というあたりだった。ALBとEC2はもともと知っていた。ただ、このときはコンテナでやろうとしていたので、ECRとかECSとか、EC2の起動テンプレートとか、オートスケーリンググループとか、いきなり登場人物が湯水のように出てきた。しかもWindowsコンテナでやっていたので、余計わからなかった。

RDSを使おうとしても、ロールがどうとか、セキュリティグループがどうとか、いろんなものが見えてくる。情報の洪水だった。

コンピューターに初めて触れたときに似た感覚だった。わからないながら調べようとすると、またわからない言葉が出てくる。それを調べると、またわからない言葉が出てくる。これを、AWSを触るまで久しく感じていなかった。

## フラットに見えていた

しばらくは、わけがわからなかった。

使えてはいた。こうやると、なぜかAWSにアクセスできる。AWS CLIも動くし、AWS SDKもよくわからんけどプロファイルでいける。でも、例えばRDSを使っているときに、IAMがどこまでどう関係しているのかは全然見えていなかった。

この機能がある、この機能がある、この機能がある、と、いろんなものがフラットに見えていた。AWSの情報を構造化できていなかった。

## APIリファレンスを見に行く

どのタイミングでAWSのAPIを調べようとしたのかは、ふわっとしか覚えていない。何かのきっかけでAWSのAPIというものがあると知って、どんな感じなのか一応見てみたろう、とリファレンスを見に行った。なんとなくS3だった気がする。

見ていたのは、もしかするとAWS SDK for .NETのAPIリファレンスだったかもしれない[[1]](https://docs.aws.amazon.com/sdkfornet/v3/apidocs/)。これもうろ覚えだが、SDKのリファレンスを眺めているうちに、その向こうにあるWebのAPIに連想が行った可能性がある。

リファレンスのページには、ほかのサービスのAPIもずらっと並んでいる。それもちょろちょろ見ていくと、コンソール、つまりAWSのあのWeb画面でやっていたことに相当するAPIがいっぱいある。

そこで一気に世界観が構築された。ここははっきり覚えている。

## IAMはAWS APIの認証認可に過ぎない

見えたのは、AWS APIの配下の部分と、それ以外の部分という区分けだった。

IAMは、あくまでAWSのAPIの認証認可に過ぎない。そういう発想になった。EC2用にロールを設定するのも、ローカルPCからAWSを呼ぶときに何かわからないがプロファイルを設定するのも、詳細は置いといて、要はIAM認証なんだ、というところに帰結できた。

逆に、EC2の上にWebサーバーを立てた場合、それはIAMの対象外になる。AWSとは関係ないと言うと言い過ぎだが、AWSの預かり知らないものになっている。Redisを立てたときも、RDBを立てたときも同じである。この区分けが結構大事だと思っている。

RDSでいえば、DBインスタンスを作ったり消したりするのはAWSのAPIで、IAMの話になる。一方、できあがったPostgreSQLにつないでSQLを流すのは、PostgreSQLのプロトコルと認証の話で、今までの知識がそのまま使える。

もし何かがIAMの制御下に入っているとしたら、それはAWS側でそのインターフェースに対して何らかのラップなりカスタマイズをしている、と考えることができる。実際、RDSにはIAMデータベース認証という機能があって、MySQLやPostgreSQLにパスワードの代わりに、AWS署名バージョン4で作られる認証トークンで接続できる[[2]](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)。

## オートスケーリングに戻る

この世界観ができてからは、あの湯水のような登場人物も割とすんなり組めるようになった。

起動テンプレートは、結局それでEC2を起動しているだけでしょう、と見えた。EC2のAPIリファレンスでも、起動テンプレートはインスタンスを起動するためのパラメーターを含むリソースで、`RunInstances`でインスタンスを起動するときに、起動パラメーターを並べる代わりに起動テンプレートを指定できる、と説明されている[[3]](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RunInstances.html)。AWS CLIで書くと、こういうことである（値は例）。

```sh
# パラメーターを並べて起動する
aws ec2 run-instances --image-id ami-xxxx --instance-type t3.medium --security-group-ids sg-xxxx

# 同じパラメーターを起動テンプレートにまとめておいて起動する
aws ec2 run-instances --launch-template LaunchTemplateName=web
```

オートスケーリンググループは、その起動テンプレートを使って、必要な数のEC2を起動したり終了したりして台数を保つもの[[4]](https://docs.aws.amazon.com/ja_jp/autoscaling/ec2/userguide/auto-scaling-groups.html)。EC2を起動するAPIのパラメーターを起動テンプレートで指定しているだけ、と思えば、何をしているのかが見えてくる。

CloudFormationも腹落ちした。存在は知っていたが、何か特別なものに見えていた。JSONやYAMLで構成を記述すると、中で専用の処理が走ってリソースが構築される、不思議な独自機能。だから、CloudFormationで何が構築できるのかが多分見えていなかった。

これも、要は内部的にはAPIを呼び出している、という世界観になった。CloudFormationのサービスロールも、ユーザーに代わってスタック内のリソースを呼び出すことをCloudFormationに許可するもの、と説明されている[[5]](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/using-iam-servicerole.html)。そう思えば、APIで提供されているものは基本的にCloudFormationで触れるんでしょう、と見当がつく。もちろん例外はあるのかもしれない。実際、AWS自身も、サービスでできることとCloudFormationで定義できることの間にギャップがあった、と書いている[[6]](https://aws.amazon.com/blogs/devops/cloudformation-coverage/)。CDKも、最終的にはCloudFormationを通じてデプロイされる[[7]](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html) ので、同じ見方でいける。

## 完全に理解した

AWS APIの配下にも、ものすごい数のサービスがある。でも、結局はEC2やS3やVPCなどがわかっていれば、なんとなく中身を想像できる。

AWSが管理しているものの中身にも、EC2的なもの、S3的なもの、CloudWatch的なものがあって、基本的にはその組み合わせで動いている。EC2などは、それを利用者側にサービスとして提供している。そういう概念が自分の中にできた。もちろん、EC2そのものを内部で使っているという意味ではないし、AWSの中身を確かめたわけでもない。あくまで自分の中の世界観である。

全部のサービスを知っているわけではもちろんない。それでも、AWS APIの配下の部分と、それ以外の部分。それ以外の部分は、今までの知識が普通に使える。この区分けが見えたのが、自分にとってのAWSを完全に理解した瞬間だった。

---

![「AWS『完全に理解した』瞬間」の内容を2コマで表した絵。上のコマ「フラットに見えていた」では、頭を抱える技術者の周りにALB・EC2・ECR・ECS・起動テンプレート・オートスケーリンググループ・ロール・セキュリティグループのカードが散らばり、「いきなり登場人物が湯水のように出てきた」「AWS SDKもよくわからんけどプロファイルでいける」「この機能がある、この機能がある、この機能がある」と吹き出しが出ている。下のコマ「そこで一気に世界観が構築された。」では、APIリファレンスを眺めて納得した技術者の前で、世界が「AWS APIの配下の部分」（EC2・S3・RDS・オートスケーリンググループ・CloudFormation）と「それ以外の部分」（Webサーバー・Redis・PostgreSQL）に分かれている。「AWS APIの配下の部分」は塀で囲まれ、入口にIAMの門がある。「それ以外の部分」は塀のない開けた場所になっている。「IAMは、あくまでAWSのAPIの認証認可に過ぎない。」「起動テンプレートは、結局それでEC2を起動しているだけでしょう」「それ以外の部分は、今までの知識が普通に使える。」と添えられている](@/assets/images/aws-fully-understood-overview.png)

## 参考資料

※「」の日本語訳は内容をつかみやすくするための便宜的な訳で、公式な邦題ではありません。

1. Amazon Web Services, [“AWS SDK for .NET V3 API Documentation”](https://docs.aws.amazon.com/sdkfornet/v3/apidocs/)  
   **「AWS SDK for .NET V3 APIドキュメント」**  
   AWS SDK for .NETのAPIリファレンス. 目次に`Amazon.S3`などサービスごとの名前空間がずらっと並んでいる。当時見ていたのがこれだったかはうろ覚え。

2. Amazon Web Services, [「MariaDB、MySQL、および PostgreSQL の IAM データベース認証」](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)  
   Amazon RDSユーザーガイド. パスワードの代わりに、AWS署名バージョン4で生成される認証トークンでDBインスタンスに接続する仕組み。標準のデータベース認証も引き続き使える。

3. Amazon Web Services, [“RunInstances”](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RunInstances.html) - Amazon EC2 API Reference  
   **「RunInstances（インスタンスの起動）」**  
   Amazon EC2 APIリファレンス. 起動テンプレートはインスタンスを起動するためのパラメーターを含むリソースで、起動パラメーターの代わりに指定できる、と書かれている。

4. Amazon Web Services, [「Auto Scaling グループ」](https://docs.aws.amazon.com/ja_jp/autoscaling/ec2/userguide/auto-scaling-groups.html)  
   Amazon EC2 Auto Scalingユーザーガイド. Auto Scalingグループでのインスタンス数の維持と自動スケーリングが、Amazon EC2 Auto Scalingの主な機能だと書かれている。

5. Amazon Web Services, [「CloudFormation サービスロール」](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/using-iam-servicerole.html)  
   AWS CloudFormationユーザーガイド. ユーザーに代わってスタック内のリソースを呼び出すことをCloudFormationに許可するIAMロール。

6. Eric Z. Beard, Rahul Sharma, [“The history and future roadmap of the AWS CloudFormation Registry”](https://aws.amazon.com/blogs/devops/cloudformation-coverage/)  
   **「AWS CloudFormationレジストリの歴史と今後のロードマップ」**  
   AWS DevOps & Developer Productivity Blog, 2023-05-04. AWSのサービスでできることと、CloudFormationのテンプレートで定義できることの間にギャップがあった、と書かれている。

7. Amazon Web Services, [「AWS CDK とは」](https://docs.aws.amazon.com/ja_jp/cdk/v2/guide/home.html)  
   AWS CDK v2デベロッパーガイド. コードで定義したインフラストラクチャを、AWS CloudFormationを通じてプロビジョニングする。
