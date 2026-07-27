import { useState } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoading } from "../components/PageLoading";

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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-in fade-in slide-in-from-bottom-2 relative min-w-[380px] rounded-[20px] border border-border bg-card px-12 py-14 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_1px_rgba(0,0,0,0.03)] duration-500">
        <div className="mb-1.5 text-[2.2rem] font-bold tracking-tight text-foreground">Pulse</div>
        <p className="mb-9 text-[0.95rem] text-muted-foreground">
          Thoughtful check-ins, steady momentum.
        </p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError("Google sign-in failed.")}
            useOneTap
            shape="pill"
          />
        </div>
        {error && <p className="mt-4 text-[0.85rem] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
