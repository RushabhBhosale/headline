import nodemailer from "nodemailer";

const FROM_NAME = "Headline";
const FROM_ADDRESS = "headlinethread@gmail.com";

function getTransport() {
  const user = process.env.GMAIL_USER || FROM_ADDRESS;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!pass) {
    throw new Error("Email sending is not configured (missing GMAIL_APP_PASSWORD)");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export function newsletterFrom() {
  return `${FROM_NAME} <${process.env.GMAIL_USER || FROM_ADDRESS}>`;
}

export async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
  const transport = getTransport();
  await transport.sendMail({
    from: newsletterFrom(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export function emailShell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f2ee;font-family:Georgia,'Times New Roman',serif;color:#1a1a1f;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <p style="font-size:22px;font-weight:700;letter-spacing:.02em;margin:0 0 24px;">Headline.</p>
      <div style="background:#ffffff;border:1px solid #e3e0d8;padding:28px;">
        <h1 style="font-size:20px;margin:0 0 14px;">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="font-size:12px;color:#8a877e;margin-top:18px;">You are receiving this because you subscribed to the Headline newsletter.</p>
    </div>
  </body>
</html>`;
}
