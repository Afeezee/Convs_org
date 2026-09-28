import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "@/App.jsx";
import "@/index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  // Surface early rather than showing a blank screen. The build still succeeds
  // because Vite only reads the env at runtime.
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Set it in .env.local (see .env.example)."
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ClerkProvider
    publishableKey={publishableKey ?? ""}
    afterSignOutUrl="/Landing"
    signInUrl="/sign-in"
    signInFallbackRedirectUrl="/Home"
  >
    <App />
  </ClerkProvider>
);
