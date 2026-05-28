import { generateDailyAiSummary } from "@/app/api/generate-summary/route";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Response.json(
      {
        message: "CRON_SECRETが設定されていません。",
      },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      {
        message: "認証に失敗しました。",
      },
      { status: 401 },
    );
  }

  return generateDailyAiSummary();
}
