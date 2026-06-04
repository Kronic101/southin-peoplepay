'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveEmployeeBankAccount,
  createEmployeeBankAccount,
  updateEmployee,
  validateEmployeeBankDetails,
} from '@/lib/api';

type Props = {
  employee: any;
};

export function EmployeeEditor({ employee }: Props) {
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState('');

  const [form, setForm] = useState({
    employeeNumber: employee?.employeeNumber || '',
    firstName: employee?.firstName || '',
    middleName: employee?.middleName || '',
    lastName: employee?.lastName || '',
    gender: employee?.gender || '',
    dateOfBirth: employee?.dateOfBirth ? String(employee.dateOfBirth).slice(0, 10) : '',
    nrcNumber: employee?.nrcNumber || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    startDate: employee?.startDate ? String(employee.startDate).slice(0, 10) : '',
    endDate: employee?.endDate ? String(employee.endDate).slice(0, 10) : '',
    status: employee?.status || 'DRAFT',

    bankName: employee?.bankName || '',
    bankBranch: employee?.bankBranch || '',
    bankAccountNumber: employee?.bankAccountNumber || '',
    bankAccountName: employee?.bankAccountName || '',
    bankSortCode: employee?.bankSortCode || '',
    bankDetailsStatus: employee?.bankDetailsStatus || 'PENDING_VALIDATION',
    bankDetailsNotes: employee?.bankDetailsNotes || '',
  });

  const [bankForm, setBankForm] = useState({
    bankName: employee?.bankName || '',
    branchName: employee?.bankBranch || '',
    accountName: employee?.bankAccountName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim(),
    accountNumber: employee?.bankAccountNumber || '',
    isPrimary: true,
  });

  const bankAccounts = employee?.bankAccounts || [];

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBankField(field: string, value: string | boolean) {
    setBankForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveProfile() {
    setMessage('');
    setLoadingAction('save-profile');

    try {
      await updateEmployee(employee.id, {
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });

      setMessage('Employee profile updated successfully.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to update employee profile.');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleAddBankAccount() {
    setMessage('');

    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) {
      setMessage('Bank name, account number, and account name are required.');
      return;
    }

    setLoadingAction('add-bank');

    try {
      await createEmployeeBankAccount(employee.id, {
        bankName: bankForm.bankName,
        branchName: bankForm.branchName,
        accountNumber: bankForm.accountNumber,
        accountName: bankForm.accountName,
        isPrimary: bankForm.isPrimary,
      });

      setMessage('Bank account added successfully.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to add bank account.');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleApproveBankAccount(bankAccountId: string) {
    setMessage('');
    setLoadingAction(`approve-${bankAccountId}`);

    try {
      await approveEmployeeBankAccount(employee.id, bankAccountId, {
        reviewedBy: 'finance-manager-dev',
        notes: 'Bank account approved from employee profile.',
      });

      setMessage('Bank account approved and set as primary.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to approve bank account.');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleValidateBankDetails() {
    setMessage('');
    setLoadingAction('validate-bank');

    try {
      await validateEmployeeBankDetails(employee.id, {
        reviewedBy: 'finance-manager-dev',
        notes: 'Employee bank details validated from employee profile.',
      });

      setMessage('Employee bank details validated successfully.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to validate bank details.');
    } finally {
      setLoadingAction('');
    }
  }

  return (
    <div className="table-wrap">
      <h3>Employee Editor</h3>

      {message && <div className="notice">{message}</div>}

      <div className="form-grid">
        <label>
          Employee Number
          <input
            value={form.employeeNumber}
            onChange={(event) => updateField('employeeNumber', event.target.value)}
          />
        </label>

        <label>
          First Name
          <input
            value={form.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
          />
        </label>

        <label>
          Middle Name
          <input
            value={form.middleName}
            onChange={(event) => updateField('middleName', event.target.value)}
          />
        </label>

        <label>
          Last Name
          <input
            value={form.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
          />
        </label>

        <label>
          Gender
          <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
            <option value="">Select gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </label>

        <label>
          Date of Birth
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => updateField('dateOfBirth', event.target.value)}
          />
        </label>

        <label>
          NRC Number
          <input
            value={form.nrcNumber}
            onChange={(event) => updateField('nrcNumber', event.target.value)}
          />
        </label>

        <label>
          Email
          <input
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>

        <label>
          Phone
          <input
            value={form.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </label>

        <label>
          Start Date
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => updateField('startDate', event.target.value)}
          />
        </label>

        <label>
          End Date
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => updateField('endDate', event.target.value)}
          />
        </label>

        <label>
          Employee Status
          <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_PROBATION">ON_PROBATION</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="CONTRACT_EXPIRING">CONTRACT_EXPIRING</option>
            <option value="TERMINATED">TERMINATED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
      </div>

      <div className="action-row">
        <button
          className="btn"
          type="button"
          disabled={loadingAction === 'save-profile'}
          onClick={handleSaveProfile}
        >
          {loadingAction === 'save-profile' ? 'Saving...' : 'Save Employee Profile'}
        </button>
      </div>

      <hr />

      <h3>Bank Payment Details</h3>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Bank Status</span>
          <strong>{employee?.bankDetailsStatus || 'PENDING_VALIDATION'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Reviewed By</span>
          <strong>{employee?.bankDetailsReviewedBy || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Reviewed At</span>
          <strong>
            {employee?.bankDetailsReviewedAt
              ? new Date(employee.bankDetailsReviewedAt).toLocaleString()
              : '-'}
          </strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Bank Notes</span>
          <strong>{employee?.bankDetailsNotes || '-'}</strong>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Bank Name
          <input
            value={bankForm.bankName}
            onChange={(event) => updateBankField('bankName', event.target.value)}
            placeholder="e.g. FNB Zambia, Stanbic, ABSA, Zanaco"
          />
        </label>

        <label>
          Branch Name
          <input
            value={bankForm.branchName}
            onChange={(event) => updateBankField('branchName', event.target.value)}
            placeholder="e.g. Solwezi"
          />
        </label>

        <label>
          Account Name
          <input
            value={bankForm.accountName}
            onChange={(event) => updateBankField('accountName', event.target.value)}
            placeholder="Employee bank account name"
          />
        </label>

        <label>
          Account Number
          <input
            value={bankForm.accountNumber}
            onChange={(event) => updateBankField('accountNumber', event.target.value)}
            placeholder="Bank account number"
          />
        </label>

        <label>
          Primary Account
          <select
            value={bankForm.isPrimary ? 'YES' : 'NO'}
            onChange={(event) => updateBankField('isPrimary', event.target.value === 'YES')}
          >
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
        </label>
      </div>

      <div className="action-row">
        <button
          className="btn"
          type="button"
          disabled={loadingAction === 'add-bank'}
          onClick={handleAddBankAccount}
        >
          {loadingAction === 'add-bank' ? 'Adding...' : 'Add Bank Account'}
        </button>

        <button
          className="btn-secondary"
          type="button"
          disabled={loadingAction === 'validate-bank'}
          onClick={handleValidateBankDetails}
        >
          {loadingAction === 'validate-bank' ? 'Validating...' : 'Validate Bank Details'}
        </button>
      </div>

      <h3>Saved Bank Accounts</h3>

      <table>
        <thead>
          <tr>
            <th>Bank</th>
            <th>Branch</th>
            <th>Account Name</th>
            <th>Account Number</th>
            <th>Primary</th>
            <th>Approval</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {bankAccounts.length === 0 ? (
            <tr>
              <td colSpan={7}>No bank accounts have been captured.</td>
            </tr>
          ) : (
            bankAccounts.map((account: any) => (
              <tr key={account.id}>
                <td>{account.bankName}</td>
                <td>{account.branchName || '-'}</td>
                <td>{account.accountName}</td>
                <td>{account.accountNumber}</td>
                <td>
                  <span className={account.isPrimary ? 'status-pill locked' : 'status-pill'}>
                    {account.isPrimary ? 'YES' : 'NO'}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      account.approvalStatus === 'APPROVED'
                        ? 'status-pill locked'
                        : 'status-pill warning'
                    }
                  >
                    {account.approvalStatus}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={loadingAction === `approve-${account.id}`}
                    onClick={() => handleApproveBankAccount(account.id)}
                  >
                    {loadingAction === `approve-${account.id}` ? 'Approving...' : 'Approve Primary'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <details>
        <summary>Raw Employee Bank JSON</summary>
        <pre className="json-preview">{JSON.stringify(employee?.bankAccounts || [], null, 2)}</pre>
      </details>
    </div>
  );
}