import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const dynamic = 'force-dynamic';

export default function DemoPage() {
  return (
    <main className="demo-page">
      <section className="demo-shell">
        <nav className="employee-portal-nav">
          <div>
            <strong>Southin PeoplePay</strong>
            <span>Demo Testing Centre</span>
          </div>

          <div className="employee-portal-nav-links">
            <Link href="/">Home</Link>
            <Link href="/workbench">Workbench</Link>
            <Link href="/employee-login">Employee Login</Link>
          </div>
        </nav>

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">Demo Environment</div>
            <h1>Southin PeoplePay Testing Guide</h1>
            <p>
              Use this page to guide employee, supervisor, HR, finance, and management testing of
              the PeoplePay demo environment.
            </p>
          </div>

          <a className="btn-secondary" href={`${API_URL}/health`} target="_blank">
            Check API Health
          </a>
        </section>

        <section className="demo-grid">
          <div className="employee-panel">
            <h2>Demo Links</h2>

            <div className="demo-link-list">
              <Link href="/workbench">Open Demo Workbench</Link>
              <Link href="/employee-login">Employee Portal Login</Link>
              <Link href="/me">Employee Dashboard</Link>
              <Link href="/me/details">My Details</Link>
              <Link href="/me/payslips">Payslips</Link>
              <Link href="/me/leave">Leave Request Centre</Link>
              <Link href="/me/statutory-certificates">Statutory Records Centre</Link>
              <Link href="/hr/leave-approvals">Supervisor Leave Approvals</Link>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Employee Test Credentials</h2>

            <div className="leave-summary-card">
              <div>
                <span>Employee Number</span>
                <strong>STH-000002</strong>
              </div>

              <div>
                <span>PIN</span>
                <strong>123456</strong>
              </div>

              <div>
                <span>Demo Employee</span>
                <strong>Mary Test</strong>
              </div>
            </div>

            <div className="notice" style={{ marginTop: '1rem' }}>
              Use these details only for demo testing. Do not use real employee information during
              this testing phase.
            </div>
          </div>

          <div className="employee-panel">
            <h2>Supervisor Test Details</h2>

            <div className="leave-summary-card">
              <div>
                <span>Approval Page</span>
                <strong>/hr/leave-approvals</strong>
              </div>

              <div>
                <span>Supervisor Email</span>
                <strong>supervisor@southincon.com</strong>
              </div>

              <div>
                <span>Email Mode</span>
                <strong>Dev / Log Mode</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Employee Testing Checklist</h2>

          <div className="demo-checklist">
            <div>
              <strong>1. Login</strong>
              <p>Open Employee Login and sign in using employee number STH-000002 and PIN 123456.</p>
            </div>

            <div>
              <strong>2. Review Employee Dashboard</strong>
              <p>
                Confirm the employee dashboard opens and shows My Details, Leave, Payslips, and
                Statutory Certificates.
              </p>
            </div>

            <div>
              <strong>3. Check My Details</strong>
              <p>
                Confirm employee number, department, job title, site, statutory details, and bank
                information are displayed correctly.
              </p>
            </div>

            <div>
              <strong>4. Check Payslips</strong>
              <p>
                Open the payslip list and one payslip detail page. Confirm gross pay, deductions,
                net pay, period, and employee details.
              </p>
            </div>

            <div>
              <strong>5. Submit Leave Request</strong>
              <p>
                Open Leave Request Centre, submit an annual leave request, and use
                supervisor@southincon.com as the supervisor email.
              </p>
            </div>

            <div>
              <strong>6. Check Statutory Records</strong>
              <p>
                Confirm PAYE, NAPSA, NHIMA applicability and registration references are shown.
              </p>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Supervisor Testing Checklist</h2>

          <div className="demo-checklist">
            <div>
              <strong>1. Open Approval Centre</strong>
              <p>Go to Supervisor Leave Approvals from the demo links or workbench.</p>
            </div>

            <div>
              <strong>2. Load Requests</strong>
              <p>Use supervisor@southincon.com and click Load Requests.</p>
            </div>

            <div>
              <strong>3. Review Request</strong>
              <p>Select a pending leave request and review the employee, dates, days, and reason.</p>
            </div>

            <div>
              <strong>4. Approve or Reject</strong>
              <p>Approve or reject the request with a supervisor comment.</p>
            </div>

            <div>
              <strong>5. Confirm Employee View</strong>
              <p>Ask the employee tester to refresh the Leave page and confirm the updated status.</p>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Known Demo Limitations</h2>

          <div className="notice">
            Real Microsoft 365 email is not yet enabled. Email notifications are currently generated
            in dev/log mode for safe testing. Supervisor approval is currently demo-accessible and
            will be locked behind staff authentication/RBAC in the next security phase.
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Feedback Required From Testers</h2>

          <div className="demo-checklist">
            <div>
              <strong>Workflow</strong>
              <p>Are the employee and supervisor steps clear enough?</p>
            </div>

            <div>
              <strong>Wording</strong>
              <p>Are labels, emails, and approval messages professional and easy to understand?</p>
            </div>

            <div>
              <strong>Missing Fields</strong>
              <p>Are there any employee, payroll, leave, or statutory fields missing?</p>
            </div>

            <div>
              <strong>Reports</strong>
              <p>Which reports should HR, Finance, Payroll, and Directors see first?</p>
            </div>

            <div>
              <strong>Access Control</strong>
              <p>Which users should approve leave, view payroll, and access employee records?</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}