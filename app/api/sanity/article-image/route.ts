import { randomUUID } from "node:crypto";
import {
  ImageApiError,
  imageApiErrorResponse,
  parseImageUploadInput,
  requireAutomationAuthorization,
  uploadSanityImage,
  validateImageRequestSize,
} from "@/sanity/lib/imageUpload";
import { getSanityServerClient } from "@/sanity/lib/sanityServerClient";

type ArticleDocument = {
  _id: string;
  _type: string;
  _rev: string;
  body?: { _key?: string }[];
};

function getOptionalFormField(value: FormDataEntryValue | null, field: string) {
  if (value === null || value === "") return undefined;
  if (typeof value !== "string") throw new ImageApiError(400, `${field} must be text`);
  return value.trim();
}

async function parseArticleInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.startsWith("application/json")) {
    let body: unknown;
    try {
      body = await request.clone().json();
    } catch {
      throw new ImageApiError(400, "Invalid JSON request body");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ImageApiError(400, "Request body must be an object");
    }
    const input = body as Record<string, unknown>;
    return {
      articleId: input.articleId,
      placement: input.placement,
      afterBlockKey: input.afterBlockKey,
    };
  }

  if (contentType.startsWith("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.clone().formData();
    } catch {
      throw new ImageApiError(400, "Invalid multipart request body");
    }
    return {
      articleId: getOptionalFormField(formData.get("articleId"), "articleId"),
      placement: getOptionalFormField(formData.get("placement"), "placement"),
      afterBlockKey: getOptionalFormField(formData.get("afterBlockKey"), "afterBlockKey"),
    };
  }

  throw new ImageApiError(400, "Content-Type must be application/json or multipart/form-data");
}

function requireArticleId(value: unknown) {
  if (typeof value !== "string" || !/^(?:drafts\.)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw new ImageApiError(400, "articleId is invalid");
  }
  return value;
}

function requirePlacement(value: unknown) {
  if (value !== "hero" && value !== "body") {
    throw new ImageApiError(400, "placement must be hero or body");
  }
  return value;
}

function validateAfterBlockKey(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new ImageApiError(400, "afterBlockKey is invalid");
  }
  return value;
}

async function getArticle(articleId: string) {
  const article = await getSanityServerClient().getDocument<ArticleDocument>(articleId);
  if (!article) throw new ImageApiError(404, "Article not found");
  if (article._type !== "article") throw new ImageApiError(400, "Document is not an article");
  return article;
}

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error &&
    ((error as { statusCode?: unknown }).statusCode === 409 || (error as { statusCode?: unknown }).statusCode === 412);
}

export async function POST(request: Request) {
  try {
    requireAutomationAuthorization(request);
    validateImageRequestSize(request);
    const articleInput = await parseArticleInput(request);
    const articleId = requireArticleId(articleInput.articleId);
    const placement = requirePlacement(articleInput.placement);
    const afterBlockKey = validateAfterBlockKey(articleInput.afterBlockKey);
    const article = await getArticle(articleId);

    if (placement === "body" && afterBlockKey && !article.body?.some((block) => block._key === afterBlockKey)) {
      throw new ImageApiError(400, "afterBlockKey was not found in the article body");
    }

    const input = await parseImageUploadInput(request);
    const asset = await uploadSanityImage(input);
    const client = getSanityServerClient();

    try {
      if (placement === "hero") {
        const patch = client.patch(article._id).ifRevisionId(article._rev).set({
          heroImage: { _type: "image", asset: { _type: "reference", _ref: asset.ref } },
          heroImageAlt: input.alt,
        });
        if (input.caption) patch.set({ heroImageCaption: input.caption });
        else patch.unset(["heroImageCaption"]);
        if (input.credit) patch.set({ heroImageCredit: input.credit });
        else patch.unset(["heroImageCredit"]);
        await patch.commit();

        return Response.json({ success: true, articleId: article._id, placement, asset }, { status: 201 });
      }

      const blockKey = randomUUID().replaceAll("-", "");
      const block = {
        _key: blockKey,
        _type: "image",
        asset: { _type: "reference", _ref: asset.ref },
        alt: input.alt,
        caption: input.caption,
        credit: input.credit,
      };
      const patch = client.patch(article._id).ifRevisionId(article._rev);

      if (afterBlockKey) {
        patch.insert("after", `body[_key == \"${afterBlockKey}\"]`, [block]);
      } else if (Array.isArray(article.body)) {
        patch.append("body", [block]);
      } else {
        patch.set({ body: [block] });
      }
      await patch.commit();

      return Response.json({ success: true, articleId: article._id, placement, asset, blockKey }, { status: 201 });
    } catch (error) {
      if (isConflict(error)) throw new ImageApiError(409, "Article changed while the image was uploading; retry the request");
      throw error;
    }
  } catch (error) {
    return imageApiErrorResponse(error);
  }
}
