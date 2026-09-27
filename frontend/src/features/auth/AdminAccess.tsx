import { createContext, FormEvent, ReactNode, useContext, useEffect, useState } from "react";
import { request, setAdminToken } from "../../lib/api-client";
import ErrorAlert from "../../components/ui/ErrorAlert";
import Modal from "../../components/ui/Modal";

type AdminAccess = {
  authenticated: boolean;
  signIn: (key: string) => Promise<void>;
  signOut: () => void;
};
const AdminContext = createContext<AdminAccess | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  function signOut() {
    setAdminToken(null);
    setAuthenticated(false);
  }
  useEffect(() => {
    window.addEventListener("admin-access-expired", signOut);
    return () => {
      window.removeEventListener("admin-access-expired", signOut);
      setAdminToken(null);
    };
  }, []);
  async function signIn(key: string) {
    await request("/auth/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    setAdminToken(key);
    setAuthenticated(true);
  }
  return (
    <AdminContext.Provider value={{ authenticated, signIn, signOut }}>
      {children}
    </AdminContext.Provider>
  );
}

function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("AdminProvider is required.");
  return context;
}

function SignInForm({ onSuccess }: { onSuccess?: () => void }) {
  const { signIn } = useAdmin();
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await signIn(key.trim());
      setKey("");
      onSuccess?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="admin-access-form" onSubmit={submit}>
      <p>Sign in as an administrator to create, edit or delete events.</p>
      <label htmlFor="admin-key">Administrator access key</label>
      <input
        autoFocus
        id="admin-key"
        type="password"
        autoComplete="off"
        required
        minLength={43}
        maxLength={128}
        value={key}
        disabled={pending}
        onChange={(event) => setKey(event.target.value)}
      />
      {error && <ErrorAlert title="Sign-in failed" message={error} />}
      <div className="form-actions">
        <button className="button" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  // This gates the UI only; the API independently authorizes every mutation.
  return useAdmin().authenticated ? children : <SignInForm />;
}

export function AdminAccessButton() {
  const { authenticated, signOut } = useAdmin();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button-text"
        onClick={() => (authenticated ? signOut() : setOpen(true))}
      >
        {authenticated ? "Sign out" : "Admin sign in"}
      </button>
      {open && (
        <Modal title="Administrator access" onClose={() => setOpen(false)}>
          <SignInForm onSuccess={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
