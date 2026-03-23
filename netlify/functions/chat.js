// netlify/functions/chat.js - 纯JavaScript版本，兼容Netlify部署
export default async (req, context) => {
  // 配置跨域响应头（解决前端跨域问题）
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // 生产环境建议指定具体域名
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    // 处理OPTIONS预检请求（前端POST前必过的跨域校验）
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 仅允许POST方法
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 校验API Key是否配置
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing SILICONFLOW_API_KEY" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 解析请求体（增加错误捕获，避免非法JSON导致崩溃）
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", message: e.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 转发请求到SiliconFlow API
    const upstream = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    // 适配流式/非流式响应类型
    const contentType = upstream.headers.get("content-type") || (body.stream ? "text/event-stream" : "application/json");

    // 透传SiliconFlow的响应给前端
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-cache"
      }
    });

  } catch (err) {
    // 全局异常捕获，返回友好错误
    return new Response(
      JSON.stringify({
        error: "Function error",
        message: err instanceof Error ? err.message : String(err)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};