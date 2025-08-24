export default {
  async fetch(request: Request): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 仅处理 POST 请求
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 验证 Authorization 头
    const authHeader = request.headers.get("Authorization");
    const TOKEN = Deno.env.get("TOKEN");
    if (TOKEN) {
      if (!authHeader || authHeader !== `Bearer ${TOKEN}`) {
        return new Response("Unauthorized", {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    try {
      // 解析请求体
      const body = await request.json();

      // **新增：自动补充默认模型**
      const DEFAULT_MODEL = Deno.env.get("DEFAULT_MODEL") || "meta-llama/Meta-Llama-3-70B-Instruct";
      if (!body.model) {
        body.model = DEFAULT_MODEL;
      }

      // 构造请求头（保持原样）
      const headers = new Headers({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
        "Accept": "text/event-stream",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        "sec-ch-ua-platform": "Windows",
        "X-Deepinfra-Source": "web-page",
        "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Microsoft Edge\";v=\"133\", \"Chromium\";v=\"133\"",
        "sec-ch-ua-mobile": "?0",
        "Origin": "https://deepinfra.com",
        "Sec-Fetch-Site": "same-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "Referer": "https://deepinfra.com/"
      });

      // 发送请求到 DeepInfra
      const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body) // 包含 model 字段的请求体
      });

      // 构造响应（保持原样）
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        }
      });

      return newResponse;

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
