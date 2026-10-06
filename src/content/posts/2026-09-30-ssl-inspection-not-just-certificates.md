---
title: SSLインスペクションは「証明書を入れれば終わり」ではない
pubDatetime: 2026-09-30T23:43:00+09:00
description: SSLインスペクションのある開発環境で、ツールごとのCA設定、端末ごとに積み上がる例外、原因切り分けに消える開発者の時間など、「証明書を配れば終わり」では済まない運用コストについて考えた。
modDatetime: 2026-10-07T06:37:00+09:00
tags:
  - セキュリティ
---

SSLインスペクションを使っている企業は、それほど珍しくないと思う。HTTPSの通信を途中で復号し、マルウェアや情報流出などを検査して、もう一度暗号化して外部へ送る。仕組みは分かるし、セキュリティ上の理由も分かる。必要な組織があることも分かる。

ただ、開発環境でこれを長期間運用するなら、いい加減「社内CAの証明書を配れば終わり」「動かなければ除外申請してください」という扱いはやめてほしい。全然終わっていない。むしろ、そこから面倒が始まる。

## ブラウザが動けば終わり、ではない

SSLインスペクションでは、ざっくり言えば通信の途中に装置が入り、クライアントとのTLS通信と、本来の接続先とのTLS通信をそれぞれ行う。

```text
PC
  ↓ TLS
SSLインスペクション
  ↓ TLS
example.com
```

