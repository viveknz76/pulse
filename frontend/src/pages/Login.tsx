import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoading } from "../components/PageLoading";
import { PulseBrand } from "../components/PulseBrand";

export default function Login() {
  const { user, loading, loginWithGoogleCredential } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (loading) return <PageLoading />;
  if (user) return <Navigate to="/" replace />;

  async function handleSuccess(response: CredentialResponse) {
    setError(null);
    if (!response.credential) {
      setError("Google did not return a credential.");
      return;
    }
    try {
      await loginWithGoogleCredential(response.credential);
    } catch (err) {
      setError("Sign-in failed. This account may not be authorized for this app.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div className="pointer-events-none absolute -top-36 -left-24 size-[420px] rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-40 size-[460px] rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_72%)]" />

      <div
        className="animate-in fade-in slide-in-from-bottom-2 relative w-full max-w-[430px] overflow-hidden rounded-[28px] border border-brand-border bg-card px-8 py-12 text-center duration-500 sm:px-12 sm:py-14"
        style={{ boxShadow: "0 24px 80px var(--brand-glow)" }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
        <PulseBrand centered className="mb-8" />
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
          Better conversations start here.
        </h1>
        <p className="mx-auto mb-9 max-w-[300px] text-[0.92rem] leading-relaxed text-muted-foreground">
          Stay prepared, celebrate progress, and turn every check-in into meaningful momentum.
        </p>
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong ring-1 ring-inset ring-brand-border">
            Your private check-in space
          </span>
        </div>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError("Google sign-in failed.")}
            useOneTap
            shape="pill"
            theme="filled_black"
          />
        </div>
        {error && <p className="mt-4 text-[0.85rem] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
