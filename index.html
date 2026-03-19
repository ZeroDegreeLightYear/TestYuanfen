import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing SILICONFLOW_API_KEY" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const body = await req.json();

    const upstream = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const contentType =
      upstream.headers.get("content-type") ||
      (body.stream ? "text/event-stream" : "application/json");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Function error",
        message: err instanceof Error ? err.message : String(err)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};