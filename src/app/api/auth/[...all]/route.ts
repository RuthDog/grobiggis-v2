import { toNextJsHandler } from "better-auth/next-js";
import { getAuthForRequest } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

async function handleAuth(request: Request, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE") {
  try {
    const auth = await getAuthForRequest();
    const handlers = toNextJsHandler(auth);
    return handlers[method](request);
  } catch {
    return Response.json({ error: "Auth is not configured for this environment." }, { status: 503 });
  }
}

export const GET = (request: Request) => handleAuth(request, "GET");
export const POST = (request: Request) => handleAuth(request, "POST");
export const PATCH = (request: Request) => handleAuth(request, "PATCH");
export const PUT = (request: Request) => handleAuth(request, "PUT");
export const DELETE = (request: Request) => handleAuth(request, "DELETE");
