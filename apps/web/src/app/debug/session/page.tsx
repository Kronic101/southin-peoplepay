"use client";

import { useSession, signOut } from "next-auth/react";

export default function SessionDebugPage() {
  const { data: session, status } = useSession();

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>Southin Session Debug</h1>

      <p>
        <strong>Status:</strong> {status}
      </p>

      <button onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </button>

      <pre
        style={{
          marginTop: 24,
          padding: 16,
          background: "#111827",
          color: "#f9fafb",
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        {JSON.stringify(session, null, 2)}
      </pre>
    </main>
  );
}