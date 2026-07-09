# User Roles and Permissions

## Roles

| Role | Responsibility |
|---|---|
| Super Admin | Full configuration and security ownership |
| System Admin | Technical setup, integrations, support |
| HR Officer | Employee records, onboarding, documents |
| HR Manager | HR review and approval |
| Payroll Officer | Payroll preparation |
| Finance Officer | Payroll support and reconciliation |
| Finance Manager | Financial review and statutory checks |
| Director | Final payroll approval and executive dashboard |
| Line Manager | Attendance, leave, and overtime approvals |
| Employee | Own profile and payslips |
| Casual Worker | Own payment/payslip view only |
| Auditor | Read-only audit and compliance review |

## Permission principle

Users should only see the minimum information required for their role. Technical administrators should not automatically have salary edit access.

## Payroll approval responsibility

| Stage | Responsible role |
|---|---|
| Prepare payroll | Payroll Officer |
| HR review | HR Manager |
| Finance review | Finance Manager |
| Final approval | Director |
| Lock payroll | System after Director approval |


User Groups
Stores Officers

Stores Officers are responsible for:

Viewing stock by warehouse and site location
Raising stores requisitions where applicable
Reviewing requested items
Supporting stock issue once the issue workflow is active
Keeping stock movement evidence accurate
Asset Officers

Asset Officers are responsible for:

Reviewing asset and fleet records
Confirming asset location and responsible person
Updating asset status when movement or repair workflows are enabled
Reporting incorrect imported records to the system administrator
Site Managers

Site Managers are responsible for:

Reviewing requests linked to their assigned site
Approving or rejecting site-level operational requests
Confirming whether requested stock or assets are genuinely required
Ensuring requests are not approved for the wrong site
Branch Manager / Finance Director / Director Operations

Senior approvers are responsible for:

Reviewing escalated requests
Confirming financial and operational approval
Ensuring requests have passed the correct site-manager checks
Current Master Data

The current sites are:

Barrick Lumwana
Chingola Site
Kalumbila Trident
Kansanshi KMP
Kitwe Site
Kitwe Warehouse
Mufulira Site
Solwezi Warehouse

The current stock locations include:

Site stores
Warehouses
Containers
Yards
Quarantine / damaged areas
Scaffold areas
How to View Stores Dashboard
Open the portal.
Login with Microsoft 365.
Open Stores from the left menu.
Review the summary cards:
Stock items
Stock locations
Quantity on hand
Scaffold components
Assets / fleet
Low / zero stock
Review the stock-by-location table.
Review the low-stock watchlist.
Review recent stores requisitions.
How to Raise a Stores Requisition
Open Stores.
Click New Stores Request.
Select the correct site or warehouse.
Add the required stock item lines.
Confirm quantity and reason.
Submit the request.
The system creates an approval request.
The responsible approver reviews it from the Approval Inbox.
Rules for Stores Requisitions
Always select the correct site.
Do not request against the wrong warehouse or site.
Do not use demo/test request reasons in production.
Do not raise duplicate requests unless the first one was rejected or cancelled.
Urgent requests must still be captured for audit visibility.
Stock Issue Control

During controlled go-live, stock visibility and requisition approval are active.

Stock decrement should only be enabled after testing:

Issue to site
Return to warehouse
Transfer between locations
Damaged/quarantine movement
Lost item recording
Scaffold component movement
Scaffold Component Handling

Scaffold components are imported as individual components because each item may move independently.

This supports:

Component-level tracking
QR/RFID tagging later
Inspection tracking
Damage control
Location movement history
Asset and Fleet Handling

Assets and fleet records are imported for visibility.

Before enforcing movement approvals, the team must validate:

Asset code
Asset type/category
Current site
Current location
Responsible user
Status
Daily Operating Routine
Stores Officer
Check Stores Dashboard every morning.
Review new requisitions.
Confirm stock availability.
Escalate stock shortages.
Keep request notes clear.
Site Manager
Check Approval Inbox daily.
Review requests for assigned site only.
Approve valid requests.
Reject requests with clear reason where incorrect.
Escalate unusual requests to Branch Manager or Operations.
Asset Officer
Review Asset/Fleet register.
Confirm location accuracy.
Flag missing assets or wrong site allocations.
Prepare corrections for import/update.
Support and Escalation

Issues to report:

Cannot login
Wrong role detected
Missing site
Wrong site manager
Stock item missing
Incorrect quantity
Duplicate scaffold item
Asset assigned to wrong location
Approval not visible
Email notification not received