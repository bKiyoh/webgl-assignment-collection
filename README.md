# WebGLスクールポートフォリオサイト

このサイトは![WebGL スクール第１１期](https://webgl.souhonzan.org/entry/?v=2635)の課題作品ポートフォリオになります。

### 使用技術一覧
- Next.js
- Three.js
- WebGL

### URL
![https://webgl-collection-sigma.vercel.app/](https://webgl-collection-sigma.vercel.app/)

### CONTENTS

- ![Vol1](https://webgl-collection-sigma.vercel.app/vol1)：Box Geometryを使用してボックスを100以上作る
  - スペースキーを押すとボックスがあちこちに飛び散って、キーを離すと元の形に戻ります。
元の形に戻る動きを自然にするために、線形補間を利用して、少しずつ初期位置に戻す…みたいな工夫をしてます。

- ![Vol2](https://webgl-collection-sigma.vercel.app/vol2)：three.js の Group を駆使して「首振り機能つきの扇風機」を 実現する
  - 回転とポストプロセスを使用して朝霧の中に立つ風車をイメージして作成しました。

- ![Vol3](https://webgl-collection-sigma.vercel.app/vol3)：地球上を飛ぶ旅客機（のような動きをしてればOK）
  - オブジェクトの動き対してsin、cos、ベクトル、単位化を使用して作成しました。

- ![Vol4](https://webgl-collection-sigma.vercel.app/vol4)：Raycaster と Plane（板）を使ってなにか作ってみる
  - 今回は写真のポートフォリオをイメージしてシンプルに作成しました。Raycasterを利用して、写真をクリックすると裏の写真が表に表示されます。
また、スペースキーを押すとすべての写真が裏返ります。 （素材の写真は過去の自分が撮ったものを使用してます）

- ![Vol5](https://webgl-collection-sigma.vercel.app/vol5)：WebGLで五角形を作る
  - ネイティブなWebGLで紫陽花です。

- ![Vol6](https://webgl-collection-sigma.vercel.app/vol6)：頂点シェーダで行っている陰影計算を、フラグメントシェーダ上で行う にはどうしたらいいかを考えて実装
  - 陰影計算をフラグメントシェーダで実装 + 点光源を実装しました。
    同ページに頂点シェーダーで陰影計算をしたcanvasも載せることで比較できるようにしました。
    フラグメントシェーダで陰影実装（右）の方が細かく滑らかな印象になります。

- ![Vol7](https://webgl-collection-sigma.vercel.app/vol7)：テクスチャを複数同時に利用する実装
  - ３つのテクスチャーを２つのディストーションエフェクトを使用して切り替えています。
エフェクトのスピード調整して、類似した画像たちをじわじわ変化するように見せてます。
  - [使用している画像は以下のものになります
    - [Unsplash](https://unsplash.com/ja/%E5%86%99%E7%9C%9F/%E7%99%BD%E3%81%84%E8%83%8C%E6%99%AF%E3%81%AB%E9%9D%92%E3%81%84%E5%86%86%E3%81%AE%E3%81%BC%E3%82%84%E3%81%91%E3%81%9F%E7%94%BB%E5%83%8F-y9Ujplj3KIU?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)の[Ikhlas R.](https://unsplash.com/ja/@ikhlasrahman?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)が撮影した写真
    - [Unsplash](https://unsplash.com/ja/%E5%86%99%E7%9C%9F/%E9%9D%92%E3%81%84%E8%83%8C%E6%99%AF%E3%81%AB%E7%B7%91%E3%81%AE%E5%86%86%E3%81%AE%E3%81%BC%E3%82%84%E3%81%91%E3%81%9F%E7%94%BB%E5%83%8F-j79AzFDx_ek?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)の[Ikhlas R.](https://unsplash.com/ja/@ikhlasrahman?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)が撮影した写真
    - [Unsplash](https://unsplash.com/ja/%E5%86%99%E7%9C%9F/a-blurry-image-of-a-blue-circle-on-a-white-background-HRv8dqNPcHY?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)の[Ikhlas R.](https://unsplash.com/ja/@ikhlasrahman?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash)が撮影した写真


- ![Vol8](https://webgl-collection-sigma.vercel.app/vol8)：マウスカーソルの位置に応じて変化するポストエフェクト実装
  - ノイズディストーションを利用して空を表現しました。
１パス目の球体自体に対してノイズディストーション、２パス目でパネル全体とマウスポインタの座標にそれぞれノイズディストーションをかけてます。
  


