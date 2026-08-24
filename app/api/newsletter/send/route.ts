import { getSanityServerClient } from "@/sanity/lib/sanityServerClient";
import { emailShell, sendMail } from "@/lib/mail";

export async function POST(request: Request) {
  const adminKey = process.env.NEWSLETTER_ADMIN_KEY;
  if (!adminKey || request.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let subject = "";
  let html = "";
  let text = "";
  try {
    const body = await request.json();
    subject = String(body?.subject ?? "").trim();
    html = String(body?.html ?? "");
    text = String(body?.text ?? "");
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!subject || (!html && !text)) {
    return Response.json({ error: "Subject and message content are required." }, { status: 400 });
  }

  let subscribers: string[];
  try {
    const client = getSanityServerClient();
    subscribers = await client.fetch(
      `*[_type == "subscriber" && unsubscribed != true && defined(email)].email`,
    );
  } catch (error) {
    console.error("Newsletter subscriber lookup failed", error);
    return Response.json({ error: "Could not load subscribers." }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json({ success: true, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;
  for (const to of subscribers) {
    try {
      await sendMail({
        to,
        subject,
        text,
        html: html || emailShell(subject, `<p style="font-size:15px;line-height:1.6;margin:0;">${text}</p>`),
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`Newsletter send to ${to} failed`, error);
    }
  }

  return Response.json({ success: true, sent, failed, total: subscribers.length });
}
