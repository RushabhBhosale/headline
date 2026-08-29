import { timingSafeEqual } from "node:crypto";
import { start } from "workflow/api";
import { processArticleImagesWorkflow } from "@/workflows/processArticleImages";

export const dynamic = "force-dynamic";

function hasValidSecret(request: Request) {
  const secret = process.env.SANITY_IMAGE_WORKFLOW_SECRET;
  const supplied = request.headers.get("x-sanity-image-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function getArticleId(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const input = payload as { _id?: unknown; documentId?: unknown; ids?: unknown; _type?: unknown; transition?: unknown };
  if (input._type !== undefined && input._type !== "article") return undefined;
  if (input.transition !== undefined && !["publish", "create", "update"].includes(input.transition as string)) return undefined;
  const candidate = typeof input._id === "string"
    ? input._id
    : typeof input.documentId === "string"
      ? input.documentId
      : Array.isArray(input.ids) && typeof input.ids[0] === "string"
        ? input.ids[0]
        : undefined;
  return candidate && /^(?:drafts\.)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(candidate) ? candidate : undefined;
}

export async function POST(request: Request) {
  if (!hasValidSecret(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body" }, { status: 400 });
  }
  const articleId = getArticleId(payload);
  if (!articleId) return Response.json({ skipped: true, reason: "Expected an article ID" });
  const run = await start(processArticleImagesWorkflow, [articleId]);
  console.info("Image automation: workflow started", { articleId, workflowRunId: run.runId });
  return Response.json({ accepted: true, articleId, workflowRunId: run.runId }, { status: 202 });
}
