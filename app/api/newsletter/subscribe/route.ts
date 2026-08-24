import { getSanityServerClient } from "@/sanity/lib/sanityServerClient";
import { emailShell, sendMail } from "@/lib/mail";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const client = getSanityServerClient();
    const existing = await client
      .fetch<{ _id: string; unsubscribed: boolean } | null>(
        `*[_type == "subscriber" && lower(email) == $email][0]{_id, unsubscribed}`,
        { email },
      );

    if (existing && !existing.unsubscribed) {
      return Response.json({ success: true, message: "You are already subscribed." });
    }

    if (existing) {
      await client.patch(existing._id).set({ unsubscribed: false }).commit();
    } else {
      await client.create({
        _type: "subscriber",
        email,
        subscribedAt: new Date().toISOString(),
        unsubscribed: false,
      });
    }
  } catch (error) {
    console.error("Newsletter subscribe failed", error);
    return Response.json({ error: "Could not save your subscription. Please try again." }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://headlinethread.com";
  try {
    await sendMail({
      to: email,
      subject: "Welcome to the Headline newsletter",
      text: `Thanks for subscribing to Headline. You'll now receive our top stories and clear context on the stories that matter. Visit us: ${siteUrl}`,
      html: emailShell(
        "You're in.",
        `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Thanks for subscribing to <strong>Headline</strong>. We'll send you our top stories and clear context on the stories that matter.</p><p style="font-size:15px;line-height:1.6;margin:0;"><a href="${siteUrl}" style="color:#1a1a1f;">Read the latest stories &#8594;</a></p>`,
      ),
    });
  } catch (error) {
    console.error("Newsletter welcome email failed", error);
    return Response.json(
      { success: true, message: "Subscribed, but the confirmation email could not be sent." },
      { status: 202 },
    );
  }

  return Response.json({ success: true, message: "Subscribed! Check your inbox for a welcome email." });
}
