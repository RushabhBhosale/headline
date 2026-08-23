import { timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import type { SanityImageAssetDocument } from "@sanity/client";
import { getSanityServerClient } from "./sanityServerClient";

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const MAX_REQUEST_BODY_BYTES = MAX_IMAGE_SIZE_BYTES + 128 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ImageUploadInput = {
  imageUrl?: string;
  file?: File;
  alt: string;
  caption?: string;
  credit?: string;
};

export type UploadedImage = {
  id: string;
  ref: string;
  url: string;
  width: number;
  height: number;
};

export class ImageApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function optionalText(value: unknown, field: string, maxLength = 1_000) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new ImageApiError(400, `${field} must be text`);

  const text = value.trim();
  if (!text || text.length > maxLength) {
    throw new ImageApiError(400, `${field} must be between 1 and ${maxLength} characters`);
  }
  return text;
}

function requiredText(value: unknown, field: string, maxLength = 1_000) {
  const text = optionalText(value, field, maxLength);
  if (!text) throw new ImageApiError(400, `${field} is required`);
  return text;
}

export function validateImageRequestSize(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return;

  const size = Number(contentLength);
  if (Number.isFinite(size) && size > MAX_REQUEST_BODY_BYTES) {
    throw new ImageApiError(413, "Image is too large");
  }
}

