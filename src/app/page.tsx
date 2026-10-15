"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Canvas from "@/src/components/canvas";
import Redirect from "@/src/components/redirect";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/user/login");
    }
  }, [status, router]);

  return (
    <div className="main">
      {status === "loading" && <p>Loading Rooted…</p>}
      {status === "authenticated" && session ? <Canvas /> : null}
      {status === "unauthenticated" && <Redirect />}
    </div>
  );
}
