// src/app/signin/page.tsx
"use client";
import { useEffect, useState } from "react";
import {
  signInWithGoogle,
  sendEmailLink,
  completeEmailLinkSignIn,
  completeEmailLinkIfPresent,
} from "../../auth";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await completeEmailLinkIfPresent();
      if (res.status === "signed-in") {
        router.push("/");
      } else if (res.status === "need-email") {
        setError("Enter your email to complete sign-in.");
      } else if (res.status === "access-denied") {
        setError(
          `Access denied. Your email (${res.email}) is not authorized to use this application.`
        );
      }
    })();
  }, [router]);

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Unknown error");
    }
  };

  const handleEmail = async () => {
    try {
      await sendEmailLink(email);
      setSent(true);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Unknown error");
    }
  };

  // For demo: handle completing email link sign-in if needed
  // In a real app, this would be handled on page load if the link is present
  const handleCompleteEmailSignIn = async () => {
    try {
      await completeEmailLinkSignIn(email);
      router.push("/");
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Unknown error");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div
        className="p-8 rounded shadow w-full max-w-md"
        style={{
          backgroundColor: "var(--surface)",
          color: "var(--foreground)",
        }}
      >
        <h1 className="text-2xl font-bold mb-4">Sign In</h1>
        <button
          className="w-full py-2 px-4 bg-blue-600 text-white rounded mb-4 hover:bg-blue-700"
          onClick={handleGoogle}
        >
          Sign in with Google
        </button>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded mb-2"
          />
          <button
            className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={handleEmail}
            disabled={sent}
          >
            {sent ? "Email link sent!" : "Sign in with Email link"}
          </button>
        </div>
        <button
          className="w-full py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700 mb-2"
          onClick={handleCompleteEmailSignIn}
        >
          Complete Email Link Sign-In
        </button>
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
}
