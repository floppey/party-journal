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
    <div className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center px-4">
      <div className="panel panel-elevated w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4">Sign In</h1>
        <button className="btn-primary w-full mb-4" onClick={handleGoogle}>
          Sign in with Google
        </button>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 mb-2"
          />
          <button
            className="btn-outline w-full"
            onClick={handleEmail}
            disabled={sent}
          >
            {sent ? "Email link sent!" : "Send magic link"}
          </button>
        </div>
        <button
          className="btn-outline w-full mb-2"
          onClick={handleCompleteEmailSignIn}
        >
          Complete Email Link Sign-In
        </button>
        {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
      </div>
    </div>
  );
}
