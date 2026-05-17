# Dev AI Digest

Dev AI Digestは、AI・開発ツール関連ニュースをRSSから取得し、気になる記事を保存・読了管理できる開発者向けニュースダッシュボードです。

## 作成目的

AI時代のフロントエンドエンジニアとして、日々増えるAI・開発ツール関連ニュースを自分で探し回らずに確認し、気になる記事だけ保存・振り返りできるようにするために作成します。

## v1スコープ

- ユーザー認証
- 固定RSSフィードからの記事取得
- 取得記事のDB保存
- URL重複排除
- 記事一覧表示
- ソース別・キーワード検索
- 気になる記事の保存
- 保存記事の読了 / 未読管理
- 保存記事へのメモ追加

## v1でやらないこと

- AIによる自動要約
- LINE通知
- Vercel Cronによる定期取得
- ユーザーごとのRSSフィード追加
- 記事本文のスクレイピング
- 月次レポート
- 株ポートフォリオ連携
- レコメンド機能

## 技術スタック予定

- Next.js
- TypeScript
- Supabase
- Supabase Auth
- Supabase RLS
- Vercel
- Tailwind CSS

## DB設計

### articles

RSSから取得した記事本体を保存する共通テーブルです。

主なカラム：

- id: 記事ID
- title: 記事タイトル
- url: 記事URL
- source: 情報源
- category: カテゴリ
- published_at: 記事の公開日時
- fetched_at: RSSから取得した日時
- created_at: レコード作成日時

設計方針：

- `url` に unique 制約を設定し、同じ記事が重複登録されないようにします
- v1では未ログインユーザーを含めて、記事一覧を閲覧できる想定です
- クライアントから誰でも記事を追加・編集・削除できるようにはしません
- 記事追加は、管理画面またはサーバー側のRSS取得処理から行う想定です

### saved_articles

ユーザーが保存した記事の状態を管理するテーブルです。

主なカラム：

- id: 保存記事ID
- user_id: 保存したユーザーID
- article_id: 保存対象の記事ID
- status: 読了状態
- memo: ユーザーごとのメモ
- created_at: 保存日時
- updated_at: 更新日時

設計方針：

- `user_id` と `article_id` の組み合わせに unique 制約を設定し、同じユーザーが同じ記事を重複保存できないようにします
- `status` は v1 では `unread` / `read` の2種類です
- メモや読了状態はユーザーごとに管理します
- 記事本体とユーザー固有の保存状態を分けることで、RSS取得データと個人の管理データを切り分けます

## RLS方針

### articles

- Row Level Security を有効化済みです
- 未ログインユーザーを含めて、記事一覧は閲覧可能です
- v1ではクライアントからの insert / update / delete は許可しません
- 記事追加は、管理画面またはサーバー側のRSS取得処理から行う想定です

### saved_articles

- Row Level Security を有効化済みです
- ログイン済みユーザーは自分の保存記事だけ閲覧できます
- ログイン済みユーザーは自分の保存記事だけ追加できます
- ログイン済みユーザーは自分の保存記事だけ更新できます
- ログイン済みユーザーは自分の保存記事だけ削除できます

設計意図：

- `articles` はRSSから取得した共通の記事データなので、一覧閲覧は公開します
- `saved_articles` はユーザーごとの保存状態・読了状態・メモを持つため、本人だけが操作できるようにします
- 「記事一覧は公開、保存・メモはログイン後」という役割分担にします

## RSS取得機能

Dev AI Digestでは、固定RSSフィードから記事を取得し、`articles` テーブルに保存します。

### 対象RSSフィード

現在のv1では、以下の固定RSSフィードを対象にしています。

- OpenAI News
  - category: AIモデル
- Zenn LLM
  - category: AI活用
- Qiita AI
  - category: AI活用

### 取得方法

- トップページの「ニュースを取得」ボタンから手動でRSS取得を実行します
- ボタン押下時に `POST /api/fetch-news` を呼び出します
- Route Handler内でRSSを取得・パースし、`articles` テーブルに保存します
- `articles.url` のunique制約を使い、同じ記事が重複登録されないようにしています

### セキュリティ方針

- `articles` への追加はクライアントから直接行いません
- RSS取得・DB保存はRoute Handler経由で実行します
- サーバー側では `SUPABASE_SERVICE_ROLE_KEY` を使用します
- `SUPABASE_SERVICE_ROLE_KEY` は `NEXT_PUBLIC_` を付けず、ブラウザに公開しません
- service role keyは `.env.local` で管理し、Gitには含めません

### v1でやらないこと

RSS取得に関して、v1では以下はまだ実装しません。

- Vercel Cronによる自動取得
- AIによる記事要約
- LINE通知
- ユーザーごとのRSSフィード追加
- 記事本文のスクレイピング
- 取得履歴テーブル
- 高度なレコメンド

## 環境変数

RSS取得機能では、既存のSupabase接続情報に加えて、サーバー側で以下の環境変数を使用します。

- `SUPABASE_SERVICE_ROLE_KEY`

注意点：

- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側専用です
- `NEXT_PUBLIC_` を付けないでください
- `.env.local` に設定し、Gitにはコミットしないでください

## 今後の拡張

- AIによる記事要約
- RSS取得の自動化
- LINE通知
- 週次・月次の振り返り
- ユーザーごとのRSSフィード管理
