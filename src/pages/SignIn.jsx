import React from "react";
import { SignIn } from "@clerk/clerk-react";

// Hosted at /sign-in/* — Clerk owns the sub-routes.
export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--convs-bg)" }}
    >
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
