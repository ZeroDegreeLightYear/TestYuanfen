import type { Context } from "@netlify/functions";

// 核心：添加跨域响应头（解决浏览器拦截问题）
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // 生产环境建议指定你的域名，如 https://xxx.netlify.app
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400" // 预检请求缓存1天，减少请求次数
};

export default async (req: Request, context: Context) => {
  try {
    // 1. 必须处理 OPTIONS 预检请求（前端 POST 前会先发这个请求）
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204, // 无内容响应，仅返回头
        headers: CORS_HEADERS
      });
    }

    // 2. 仅允许 POST 请求
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed", allowed: "POST" }),
        {
          status: 405,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        }
      );
    }

    // 3. 验证 API Key
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      console.error("环境变量 SILICONFLOW_API_KEY 未配置"); // 日志便于排查
      return new Response(
        JSON.stringify({ error: "Server error: Missing API key" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        }
      );
    }

    // 4. 解析请求体（处理 JSON 解析失败的情况）
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", message: (err as Error).message }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        }
      );
    }

    // 5. 转发请求到硅基流动 API
    const upstream = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      redirect: "follow" // 处理重定向
    });

    // 6. 确定响应类型（兼容流式/非流式）
    const contentType =
      upstream.headers.get("content-type") ||
      (body.stream ? "text/event-stream" : "application/json");

    // 7. 构建响应头（合并跨域头 + 流式配置）
    const responseHeaders = {
      ...CORS_HEADERS,
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    };
    // 流式响应额外配置
    if (contentType.includes("event-stream")) {
      Object.assign(responseHeaders, {
        "Connection": "keep-alive",
        "Transfer-Encoding": "chunked"
      });
    }

    // 8. 处理上游响应为空的情况（兜底）
    if (!upstream.body) {
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: responseHeaders
      });
    }

    // 9. 返回最终响应
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });

  } catch (err) {
    // 全局错误捕获
    const error = err as Error;
    console.error("函数运行错误：", error.message, error.stack);
    return new Response(
      JSON.stringify({
        error: "Function error",
        message: error.message
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      }
    );
  }
};