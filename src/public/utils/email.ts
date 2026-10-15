import { Resend } from "resend";

function appUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Rooted <onboarding@resend.dev>";
}

async function deliver(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[rooted:email:dev] To: ${to}\nSubject: ${subject}\n${html}`);
    return { id: "dev-log" };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromAddress(),
    to,
    subject,
    html,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${appUrl()}/auth/user/verify?token=${encodeURIComponent(token)}`;
  await deliver(
    email,
    "Verify your Rooted account",
    `<p>Welcome to <strong>Rooted</strong>.</p>
     <p><a href="${url}">Verify your email</a> to start building your family tree.</p>
     <p>This link expires in 24 hours.</p>
     <p style="color:#5c7a6a;font-size:12px">${url}</p>`
  );
  return url;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${appUrl()}/auth/user/reset?token=${encodeURIComponent(token)}`;
  await deliver(
    email,
    "Reset your Rooted password",
    `<p>We received a request to reset your Rooted password.</p>
     <p><a href="${url}">Choose a new password</a>.</p>
     <p>If you didn’t ask for this, you can ignore this email.</p>
     <p>This link expires in 1 hour.</p>
     <p style="color:#5c7a6a;font-size:12px">${url}</p>`
  );
  return url;
}

export async function sendShareInviteEmail(
  email: string,
  inviterName: string,
  token: string,
  role: "view" | "edit"
) {
  const url = `${appUrl()}/share/invite?token=${encodeURIComponent(token)}`;
  await deliver(
    email,
    `${inviterName} invited you to a Rooted family tree`,
    `<p><strong>${inviterName}</strong> invited you to ${
      role === "edit" ? "help edit" : "view"
    } a family tree on Rooted.</p>
     <p><a href="${url}">Open invitation</a></p>
     <p style="color:#5c7a6a;font-size:12px">${url}</p>`
  );
  return url;
}
