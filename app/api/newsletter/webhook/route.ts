import { getSanityServerClient } from "@/sanity/lib/sanityServerClient";
import { emailShell, sendMail } from "@/lib/mail";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.headlinethread.co.in";

export async function POST(request: Request) {
  const adminKey = process.env.NEWSLETTER_ADMIN_KEY;
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] = [];
  let transition = "";
  try {
    const body = await request.json();
    ids = Array.isArray(body.ids) ? body.ids : body.documentId ? [body.documentId] : [];
    transition = body.transition || "";
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (transition !== "publish" || ids.length === 0) {
    return Response.json({ skipped: true });
  }

  const client = getSanityServerClient();

  let article: { title?: string; slug?: { current?: string }; excerpt?: string } | null = null;
  try {
    article = await client.fetch(
      `*[_type == "article" && _id == $id][0]{ title, slug, excerpt }`,
      { id: ids[0] },
    );
  } catch (error) {
    console.error("Webhook: failed to fetch article", error);
    return Response.json({ error: "Could not fetch article." }, { status: 500 });
  }

  if (!article?.title || !article.slug?.current) {
    return Response.json({ skipped: true });
  }

  let subscribers: string[];
  try {
    subscribers = await client.fetch(
      `*[_type == "subscriber" && unsubscribed != true && defined(email)].email`,
    );
  } catch (error) {
    console.error("Webhook: subscriber lookup failed", error);
    return Response.json({ error: "Could not load subscribers." }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json({ success: true, sent: 0 });
  }

  const articleUrl = `${SITE_URL}/articles/${article.slug.current}`;
  const excerpt = article.excerpt
    ? `<p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 18px;">${article.excerpt}</p>`
    : "";
  const bodyHtml = `
    ${excerpt}
    <a href="${articleUrl}" style="display:inline-block;background:#1a1a1f;color:#ffffff;font-family:Georgia,serif;font-size:14px;text-decoration:none;padding:10px 22px;margin-top:4px;">Read the full story</a>
  `;
  const html = emailShell(article.title, bodyHtml);
  const text = article.title + (article.excerpt ? `\n\n${article.excerpt}` : "") + `\n\nRead: ${articleUrl}`;

  let sent = 0;
  let failed = 0;
  const results = await Promise.allSettled(
    subscribers.map((to) =>
      sendMail({ to, subject: article.title!, html, text }),
    ),
  );
  for (const r of results) {
    if (r.status === "fulfilled") sent++;
    else {
      failed++;
      console.error("Webhook: send failed", r.reason);
    }
  }

  return Response.json({ success: true, sent, failed, total: subscribers.length });
}
