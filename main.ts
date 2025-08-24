export default {
  async fetch(request: Request): Promise<Response> {
    // List of allowed models
    const allowedModels = new Set([
      "deepseek-ai/DeepSeek-V3.1",
      "openai/gpt-oss-120b",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo",
      "zai-org/GLM-4.5",
      "moonshotai/Kimi-K2-Instruct",
      "allenai/olmOCR-7B-0725-FP8",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "zai-org/GLM-4.5-Air",
      "mistralai/Voxtral-Small-24B-2507",
      "mistralai/Voxtral-Mini-3B-2507",
      "deepseek-ai/DeepSeek-R1-0528-Turbo",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-30B-A3B",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-14B",
      "deepseek-ai/DeepSeek-V3-0324-Turbo",
      "bigcode/starcoder2-15b",
      "Phind/Phind-CodeLlama-34B-v2",
      "Gryphe/MythoMax-L2-13b",
      "openchat/openchat_3.5",
      "openai/whisper-tiny",
      "meta-llama/Llama-3.3-70B-Instruct"
    ]);

    // Get URL and pathname to handle routing
    const url = new URL(request.url);

    // --- ADDED: Handle GET /v1/models endpoint ---
    if (url.pathname === "/v1/models" && request.method === "GET") {
      const modelList = Array.from(allowedModels).map(modelId => ({
        id: modelId,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "deepinfra",
      }));

      const responseData = {
        object: "list",
        data: modelList,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    // --- END of ADDED section ---

    // Handle CORS preflight request for other endpoints
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // From here, we only handle the chat completions proxy
    if (url.pathname !== "/v1/openai/chat/completions" && url.pathname !== "/v1/chat/completions") {
        return new Response("Not Found", { status: 404 });
    }

    // Only handle POST requests for chat completions
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Validate Authorization header
    const authHeader = request.headers.get("Authorization");
    const TOKEN = Deno.env.get("TOKEN");
    if (TOKEN) {
      if (!authHeader || authHeader !== `Bearer ${TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    try {
      // Clone request body
      const body = await request.json();

      // Validate the model from the request body
      if (!body.model || !allowedModels.has(body.model)) {
        return new Response(JSON.stringify({ error: "Invalid or unsupported model specified." }), {
          status: 400, // 400 Bad Request
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      // Construct new request headers
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

      // Send request to DeepInfra
      const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
      });

      // Construct response
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
