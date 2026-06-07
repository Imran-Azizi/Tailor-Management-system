import { LuClockAlert } from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";

export default function SubscriptionExpired() {
  const { user, logout } = useAuth();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <section className="panel" style={{ maxWidth: 520, textAlign: "center" }}>
        <LuClockAlert size={42} style={{ color: "var(--danger)", margin: "0 auto 14px" }} />
        <h1 className="page-title">Subscription expired</h1>
        <p className="page-subtitle">
          {user?.tenant?.businessName || "This tenant"} cannot access the system until the subscription is renewed.
        </p>
        <button className="btn btn-primary" onClick={logout} style={{ marginTop: 16 }}>
          Back to login
        </button>
      </section>
    </div>
  );
}
