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

export type EmailDelivery = {
  id: string | null;
  queued: boolean;
  error?: string;
};

async function deliver(
  to: string,
  subject: string,
  html: string
): Promise<EmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(`[rooted:email:dev] To: ${to}\nSubject: ${subject}\n${html}`);
    return { id: "dev-log", queued: true };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      html,
    });
    if (result.error) {
      const message =
        typeof result.error === "object" && result.error && "message" in result.error
          ? String((result.error as { message?: string }).message)
          : "Email provider rejected the request";
      console.error("[rooted:email] Resend error:", result.error);
      return { id: null, queued: false, error: message };
    }
    return { id: result.data?.id ?? null, queued: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email provider unavailable";
    console.error("[rooted:email] Resend exception:", error);
    return { id: null, queued: false, error: message };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${appUrl()}/auth/user/verify?token=${encodeURIComponent(token)}`;
  const result = await deliver(
    email,
    "Verify your Rooted account",
    `<p>Welcome to <strong>Rooted</strong>.</p>
     <p><a href="${url}">Verify your email</a> to start building your family tree.</p>
     <p>This link expires in 24 hours.</p>
     <p style="color:#5c7a6a;font-size:12px">${url}</p>`
  );
  return { url, ...result };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${appUrl()}/auth/user/reset?token=${encodeURIComponent(token)}`;
  const result = await deliver(
    email,
    "Reset your Rooted password",
    `<p>We received a request to reset your Rooted password.</p>
     <p><a href="${url}">Choose a new password</a>.</p>
     <p>If you didn’t ask for this, you can ignore this email.</p>
     <p>This link expires in 1 hour.</p>
     <p style="color:#5c7a6a;font-size:12px">${url}</p>`
  );
  return { url, ...result };
}

export async function sendShareInviteEmail(
  email: string,
  inviterName: string,
  token: string,
  role: "view" | "edit"
) {
  const url = `${appUrl()}/share/invite?token=${encodeURIComponent(token)}`;
  const result = await deliver(
    email,
    `${inviterName} invited you to a Rooted family tree`,
    `<p><strong>${inviterName}</strong> invited you to ${
      role === "edit" ? "help edit" : "view"
    } a family tree on Rooted.</p>
     <p><a href="${url}">Open invitation</a></p>
     <p style="color:#5c7a6a;font-size:12px">${url}</p>`
  );
  return { url, ...result };
}