PCから見えている`example.com`の証明書は、本来のサーバーが提示したものではない。途中の装置が生成し、企業内で信頼させているCAによって署名した証明書になる。そのためPC側では、そのCAを信頼する必要がある。[[1]](https://www.cisa.gov/news-events/alerts/2017/03/16/https-interception-weakens-tls-security)

Windowsの証明書ストアにCA証明書を配布する。EdgeやChromeでWebを見るくらいなら、これでかなりのものは動く。ここだけ見れば、それほど大した話には見えない。

でも開発者はブラウザだけ使って仕事をしているわけではない。Java、Node.js、Python、Git、curl、Docker、パッケージマネージャー、クラウドSDK、各種CLI、IDE、ビルドツール。いろんなものがHTTPS通信をするし、それらが全部OSの証明書ストアを同じように参照するわけでもない。[[3]](https://nodejs.org/api/cli.html)[[4]](https://requests.readthedocs.io/en/latest/user/advanced/)[[5]](https://git-scm.com/docs/git-config)[[6]](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html)

社内CAを信頼させるだけでも、ツールごとにこうなる。

```bash
export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem   # Node.js
npm config set cafile /path/to/corp-ca.pem        # npm
export REQUESTS_CA_BUNDLE=/path/to/corp-ca.pem    # Python Requests
pip config set global.cert /path/to/corp-ca.pem   # pip
export SSL_CERT_FILE=/path/to/corp-ca.pem         # OpenSSLを使うもの
export CURL_CA_BUNDLE=/path/to/corp-ca.pem        # curl
git config --global http.sslCAInfo /path/to/corp-ca.pem
export CARGO_HTTP_CAINFO=/path/to/corp-ca.pem     # Cargo
export AWS_CA_BUNDLE=/path/to/corp-ca.pem         # AWS CLI
gcloud config set core/custom_ca_certs_file /path/to/corp-ca.pem
keytool -importcert -cacerts -alias corp-ca -file corp-ca.pem   # Java
```

どれも各ツールの公式ドキュメントに載っている方法である。[[7]](https://docs.npmjs.com/cli/v10/using-npm/config)[[8]](https://pip.pypa.io/en/stable/topics/https-certificates/)[[9]](https://docs.openssl.org/master/man7/openssl-env/)[[10]](https://curl.se/docs/sslcerts.html)[[11]](https://doc.rust-lang.org/cargo/reference/config.html)[[12]](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html)[[13]](https://cloud.google.com/sdk/docs/proxy-settings) しかも`NODE_EXTRA_CA_CERTS`のように既定のCAに追加するものもあれば、`REQUESTS_CA_BUNDLE`や`SSL_CERT_FILE`のように既定のCAを置き換えるものもある。置き換える方に社内CAだけのファイルを渡すと、今度はSSLインスペクションの対象外のサイトにつながらなくなる。なので自分は、curlの公式サイトで配布されている証明書の一覧（MozillaのCAストアをPEM形式にしたもの）を取ってきて、そこに社内CAを追加したファイルを作って渡していた。[[15]](https://curl.se/docs/caextract.html)

その結果、新しいツールを使うたびに「このツールはどこのCAを見るんだ」「環境変数なのか」「設定ファイルなのか」「独自のTrustStoreなのか」「PEMにしないといけないのか」と調べることになる。なんでAPIを一つ使いたいだけなのに、毎回こんなことを調べないといけないのか。こっちはPKIの検証をしたいわけではない。仕事をしたいだけである。

ホスト側でこれを全部済ませても、まだ終わらない。Dockerのコンテナの中は別の世界なので、結局またイメージの中にCAを入れなあかん。Debian系のイメージならこうである。[[14]](https://manpages.debian.org/unstable/ca-certificates/update-ca-certificates.8.en.html)

```dockerfile
# 社内のSSLインスペクション用CA
COPY corp-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates
```

`docker build`の途中で走る`apt-get`や`npm install`も検査された通信を通るので、動かすときだけでなく、イメージを作る途中でも必要になる。どこへ持っていっても同じように動くのがコンテナの良さのはずなのに、そのDockerfileに自社のCAという環境依存が焼き込まれる。

## PCごとに謎の歴史が積み上がる

こういう対応を何年も続けていると、PCごとに設定の歴史が積み上がっていく。AさんのPCでは動く。BさんのPCでは動かない。CさんのPCでは、なぜか動く。

普通ならバージョン差、設定差、権限差などを疑う。でもSSLインスペクションのある環境では、それだけでは済まない。過去にCA証明書を追加しているのかもしれない。何か環境変数を設定したのかもしれない。その端末だけ除外されているのかもしれない。何年も前に入れた設定が、本人も忘れたまま残っているのかもしれない。

さらに面倒なのが、運用自体も途中で変わることである。以前はSSLインスペクション対象だったサービスが、あとから除外されることもある。すると古いPCは昔入れたCA設定で動いていて、新しいPCは除外されたから何の設定もせず動いている、という状態が普通に起こる。

両方動く。でも理由が違う。「なぜ動いているのか分からないけど、とりあえず動いている」。開発者が一番嫌うはずの状態を、開発環境そのものが作ってしまう。

## 「動かなければ除外すればいい」ではない

この話をすると、「動かないサイトがあればSSLインスペクションから除外すればいいじゃないですか」という話になりがちである。

違う。そこじゃない。

問題は除外申請を書く手間ではない。一番つらいのは、**SSLインスペクションが原因だと分かるまで**である。

新しいSDKを使ってエラーが出たとする。普通なら自分のコード、SDKの使い方、認証情報、権限、サービス側の障害などを調べる。SSLインスペクションのある環境では、そこに「途中で通信をいじられていないか」という原因候補が一つ追加される。

しかもSSLインスペクションが原因だからといって、必ず`certificate verify failed`と分かりやすく出てくれるわけではない。SDK内部で例外が別のエラーに変換されたり、リトライした末にタイムアウトになったり、認証失敗のように見えたりする。だから普通にコードを読む。ログを見る。設定を見る。ドキュメントを読む。GitHub Issuesを探す。散々調べたあとで、「これSSLインスペクションちゃうんか」となって、調べてみたら当たりだったりする。

これを何回やらせるねん、と思う。

もちろん逆もある。SSLインスペクションを疑って散々調べた結果、単なる自分の実装ミスだった、ということもある。そこも含めて厄介なのである。SSLインスペクションが実際に原因だった回数だけを数えても意味がない。**存在しているだけで、原因切り分けに毎回余計な分岐が増える。**

## 例外を足し続ければ、当然複雑になる

問題が起きたサービスをSSLインスペクションから除外する。それ自体は別に間違っていない。むしろ、無理に全部通す必要はないと思う。

ただ、それを対症療法として何年も続けたらどうなるか。全社的な除外、部署単位の除外、端末単位の除外、特定ドメインの除外、サブドメインの除外、昔追加したCA、いまは不要になったCA、過去に設定した環境変数。そういうものが少しずつ積み上がっていく。

ソフトウェア開発で、問題が起きるたびに`if`を一個ずつ追加して何年も運用しているシステムを見たら、たぶん多くの開発者は嫌な顔をすると思う。なぜネットワーク運用なら、それを延々と続けてよいことになるのか。

一個一個の例外にはちゃんと理由がある。だから余計に厄介である。その瞬間だけ見れば正しい。困っている人がいるから例外を追加する。それを繰り返した結果、全体がどんどん説明できなくなっていく。

そして数年後、「なんでこのPCだけ動くんだっけ」という環境が出来上がる。それを運用で吸収できていると言われても、さすがに無理があると思う。

## セキュリティ対策なのだから、むしろ雑に扱わないでほしい

SSLインスペクションはTLS通信の途中に入る。クライアントが本来接続先に対して行っていた証明書検証の一部を、途中の装置が肩代わりすることになる。[[1]](https://www.cisa.gov/news-events/alerts/2017/03/16/https-interception-weakens-tls-security)

これはかなり重要な話だと思う。途中に入って通信を復号し、利用者には自分が作った証明書を信頼させる。だったら、その装置から本来の接続先への証明書検証や、例外設定、装置自体の設定が正しいことは、普通の通信以上に慎重に扱われるべきである。[[2]](https://www.ndss-symposium.org/ndss2017/ndss-2017-programme/security-impact-https-interception/)

セキュリティのための仕組みなのだから、「通信できているからOK」「証明書エラーが出ていないからOK」で済ませてはいけない。TLSの信頼モデルに自分たちで割って入っている以上、その部分の責任も自分たちで引き受ける必要がある。

「セキュリティ対策だから」という言葉は、運用品質まで正当化してくれる魔法の言葉ではない。

## 開発環境は普通の事務端末ではない

もう一つ、ずっと疑問に思っていることがある。経理担当者のPC、営業のPC、コールセンターのPC、開発者のPC、CI環境、ビルドマシン。全部、用途が違う。

開発者は日常的に、

```text
npm install
cargo build
pip install
docker pull
git clone
aws ...
az ...
gcloud ...
```

みたいなことをする。昨日まで知らなかったサービスを今日試すこともあるし、数時間だけ検証して捨てるツールだってある。そんな環境で「通信先は事前に全部申請してください」と言われても現実的ではない。何を使うか最初から全部分かっているなら、それはもう探索でもPoCでもない。

もちろん、開発者だけ何でも自由にすればいいとは思っていない。端末管理、EDR、認証、権限管理、ログ、データ持ち出し対策など、別の方法で管理すべきものはいくらでもある。

だからこそ、開発環境に合ったセキュリティ設計をしてほしい。何でもかんでも一律にHTTPSを途中で復号し、その副作用は利用者側で個別対応してください、というのは雑すぎる。

## 一番腹が立つのは、失った時間が見えないこと

SSLインスペクションの運用コストとして見えやすいものは、装置の費用、ライセンス、管理作業、除外申請、問い合わせ対応などだと思う。でも、それ以外にも確実に発生していて、ほとんど見えないコストがある。

開発者の時間である。

あるSDKが動かない。一人の開発者が2時間調べる。原因はSSLインスペクションだった。CAを設定する。問い合わせを出す。除外してもらう。終わり。

管理側から見れば、問い合わせ一件かもしれない。でも開発側では、その裏で2時間消えている。半年後には別の人が別のSDKで同じことをする。PCを交換したらまた起きる。新しいメンバーが入ったらまた起きる。サービス側の構成が変わればまた起きる。除外条件が変わればまた起きる。

一件一件は小さい。だから「大きな障害」として記録されることもない。「ちょっとハマった」で消えていく。でも、それを何十人、何年と積み上げたら、どれだけの時間になるのか。

しかもその時間は、SSLインスペクションの運用コストとしてはほとんど計上されない。装置を管理する側の作業時間は見える。問い合わせ件数も見える。でも、その問い合わせに至るまで開発者が何時間原因調査をしたのかは見えない。

だから「それほど大きな問題は起きていない」という話になりやすい。でも実際には、大きな問題が起きていないのではなく、**小さな問題を大量に、長期間、開発者側へ押し出しているだけなのかもしれない。**

そして一番嫌なのは、開発者の頭の中に「意味不明な通信エラーが出たら、社内ネットワークも疑え」という知識が定着することである。普通、社内ネットワークは開発を支える土台であってほしい。その土台を毎回疑いながら開発する環境が、健全なわけがない。

## やるなら最後まで面倒を見てほしい

SSLインスペクションそのものを否定したいわけではない。必要ならやればいい。ただし、やるなら最後まで面倒を見てほしい。

CA証明書をどう配るのか。各ランタイムではどうするのか。開発ツールごとの差異をどうするのか。除外ルールをどう管理するのか。端末ごとの例外をどう追跡するのか。PCを交換したときにどう引き継ぐのか。現在その通信がSSLインスペクションされているか、開発者自身がすぐに確認できるのか。障害が起きたとき、数時間ではなく数分で切り分けられるのか。増え続けた例外を定期的に整理しているのか。設定が本当に意図した通りに動いているか確認しているのか。

そこまで含めて運用だと思う。

装置を入れました。CAを配りました。動かなかったら除外申請してください。それで終わりではない。それは単に、運用の面倒を利用者側へ押し出しただけである。

セキュリティ対策にはコストがかかる。それは仕方がない。でも、そのコストを「開発者が意味不明な通信エラーを何時間も調査する」という形で払わせ、それが何年積み上がっても「セキュリティのためだから仕方ない」で済ませるのは、あまりにも筋が悪い。

SSLインスペクションは「証明書を入れれば終わり」ではない。動かなければ除外すれば終わりでもない。その仕組みによって生まれる複雑さとコストを誰が引き受けるのかまで考えて、初めて運用だと思う。

そこを考えないのであれば、問題を解決しているのではない。ただ別の場所へ押し付けているだけである。

## 参考資料

※「」の日本語訳は内容をつかみやすくするための便宜的な訳で、公式な邦題ではありません。

1. CISA, [“HTTPS Interception Weakens TLS Security”](https://www.cisa.gov/news-events/alerts/2017/03/16/https-interception-weakens-tls-security) - Alert TA17-075A  
   **「HTTPSインターセプションはTLSのセキュリティを弱める」**  
   CISA, 2017-03-16. HTTPSインスペクションは、クライアントに証明書を信頼させたうえで行う中間者であり、クライアントは装置が行う検証に頼るしかないと説明している。装置が証明書チェーンを正しく検証しているか確かめるよう求めている。

2. Zakir Durumeric ほか, [“The Security Impact of HTTPS Interception”](https://www.ndss-symposium.org/ndss2017/ndss-2017-programme/security-impact-https-interception/)  
   **「HTTPSインターセプションがセキュリティに与える影響」**  
   NDSS Symposium 2017, 2017-02-27. 実際の通信でHTTPSインターセプションを測定し、ミドルボックスやセキュリティソフトの多くが接続の安全性を下げていたと報告した論文。

3. Node.js, [“Command-line API”](https://nodejs.org/api/cli.html) - NODE_EXTRA_CA_CERTS  
   **「コマンドラインAPI」**  
   Node.js公式ドキュメント。Node.jsは同梱のCAストアを使い、CAを追加するにはPEMファイルを環境変数`NODE_EXTRA_CA_CERTS`で渡す。OSのストアを使うには`--use-system-ca`などの指定が要る。

4. Requests, [“Advanced Usage”](https://requests.readthedocs.io/en/latest/user/advanced/) - SSL Cert Verification / CA Certificates  
   **「高度な使い方」**  
   Python Requests公式ドキュメント。信頼するCAはcertifiパッケージから取り、`REQUESTS_CA_BUNDLE`で差し替えられる。

5. Git, [“git-config”](https://git-scm.com/docs/git-config) - http.sslCAInfo  
   **「git-config」**  
   Git公式ドキュメント。検証に使うCAファイルを`http.sslCAInfo`（環境変数`GIT_SSL_CAINFO`）で指定する。WindowsでSchannelを使う場合はWindowsの証明書ストアを使う。

6. Oracle, [“The keytool Command”](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html) - cacerts Certificates File  
   **「keytoolコマンド」**  
   Java SE 21公式ドキュメント。JavaのCA証明書はJDKの中の`cacerts`という独自のキーストアに入っていて、`keytool`で管理する。

7. npm, [“config”](https://docs.npmjs.com/cli/v10/using-npm/config) - cafile  
   **「config」**  
   npm公式ドキュメント。`cafile`に、信頼するCA証明書を入れたファイルのパスを指定する。

8. pip, [“HTTPS Certificates”](https://pip.pypa.io/en/stable/topics/https-certificates/)  
   **「HTTPS証明書」**  
   pip公式ドキュメント。`--cert`（環境変数`PIP_CERT`）で、既定のCAの代わりに使う証明書バンドルを指定できる。設定ファイルのキー名は長いオプション名から作られるので、`global.cert`になる。

9. OpenSSL, [“openssl-env”](https://docs.openssl.org/master/man7/openssl-env/)  
   **「openssl-env」**  
   OpenSSL公式ドキュメント。`SSL_CERT_FILE`と`SSL_CERT_DIR`で、既定のCA証明書のファイルやディレクトリを指定する。

10. curl, [“SSL Certificates”](https://curl.se/docs/sslcerts.html)  
    **「SSL証明書」**  
    curl公式ドキュメント。ネイティブのCAストアを使わない場合、環境変数`CURL_CA_BUNDLE`で独自のCAファイルを指定できる。

11. The Cargo Book, [“Configuration”](https://doc.rust-lang.org/cargo/reference/config.html) - http.cainfo  
    **「設定」**  
    Cargo公式ドキュメント。`http.cainfo`（環境変数`CARGO_HTTP_CAINFO`）でCAバンドルのパスを指定する。指定しなければシステムの証明書を使おうとする。

12. AWS, [“Configuring environment variables for the AWS CLI”](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) - AWS_CA_BUNDLE  
    **「AWS CLIの環境変数の設定」**  
    AWS CLIユーザーガイド。`AWS_CA_BUNDLE`で、HTTPSの証明書検証に使う証明書バンドルを指定する。

13. Google Cloud, [“Configuring the gcloud CLI for use behind a proxy/firewall”](https://cloud.google.com/sdk/docs/proxy-settings)  
    **「プロキシやファイアウォールの内側でgcloud CLIを使うための設定」**  
    Google Cloud公式ドキュメント。中間者型のプロキシでSSLハンドシェイクのエラーが出る場合の対処として、`core/custom_ca_certs_file`の設定が載っている。

14. Debian, [“update-ca-certificates(8)”](https://manpages.debian.org/unstable/ca-certificates/update-ca-certificates.8.en.html)  
    **「update-ca-certificates(8)」**  
    Debianのマニュアルページ。`/usr/local/share/ca-certificates`以下にある拡張子`.crt`のPEM形式の証明書を、信頼するCAとして取り込む。

15. curl, [“CA Extract”](https://curl.se/docs/caextract.html)  
    **「CA証明書の抽出」**  
    curl公式サイト。MozillaのCAストアをPEM形式に変換した証明書バンドル`cacert.pem`を配布している。Mozillaのストアが変わると自動で更新される。
