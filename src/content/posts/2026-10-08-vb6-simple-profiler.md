---
title: VB6で作った割り切り簡易プロファイラー
pubDatetime: 2026-10-08T20:31:00+09:00
description: 2009年ごろ、満遍なく少しずつ遅いVB6のアプリを測るために、参照カウントを使った簡易プロファイラーと、それを仕込むVBScriptのツールを作った話。測ってみたら、行儀よく付けていた`ByVal`が遅さの原因だった。
tags:
  - 昔話
---

2009年頃の話。VB6のアプリの処理が遅かった。

遅いといっても、どこか1か所が飛び抜けて遅いわけではない。全体的にふわっと、ちょっとずつ遅くて、積み重なった結果として遅くなっている感じだった。多少の偏りはあったと思うが、特定の所というより満遍なく遅い。

だから、メソッドごとに大体何回呼ばれて、合計時間はこれぐらい、というものが欲しかった。既存のツールは、探した限りでは見つからなかった。あったのかもしれないし、あっても使い方が分からなかったのかもしれない。

なので、作ることにした。

## 計測用のコピーを改造する

最初に割り切ったのは、測定のためにソースを改造してよい、ということだった。

ただし本体には仕込まない。計測用にソースをコピーして、そちらを改造する。本体に仕込んで後で消すやり方だと、消し漏れがあると怖い。かなり安全側に倒したが、コピーを改造すると最初から決めていたので、改造すること自体に迷いはなかった。むしろ楽だった。

## 入口で作って、勝手に消えてもらう

仕掛けはこうである。各メソッド（`Function`と`Sub`）の先頭で、計測用のオブジェクトを作る。そのとき、どのメソッドか分かるラベルを渡す。クラス名（ファイル名）とメソッド名くらいは入れたかった。

