'use client';

import { useState } from 'react';
import {
  approveEmployeeBankAccount,
  approveEmployeeServiceCondition,
  assignEmployeeServiceCondition,
  createEmployeeBankAccount,
  createEmployeeContract,
  createPortalAccount,
  updateEmployee,
  updateEmployeeStatutoryDetails,
  EMPLOYEE_PORTAL_MODULES_BY_PROFILE,
  EmployeePortalAccessProfile,
  updatePortalAccount,
} from '@/lib/api';

type Props = {
  employee: any;
  lookups: any;
};

export function EmployeeProfileTabs({ employee, lookups }: Props) {
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [portalResult, setPortalResult] = useState<any>(null);
  const [portalProfile, setPortalProfile] = useState<EmployeePortalAccessProfile>(
    employee.portalAccount?.accessProfile || 'EMPLOYEE',
  );

  async function handleApproveBankAccount(bankAccountId: string) {
      setMessage('');

      await approveEmployeeBankAccount(employee.id, bankAccountId);

      setMessage('Bank account approved. Refresh the profile to view latest status.');
    }

    async function handleApproveServiceCondition(conditionId: string) {
      setMessage('');

      await approveEmployeeServiceCondition(employee.id, conditionId);

      setMessage('Condition of service approved. Refresh the profile to view latest status.');
    }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);

    await updateEmployee(employee.id, {
      firstName: String(formData.get('firstName') || ''),
      middleName: String(formData.get('middleName') || ''),
      lastName: String(formData.get('lastName') || ''),
      phone: String(formData.get('phone') || ''),
      email: String(formData.get('email') || ''),
      nrcNumber: String(formData.get('nrcNumber') || ''),
      departmentId: String(formData.get('departmentId') || '') || null,
      jobTitleId: String(formData.get('jobTitleId') || '') || null,
      siteId: String(formData.get('siteId') || '') || null,
      employmentTypeId: String(formData.get('employmentTypeId') || '') || null,
      status: String(formData.get('status') || employee.status),
    });

    setMessage('Employee profile updated. Refresh to view latest relational labels.');
  }

  async function handleStatutorySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);

    await updateEmployeeStatutoryDetails(employee.id, {
      tpin: String(formData.get('tpin') || ''),
      napsaNumber: String(formData.get('napsaNumber') || ''),
      nhimaNumber: String(formData.get('nhimaNumber') || ''),
      payeApplicable: formData.get('payeApplicable') === 'on',
      napsaApplicable: formData.get('napsaApplicable') === 'on',
      nhimaApplicable: formData.get('nhimaApplicable') === 'on',
    });

    setMessage('Statutory details updated.');
  }

  async function handleBankSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);

    await createEmployeeBankAccount(employee.id, {
      bankName: String(formData.get('bankName') || ''),
      branchName: String(formData.get('branchName') || ''),
      accountNumber: String(formData.get('accountNumber') || ''),
      accountName: String(formData.get('accountName') || ''),
      isPrimary: formData.get('isPrimary') === 'on',
      effectiveFrom: String(formData.get('effectiveFrom') || ''),
    });

    setMessage('Bank account captured and marked as pending approval.');
    event.currentTarget.reset();
  }

  async function handleContractSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const rawContractNumber = String(formData.get('contractNumber') || '').trim();

    await createEmployeeContract(employee.id, {
      contractTypeId: String(formData.get('contractTypeId') || ''),
      contractNumber: rawContractNumber.length > 0 ? rawContractNumber : undefined,
      startDate: String(formData.get('startDate') || ''),
      endDate: String(formData.get('endDate') || ''),
      probationEndDate: String(formData.get('probationEndDate') || ''),
      noticePeriod: String(formData.get('noticePeriod') || '30 days'),
    });

    setMessage('Contract captured.');
    event.currentTarget.reset();
  }

  async function handleConditionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);

    await assignEmployeeServiceCondition(employee.id, {
      templateId: String(formData.get('templateId') || ''),
      effectiveFrom: String(formData.get('effectiveFrom') || ''),
      effectiveTo: String(formData.get('effectiveTo') || ''),
    });

    setMessage('Condition of service assigned as pending approval.');
    event.currentTarget.reset();
  }

  async function handleCreatePortalAccount() {
    setMessage('');

    const allowedModules = EMPLOYEE_PORTAL_MODULES_BY_PROFILE[portalProfile];

    const result = await createPortalAccount(employee.id, {
      accessProfile: portalProfile,
      allowedModules,
    });

    setPortalResult(result);
    setMessage(result.message);
  }

  async function handleUpdatePortalAccess() {
    setMessage('');

    const allowedModules = EMPLOYEE_PORTAL_MODULES_BY_PROFILE[portalProfile];

    await updatePortalAccount(employee.id, {
      accessProfile: portalProfile,
      allowedModules,
      isActive: true,
    });

    setMessage('Portal access profile updated. Refresh the profile to view the latest access settings.');
  }

  const tabs = [
    ['profile', 'Profile'],
    ['statutory', 'Statutory'],
    ['bank', 'Bank Details'],
    ['contract', 'Contract'],
    ['conditions', 'Conditions of Service'],
    ['portal', 'Portal Access'],
  ];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="muted">
            {employee.employeeNumber} · {employee.status}
          </p>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button
            className={activeTab === key ? 'tab active-tab' : 'tab'}
            key={key}
            onClick={() => {
              setActiveTab(key);
              setMessage('');
              setPortalResult(null);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {message && <div className="notice">{message}</div>}

      {portalResult?.temporaryPin && (
        <div className="pin-box">
          <strong>Temporary PIN:</strong> {portalResult.temporaryPin}
          <p className="muted">Show this once to HR only. The employee must change it at first login.</p>
        </div>
      )}

      {activeTab === 'profile' && (
        <form className="form-grid" onSubmit={handleProfileSubmit}>
          <label>
            First Name
            <input name="firstName" defaultValue={employee.firstName || ''} required />
          </label>

          <label>
            Middle Name
            <input name="middleName" defaultValue={employee.middleName || ''} />
          </label>

          <label>
            Last Name
            <input name="lastName" defaultValue={employee.lastName || ''} required />
          </label>

          <label>
            NRC Number
            <input name="nrcNumber" defaultValue={employee.nrcNumber || ''} />
          </label>

          <label>
            Phone
            <input name="phone" defaultValue={employee.phone || ''} />
          </label>

          <label>
            Email
            <input name="email" defaultValue={employee.email || ''} type="email" />
          </label>

          <label>
            Department
            <select name="departmentId" defaultValue={employee.departmentId || ''}>
              <option value="">Select department</option>
              {lookups.departments.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Job Title
            <select name="jobTitleId" defaultValue={employee.jobTitleId || ''}>
              <option value="">Select job title</option>
              {lookups.jobTitles.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Site
            <select name="siteId" defaultValue={employee.siteId || ''}>
              <option value="">Select site</option>
              {lookups.sites.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Employment Type
            <select name="employmentTypeId" defaultValue={employee.employmentTypeId || ''}>
              <option value="">Select employment type</option>
              {lookups.employmentTypes.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select name="status" defaultValue={employee.status}>
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

          <button className="btn" type="submit">
            Save Profile
          </button>
        </form>
      )}

      {activeTab === 'statutory' && (
        <form className="form-grid" onSubmit={handleStatutorySubmit}>
          <label>
            TPIN
            <input name="tpin" defaultValue={employee.statutoryDetails?.tpin || ''} />
          </label>

          <label>
            NAPSA Number
            <input name="napsaNumber" defaultValue={employee.statutoryDetails?.napsaNumber || ''} />
          </label>

          <label>
            NHIMA Number
            <input name="nhimaNumber" defaultValue={employee.statutoryDetails?.nhimaNumber || ''} />
          </label>

          <label className="checkbox-line">
            <input name="payeApplicable" type="checkbox" defaultChecked={employee.statutoryDetails?.payeApplicable ?? true} />
            PAYE applicable
          </label>

          <label className="checkbox-line">
            <input name="napsaApplicable" type="checkbox" defaultChecked={employee.statutoryDetails?.napsaApplicable ?? true} />
            NAPSA applicable
          </label>

          <label className="checkbox-line">
            <input name="nhimaApplicable" type="checkbox" defaultChecked={employee.statutoryDetails?.nhimaApplicable ?? true} />
            NHIMA applicable
          </label>

          <button className="btn" type="submit">
            Save Statutory Details
          </button>
        </form>
      )}

      {activeTab === 'bank' && (
        <>
          <form className="form-grid" onSubmit={handleBankSubmit}>
            <label>
              Bank Name
              <input name="bankName" required />
            </label>

            <label>
              Branch Name
              <input name="branchName" />
            </label>

            <label>
              Account Number
              <input name="accountNumber" required />
            </label>

            <label>
              Account Name
              <input name="accountName" required />
            </label>

            <label>
              Effective From
              <input name="effectiveFrom" type="date" />
            </label>

            <label className="checkbox-line">
              <input name="isPrimary" type="checkbox" defaultChecked />
              Primary account
            </label>

            <button className="btn" type="submit">
              Add Bank Account
            </button>
          </form>

          <div className="table-wrap">
            <h3>Existing Bank Accounts</h3>
            <table>
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Account Number</th>
                  <th>Account Name</th>
                  <th>Status</th>
                  <th>Primary</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!employee.bankAccounts || employee.bankAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No records captured yet.</td>
                  </tr>
                ) : (
                  employee.bankAccounts.map((account: any) => (
                    <tr key={account.id}>
                      <td>{account.bankName}</td>
                      <td>{account.accountNumber}</td>
                      <td>{account.accountName}</td>
                      <td>{account.approvalStatus}</td>
                      <td>{account.isPrimary ? 'Yes' : 'No'}</td>
                      <td>
                        {account.approvalStatus === 'APPROVED' ? (
                          <span className="ready-text">Approved</span>
                        ) : (
                          <button
                            className="btn-small"
                            onClick={() => handleApproveBankAccount(account.id)}
                            type="button"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'contract' && (
        <>
          <form className="form-grid" onSubmit={handleContractSubmit}>
            <label>
              Contract Type
              <select name="contractTypeId" required>
                <option value="">Select contract type</option>
                {lookups.contractTypes.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Contract Number
              <input name="contractNumber" placeholder="Leave blank to auto-generate" />
            </label>

            <label>
              Start Date
              <input name="startDate" type="date" required />
            </label>

            <label>
              End Date
              <input name="endDate" type="date" />
            </label>

            <label>
              Probation End Date
              <input name="probationEndDate" type="date" />
            </label>

            <label>
              Notice Period
              <input name="noticePeriod" placeholder="Example: 30 days" defaultValue="30 days" />
            </label>

            <button className="btn" type="submit">
              Add Contract
            </button>
          </form>

          <RecordList
            title="Existing Contracts"
            items={employee.contracts}
            fields={['contractNumber', 'startDate', 'endDate', 'probationEnd', 'noticePeriod', 'status']}
          />
        </>
      )}

      {activeTab === 'conditions' && (
        <>
          <form className="form-grid" onSubmit={handleConditionSubmit}>
            <label>
              Service Condition Template
              <select name="templateId" required>
                <option value="">Select template</option>
                {lookups.serviceConditionTemplates.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Effective From
              <input name="effectiveFrom" type="date" required />
            </label>

            <label>
              Effective To
              <input name="effectiveTo" type="date" />
            </label>

            <button className="btn" type="submit">
              Assign Condition of Service
            </button>
          </form>

          <div className="table-wrap">
            <h3>Assigned Conditions</h3>
            <table>
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!employee.serviceConditions || employee.serviceConditions.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No records captured yet.</td>
                  </tr>
                ) : (
                  employee.serviceConditions.map((condition: any) => (
                    <tr key={condition.id}>
                      <td>{condition.template?.name || '-'}</td>
                      <td>{condition.status}</td>
                      <td>{formatValue(condition.effectiveFrom)}</td>
                      <td>{formatValue(condition.effectiveTo)}</td>
                      <td>
                        {condition.status === 'APPROVED' ? (
                          <span className="ready-text">Approved</span>
                        ) : (
                          <button
                            className="btn-small"
                            onClick={() => handleApproveServiceCondition(condition.id)}
                            type="button"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'portal' && (
        <div>
          <h2>Employee Portal Access</h2>
          <p className="muted">
            Enable Employee Number + PIN login for this employee. HR must choose the access profile before creating the portal account.
          </p>

          <div className="form-grid">
            <label>
              Access Profile
              <select
                value={portalProfile}
                onChange={(event) => setPortalProfile(event.target.value as EmployeePortalAccessProfile)}
              >
                <option value="EMPLOYEE">Employee - own profile, requests and payslips</option>
                <option value="DRIVER">Driver - fleet checklist, trips and defects</option>
                <option value="STORES">Stores - requisitions and stock updates</option>
                <option value="ASSETS">Assets - asset movements and status updates</option>
                <option value="SAFETY">Safety - observations and incidents</option>
                <option value="QAQC">QAQC - quality records and status updates</option>
              </select>
            </label>

            <div>
              <strong>Allowed Modules</strong>
              <ul>
                {EMPLOYEE_PORTAL_MODULES_BY_PROFILE[portalProfile].map((module) => (
                  <li key={module}>{module}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <th>Portal Status</th>
                  <td>{employee.portalAccount ? 'Enabled' : 'Not enabled'}</td>
                </tr>
                <tr>
                  <th>Access Profile</th>
                  <td>{employee.portalAccount?.accessProfile || portalProfile}</td>
                </tr>
                <tr>
                  <th>Allowed Modules</th>
                  <td>
                    {Array.isArray(employee.portalAccount?.allowedModules)
                      ? employee.portalAccount.allowedModules.join(', ')
                      : EMPLOYEE_PORTAL_MODULES_BY_PROFILE[portalProfile].join(', ')}
                  </td>
                </tr>
                <tr>
                  <th>Must Change PIN</th>
                  <td>{employee.portalAccount?.mustChangePin ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                  <th>Last Login</th>
                  <td>{employee.portalAccount?.lastLoginAt || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {!employee.portalAccount ? (
            <button className="btn" onClick={handleCreatePortalAccount} type="button">
              Create Portal Account
            </button>
          ) : (
            <button className="btn" onClick={handleUpdatePortalAccess} type="button">
              Update Portal Access
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function RecordList({ title, items, fields }: { title: string; items: any[]; fields: string[] }) {
  return (
    <div className="table-wrap">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field}>{field}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!items || items.length === 0 ? (
            <tr>
              <td colSpan={fields.length}>No records captured yet.</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                {fields.map((field) => (
                  <td key={field}>{formatValue(item[field])}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(value: unknown) {
  if (!value) return '-';

  if (typeof value === 'string') {
    const looksLikeIsoDate = /^\d{4}-\d{2}-\d{2}T/.test(value);

    if (looksLikeIsoDate) {
      return value.split('T')[0];
    }
  }

  return String(value);
}