import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

type LineWebhookEvent = {
  source?: {
    userId?: string;
  };
};

type LineWebhookBody = {
  events?: LineWebhookEvent[];
};

function isValidLineSignature(
  body: string,
  channelSecret: string,
  signature: string | null,
) {
  if (!signature) {
    return false;
  }

  const expectedSignature = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");

  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedSignatureBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedSignatureBuffer, signatureBuffer);
}

function parseLineWebhookBody(body: string): LineWebhookBody | null {
  try {
    const data: unknown = JSON.parse(body);

    if (!data || typeof data !== "object") {
      return null;
    }

    return data as LineWebhookBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    return Response.json(
      {
        message: "LINE_CHANNEL_SECRETが設定されていません。",
      },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!isValidLineSignature(body, channelSecret, signature)) {
    return Response.json(
      {
        message: "署名検証に失敗しました。",
      },
      { status: 401 },
    );
  }

  const webhookBody = parseLineWebhookBody(body);

  if (!webhookBody) {
    return Response.json(
      {
        message: "Webhook bodyの解析に失敗しました。",
      },
      { status: 400 },
    );
  }

  for (const event of webhookBody.events ?? []) {
    const userId = event.source?.userId;

    if (userId) {
      console.log("LINE webhook source.userId:", userId);
    }
  }

  return Response.json({
    ok: true,
  });
}