VB6のオブジェクトは参照カウントで管理されている。メソッドの中で作ったオブジェクトは、メソッドが終わってローカル変数がなくなると、参照がなくなってその場で破棄される。[[1]](https://learn.microsoft.com/en-us/previous-versions/visualstudio/visual-basic-6/aa240808%28v=vs.60%29) 破棄されるときにはクラスの`Class_Terminate`が呼ばれるので、生成されてから破棄されるまでの時間を測れば、そのメソッドにかかった時間になる。

当時のものは残っていないので記憶をもとにした雰囲気だが、仕込まれた側のメソッドはこんな見た目になる。

```vb
Public Function Foo(ByVal s As String) As Long
    Dim prof As New Profiler
    prof.Start "Class1.Foo"
    ' ...元の処理...
End Function
```

先頭に2行足しただけである。`As New`で宣言した変数は、最初にメソッドを呼んだ時点でオブジェクトが作られるので、`prof.Start`を呼んだところから計測が始まる。

計測用のクラスは、だいたいこんな感じだった。

```vb
' Profiler.cls
Private Declare Function GetTickCount Lib "kernel32" () As Long

Private mLabel As String
Private mStart As Long

Public Sub Start(label As String)
    mLabel = label
    mStart = GetTickCount()
End Sub

Private Sub Class_Terminate()
    ' ラベルをキーに、呼ばれた回数と合計時間を積み上げる
    Record mLabel, GetTickCount() - mStart
End Sub
```

時間はWindows APIの`GetTickCount`で取った。記録はディクショナリのようなものに積んでおき、終了時に集計してフォームに出した。

## End Functionの前に書けばいいじゃない

ここで、ツールで仕込むなら`End Function`の前に終わりの処理も書けばいいじゃないか、と思うかもしれない。開始と終了を両方書けば、参照カウントに頼らなくても測れる。

それはしなかった。メソッドの出口は`End Function`だけではない。途中の`Exit Function`もあるし、エラーで抜けることもある。抜ける場所があちこちにあって、全部に仕込もうとすると難しいし、漏れがありそうだった。

その点、メソッドの先頭は比較的パターンが決まっていて検出しやすい。だから入口にだけ仕込み、出口は追わないことにした。どこから抜けても、ローカル変数がなくなればオブジェクトは破棄される。出口の面倒は参照カウントに見てもらう。

## 仕込むツール

とはいえ、全メソッドに手で2行ずつ足していくのは大変である。そこで、仕込むツールも作った。

ソースを全部読んでいき、メソッドのパターンを見つけたら、その直後にオブジェクトを生成する行を入れる。ファイルを渡せばパッチを当ててくれる、という感じのものだった。VBScriptで書いた。当時はVBに馴染んでいたので、さくっと書けるツールとしてちょうどよかった。

## 測ってみたら

測ってみると、確かに「ここやな」という所もあって、そういう所は潰していった。

すごく意外だったのは、文字列の`ByVal`だった。

処理自体はそんなに重くなさそうなのに、なぜか遅いメソッドがあった。眺めていると、明らかに大きな文字列を組み立てている。調べていくと、どうも大きい文字列を渡している所が遅い傾向がある。しかも引数は`ByVal`になっている。

これはひょっとして、と試しに`ByRef`に変えてみたら、そこのボトルネックが急激に解消された。

VB6では、文字列を`ByVal`で渡すと文字列がまるごとコピーされる。Microsoftの資料にも、大きな文字列やVariantの配列を渡すときは、プロシージャの中で変更しなくても`ByRef`で宣言するのが一般的なやり方だと書いてある。文字列全体をコピーするより、4バイトのポインタを渡すほうがずっと速いからである。[[2]](https://learn.microsoft.com/en-us/previous-versions/visualstudio/visual-basic-6/aa242099%28v=vs.60%29)

自分は、`ByVal`でも参照の値渡しになっていると思い込んでいた。

`ByVal`にしていたのは、たぶん行儀よくするためだった。`ByRef`だと呼び先で書き換えられてしまうので、基本的には`ByVal`のほうがいいよね、ということで付けていたのだと思う。VB6では、何も書かなければ`ByRef`になる（VB.NETでは`ByVal`に変わった）。[[3]](https://learn.microsoft.com/en-us/previous-versions/visualstudio/visual-studio-2008/41zywfyc%28v=vs.90%29) 当時それを知らなかったかというと微妙で、たぶん知ってはいたけれど、習慣として`ByVal`を書いていた。

## 遅かった所だけByRefにする

原因が分かっても、全部を`ByRef`にはしなかった。全部変えると、今度は呼び先で書き換えられる問題が出てくる。`ByVal`のメソッドのうち、測って遅かったものだけを狙って変えていった。変えた所には、理由をコメントで残したはずである。

```vb
' 変更前
Private Function BuildText(ByVal s As String) As String

' 変更後
' 大きな文字列を渡すので、コピーを避けるためにByRefにする（中では書き換えない）
Private Function BuildText(ByRef s As String) As String
```

特に揉めることはなかった。明らかに遅かったので、ここはこれで割り切りましょう、と話を進めたと思う。数字は覚えていないが、明らかに速くなった。倍以上は速くなっていた。

## その後

いいツールだと思ったので、その後もちょこちょこ使っていた。ただ、VBの案件はどんどん減っていったので、自然と使わなくなった。

---

![「VB6で作った割り切り簡易プロファイラー」の内容を1枚にまとめた図。計測用のコピーを改造する、入口に2行仕込んで参照カウントに出口を任せる、VBScriptの仕込みツール、測ったら文字列のByValがまるごとコピーされていた、遅かった所だけByRefに変える](@/assets/images/vb6-simple-profiler-overview.png)

## 参考資料

※「」の日本語訳は内容をつかみやすくするための便宜的な訳で、公式な邦題ではありません。

1. Microsoft, [“Circular References and Object Lifetime”](https://learn.microsoft.com/en-us/previous-versions/visualstudio/visual-basic-6/aa240808%28v=vs.60%29) - Visual Basic 6.0のドキュメント  
   **「循環参照とオブジェクトの有効期間」**  
   Microsoft Learn（アーカイブ）. 手続きの中で`As New`で宣言した変数は、最初にプロパティやメソッドを使った時点でオブジェクトが作られ、手続きを抜けると参照がなくなって`Terminate`が呼ばれる様子を、サンプルで追っている。

2. Microsoft, [“How Marshaling Affects ActiveX Component Performance”](https://learn.microsoft.com/en-us/previous-versions/visualstudio/visual-basic-6/aa242099%28v=vs.60%29) - Visual Basic 6.0のドキュメント  
   **「マーシャリングがActiveXコンポーネントの性能に与える影響」**  
   Microsoft Learn（アーカイブ）. 同じプロセスの中では、大きな文字列やVariantの配列は変更しなくても`ByRef`で渡すのが一般的で、文字列全体をコピーするよりポインタを渡すほうがずっと速い、と書かれている。

3. Microsoft, [“Parameter Passing Mechanism for Visual Basic 6.0 Users”](https://learn.microsoft.com/en-us/previous-versions/visualstudio/visual-studio-2008/41zywfyc%28v=vs.90%29) - Visual Studio 2008のドキュメント  
   **「Visual Basic 6.0ユーザー向けの引数の渡し方」**  
   Microsoft Learn（アーカイブ）. VB6では引数の既定が`ByRef`で、Visual Basic 2008では`ByVal`になったことが書かれている。
