import { createRequestHandler } from "@react-router/node";
import * as build from "../build/server/index.js";

const handler = createRequestHandler({
  build,
  mode: process.env.NODE_ENV,
});

export default async function vercelHandler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: hasBody ? req : null,
      ...(hasBody ? { duplex: "half" } : {}),
    });

    const response = await handler(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }

    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
  } catch (error) {
    console.error("Vercel handler error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