export async function parseImageUploadInput(request: Request): Promise<ImageUploadInput> {
  validateImageRequestSize(request);
  const contentType = request.headers.get("content-type") || "";

  if (contentType.startsWith("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ImageApiError(400, "Invalid JSON request body");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ImageApiError(400, "Request body must be an object");
    }

    const input = body as Record<string, unknown>;
    return {
      imageUrl: requiredText(input.imageUrl, "imageUrl", 2_048),
      alt: requiredText(input.alt, "alt"),
      caption: optionalText(input.caption, "caption"),
      credit: optionalText(input.credit, "credit"),
    };
  }

  if (contentType.startsWith("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ImageApiError(400, "Invalid multipart request body");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ImageApiError(400, "file is required");

    return {
      file,
      alt: requiredText(formData.get("alt"), "alt"),
      caption: optionalText(formData.get("caption"), "caption"),
      credit: optionalText(formData.get("credit"), "credit"),
    };
  }

  throw new ImageApiError(400, "Content-Type must be application/json or multipart/form-data");
}

export function requireAutomationAuthorization(request: Request) {
  const secret = process.env.CONTENT_AUTOMATION_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret) throw new ImageApiError(500, "Server configuration is missing");
  if (!authorization?.startsWith("Bearer ")) throw new ImageApiError(401, "Unauthorized");

  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new ImageApiError(401, "Unauthorized");
  }
}

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function expandIpv6(address: string) {
  let value = address.toLowerCase();
  const ipv4Start = value.lastIndexOf(":") + 1;
  const ipv4Tail = value.slice(ipv4Start);

  if (ipv4Tail.includes(".")) {
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ipv4Tail)) return [];
    const octets = ipv4Tail.split(".").map(Number);
    if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) return [];
    value = `${value.slice(0, ipv4Start)}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }

  const [head = "", tail] = value.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const missingGroups = 8 - headGroups.length - tailGroups.length;

  if ((tail === undefined && missingGroups !== 0) || missingGroups < 0) return [];
  return [...headGroups, ...Array(missingGroups).fill("0"), ...tailGroups].map((group) => group.padStart(4, "0"));
}

function isBlockedIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version !== 6) return true;

  const groups = expandIpv6(address);
  if (groups.length !== 8) return true;
  const firstGroup = Number.parseInt(groups[0], 16);
  const isIpv4Mapped = groups.slice(0, 5).every((group) => group === "0000") && groups[5] === "ffff";

  if (isIpv4Mapped) {
    const mappedIpv4 = [
      Number.parseInt(groups[6].slice(0, 2), 16),
      Number.parseInt(groups[6].slice(2), 16),
      Number.parseInt(groups[7].slice(0, 2), 16),
      Number.parseInt(groups[7].slice(2), 16),
    ].join(".");
    return isBlockedIpv4(mappedIpv4);
  }

  return (
    groups.every((group) => group === "0000") ||
    (groups.slice(0, 7).every((group) => group === "0000") && groups[7] === "0001") ||
    (firstGroup >= 0xfc00 && firstGroup <= 0xfdff) ||
    (firstGroup >= 0xfe80 && firstGroup <= 0xfeff)
  );
}

async function resolvePublicAddresses(hostname: string) {
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    throw new ImageApiError(400, "imageUrl must not target an internal host");
  }

  const literalAddress = hostname.replace(/^\[(.*)\]$/, "$1");
  if (isIP(literalAddress)) {
    if (isBlockedIp(literalAddress)) throw new ImageApiError(400, "imageUrl must not target an internal address");
    return [{ address: literalAddress, family: isIP(literalAddress) }];
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ImageApiError(400, "imageUrl host could not be resolved");
  }

  if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) {
    throw new ImageApiError(400, "imageUrl must not target an internal address");
  }
  return addresses;
}

function validateRemoteUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ImageApiError(400, "imageUrl must be a valid URL");
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new ImageApiError(400, "imageUrl must use http or https without credentials");
  }
  return url;
}

type RemoteResponse =
  | { redirect: string }
  | { data: Buffer; contentType: string };

async function downloadOnce(url: URL): Promise<RemoteResponse> {
  const addresses = await resolvePublicAddresses(url.hostname);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const remoteRequest = transport.request(
      url,
      {
        method: "GET",
        agent: false,
        headers: { Accept: "image/jpeg, image/png, image/webp" },
        lookup: (_hostname, _options, callback) => {
          const address = addresses[0];
          callback(null, address.address, address.family);
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400) {
          response.resume();
          const location = response.headers.location;
          if (!location) {
            reject(new ImageApiError(400, "Image redirect is missing a location"));
            return;
          }
          resolve({ redirect: location });
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new ImageApiError(400, "Image URL returned an unsuccessful response"));
          return;
        }

        const contentType = response.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
        if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
          response.resume();
          reject(new ImageApiError(415, "Unsupported image type"));
          return;
        }

        const declaredSize = Number(response.headers["content-length"]);
        if (Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_SIZE_BYTES) {
          response.resume();
          reject(new ImageApiError(413, "Image is too large"));
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer | Uint8Array) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > MAX_IMAGE_SIZE_BYTES) {
            response.destroy(new ImageApiError(413, "Image is too large"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("error", reject);
        response.on("end", () => resolve({ data: Buffer.concat(chunks), contentType }));
      },
    );

    remoteRequest.setTimeout(REQUEST_TIMEOUT_MS, () => {
      remoteRequest.destroy(new ImageApiError(400, "Image download timed out"));
    });
    remoteRequest.on("error", reject);
    remoteRequest.end();
  });
}

async function downloadRemoteImage(imageUrl: string) {
  let url = validateRemoteUrl(imageUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await downloadOnce(url);
    if ("data" in response) return response;

    if (redirectCount === MAX_REDIRECTS) {
      throw new ImageApiError(400, "Image URL redirected too many times");
    }
    url = validateRemoteUrl(new URL(response.redirect, url).toString());
  }

  throw new ImageApiError(400, "Unable to download image");
}

function createAssetResponse(asset: SanityImageAssetDocument): UploadedImage {
  return {
    id: asset._id,
    ref: asset._id,
    url: asset.url,
    width: asset.metadata.dimensions.width,
    height: asset.metadata.dimensions.height,
  };
}

export async function uploadSanityImage(input: ImageUploadInput): Promise<UploadedImage> {
  let data: Buffer;
  let contentType: string;

  if (input.file) {
    if (!ALLOWED_IMAGE_TYPES.has(input.file.type)) {
      throw new ImageApiError(415, "Unsupported image type");
    }
    if (input.file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new ImageApiError(413, "Image is too large");
    }
    data = Buffer.from(await input.file.arrayBuffer());
    contentType = input.file.type;
  } else if (input.imageUrl) {
    const remoteImage = await downloadRemoteImage(input.imageUrl);
    data = remoteImage.data;
    contentType = remoteImage.contentType;
  } else {
    throw new ImageApiError(400, "Provide imageUrl or file");
  }

  const asset = await getSanityServerClient().assets.upload("image", data, {
    contentType,
    extract: ["image"],
    tag: "content-automation.image-upload",
  });

  return createAssetResponse(asset);
}

export function imageApiErrorResponse(error: unknown) {
  if (error instanceof ImageApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Sanity image API error", error);
  return Response.json({ error: "Unable to process image" }, { status: 500 });
}
