"use client";

import "@/src/app/globals.css";

import { useParams } from "next/navigation";
import NotFound from "@/src/app/not-found";

import Login from "@/src/app/auth/user/[access]/login";
import Register from "@/src/app/auth/user/[access]/register";
import Verify from "@/src/app/auth/user/[access]/verify";
import Reset from "@/src/app/auth/user/[access]/reset";
import Forgot from "@/src/app/auth/user/[access]/forgot";

const SLUGS = ["login", "register", "verify", "reset", "forgot"] as const;

export default function Page() {
  const { access } = useParams();
  const param = access?.toString() ?? "";

  if (!SLUGS.includes(param as (typeof SLUGS)[number])) {
    return <NotFound />;
  }

  return (
    <div className="main">
      {param === "login" && <Login />}
      {param === "register" && <Register />}
      {param === "verify" && <Verify />}
      {param === "reset" && <Reset />}
      {param === "forgot" && <Forgot />}
    </div>
  );
}
