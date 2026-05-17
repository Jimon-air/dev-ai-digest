export type RssFeed = {
  name: string;
  url: string;
  category: string;
};

export const rssFeeds: RssFeed[] = [
  {
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    category: "AIモデル",
  },
  {
    name: "Zenn LLM",
    url: "https://zenn.dev/topics/llm/feed",
    category: "AI活用",
  },
  {
    name: "Qiita AI",
    url: "https://qiita.com/tags/AI/feed.atom",
    category: "AI活用",
  },
];
