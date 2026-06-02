export default function EmployeeLoginPage() {
  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 520 }}>
        <h1>Employee Login</h1>
        <p className="muted">Use your Employee Number and temporary PIN. First login will force a PIN change.</p>
        <form className="grid">
          <label>Employee Number<br /><input placeholder="STH-000001" /></label>
          <label>PIN<br /><input placeholder="Temporary PIN" type="password" /></label>
          <button className="button" type="button">Login</button>
        </form>
      </section>
    </main>
  );
}
