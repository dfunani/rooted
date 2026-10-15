"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";

import styles from "@/src/components/canvas.module.css";
import { StateReducerType } from "@/src/public/types/states";
import { CLEAR as clearUser } from "@/lib/reducers/user";
import { CLEAR as clearProfile } from "@/lib/reducers/profile";
import { CLEAR as clearEditor } from "@/lib/reducers/editor";

type Props = {
  open: boolean;
  onClose: () => void;
  onDeleteTree: () => void;
};

type ApiKeyRow = {
  user_id: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
};

type ShareState = {
  visibility: "private" | "link";
  shareUrl: string | null;
  collaborators: Array<{
    email: string;
    role: "view" | "edit";
    acceptedAt?: string | null;
  }>;
};

export default function ProfilePanel(props: Props) {
  const dispatch = useDispatch();
  const userState = useSelector((state: StateReducerType) => state.user);
  const profileState = useSelector((state: StateReducerType) => state.profile);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [share, setShare] = useState<ShareState | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"view" | "edit">("view");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function loadKeys() {
    if (!userState.id) return;
    const response = await fetch(
      `/api/auth/user/token/key?id=${userState.id}`,
      { method: "GET" }
    );
    const data = await response.json();
    if (response.ok && Array.isArray(data.message)) {
      setKeys(data.message);
    } else {
      setKeys([]);
    }
  }

  async function loadShare() {
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list" }),
    });
    if (response.ok) {
      const data = await response.json();
      setShare(data.message);
    }
  }

  async function createKey() {
    if (!userState.id) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/user/token/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userState.id,
          expires: 60 * 24 * 30,
        }),
      });
      if (response.ok) await loadKeys();
    } finally {
      setBusy(false);
    }
  }

  async function toggleShareLink() {
    setBusy(true);
    setNote(null);
    try {
      const action =
        share?.visibility === "link" ? "disable_link" : "enable_link";
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        await loadShare();
        setNote(
          action === "enable_link"
            ? "Share link enabled. Anyone with the link can view."
            : "Share link disabled."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!inviteEmail) return;
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      if (response.ok) {
        setInviteEmail("");
        await loadShare();
        setNote("Invite sent.");
      } else {
        setNote("Could not send invite.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyShareUrl() {
    if (!share?.shareUrl) return;
    await navigator.clipboard.writeText(share.shareUrl);
    setNote("Share link copied.");
  }

  async function handleLogout() {
    dispatch(clearUser());
    dispatch(clearProfile());
    dispatch(clearEditor());
    await signOut({ callbackUrl: "/auth/user/login" });
  }

  useEffect(() => {
    if (props.open) {
      loadKeys();
      loadShare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, userState.id]);

  if (!props.open) return null;

  const initials = `${profileState.name?.[0] ?? "R"}${profileState.surname?.[0] ?? ""}`;

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={props.onClose} />
      <aside className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h2>Account</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        <div className={styles.profileCard}>
          {profileState.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileState.image} alt="Profile" />
          ) : (
            <div className={styles.profileFallback}>{initials}</div>
          )}
          <div>
            <strong>
              {profileState.name} {profileState.surname}
            </strong>
            <div style={{ color: "var(--sage)", fontSize: "0.9rem" }}>
              {userState.email}
            </div>
            <div style={{ color: "var(--sage)", fontSize: "0.85rem" }}>
              {[profileState.city, profileState.country]
                .filter(Boolean)
                .join(", ")}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.drawerHeader}>
            <h2 style={{ fontSize: "1.2rem" }}>Sharing & privacy</h2>
          </div>
          <p style={{ color: "var(--sage)", marginTop: 0, fontSize: "0.9rem" }}>
            Trees are private by default. Enable a view-only link or invite
            people by email.
          </p>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={toggleShareLink}
              disabled={busy}
            >
              {share?.visibility === "link"
                ? "Disable share link"
                : "Enable view-only link"}
            </button>
            {share?.shareUrl && (
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={copyShareUrl}
              >
                Copy share link
              </button>
            )}
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Invite email"
              style={{
                padding: "0.7rem 0.85rem",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--content)",
              }}
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "view" | "edit")
              }
              style={{
                padding: "0.7rem 0.85rem",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--panel)",
                color: "var(--content)",
              }}
            >
              <option value="view">Can view</option>
              <option value="edit">Can edit</option>
            </select>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={invite}
              disabled={busy}
            >
              Send invite
            </button>
            {(share?.collaborators?.length ?? 0) > 0 && (
              <div className={styles.apiList}>
                {share!.collaborators.map((c) => (
                  <div className={styles.apiItem} key={`${c.email}-${c.role}`}>
                    <div>
                      <div>{c.email}</div>
                      <div style={{ color: "var(--sage)", fontSize: "0.75rem" }}>
                        {c.role}
                        {c.acceptedAt ? " · accepted" : " · pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {note && (
              <p style={{ color: "var(--sage)", margin: 0, fontSize: "0.85rem" }}>
                {note}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className={styles.drawerHeader}>
            <h2 style={{ fontSize: "1.2rem" }}>API Keys</h2>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={createKey}
              disabled={busy}
            >
              New key
            </button>
          </div>
          <div className={styles.apiList}>
            {keys.length === 0 && (
              <p style={{ color: "var(--sage)", margin: 0 }}>
                No API keys yet. Create one to access Rooted programmatically.
              </p>
            )}
            {keys.map((row) => {
              const masked =
                revealed === row.apiKey
                  ? row.apiKey
                  : `${"•".repeat(Math.max(row.apiKey.length - 4, 4))}${row.apiKey.slice(-4)}`;
              return (
                <div
                  className={styles.apiItem}
                  key={`${row.apiKey}-${row.expiresAt}`}
                >
                  <div>
                    <code>{masked}</code>
                    <div style={{ color: "var(--sage)", fontSize: "0.75rem" }}>
                      Expires {new Date(row.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() =>
                      setRevealed((prev) =>
                        prev === row.apiKey ? null : row.apiKey
                      )
                    }
                  >
                    {revealed === row.apiKey ? "Hide" : "Show"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "grid", gap: "0.65rem" }}>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleLogout}
          >
            Log out
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={props.onDeleteTree}
          >
            Delete family tree
          </button>
        </div>
      </aside>
    </>
  );
}
