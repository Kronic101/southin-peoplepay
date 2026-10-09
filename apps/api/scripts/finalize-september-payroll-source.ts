import 'dotenv/config';



import ExcelJS from 'exceljs';

import fs from 'fs';

import path from 'path';



import {

  ApprovalStatus,

  PrismaClient,

} from '@prisma/client';



const prisma = new PrismaClient();



const args = process.argv.slice(2);



const APPLY = args.includes('--apply');

const APPROVED_SOURCE =

  args.includes('--approved-source');



const fileArg = args.find((arg) =>

  arg.startsWith('--file='),

);



const SOURCE_FILE = path.resolve(

  process.cwd(),

  fileArg

    ? fileArg.slice('--file='.length)

    : '../../docs/2026_Sep_INCOMESandDEDUCTIONS_DETAILED.xlsx',

);



const EXPECTED_SOURCE_ROWS = 242;

const EXPECTED_ARCHIVED_ROWS = 15;

const EXPECTED_CURRENT_ROWS = 227;



const SOURCE_NAME =

  '2026 September Approved Payroll Workbook';



const SOURCE_ACTOR =

  'HR_FINANCE_APPROVED_SOURCE';



const BASELINE_DATE =

  new Date('2026-09-01T00:00:00.000Z');



const SERVICE_TEMPLATE_NAME =

  'September 2026 Approved Payroll Baseline';



type SourceRow = {

  employeeNumber: string;

  fullName: string;



  nrcNumber: string | null;



  accountNumber: string | null;

  bankCode: string | null;



  department: string | null;

  jobTitle: string | null;



  division: string | null;



  dateOfEngagement: Date | null;



  contractStartDate: Date | null;

  contractEndDate: Date | null;



  napsaNumber: string | null;



  basicRate: number | null;

};



type ExceptionRow = {

  employeeNumber: string;

  employeeName: string;

  issue: string;

  detail?: string;

};



type ChangeRow = {

  employeeNumber: string;

  employeeName: string;

  changes: string[];

};



function clean(

  value: unknown,

): string {

  if (

    value === null ||

    value === undefined

  ) {

    return '';

  }



  if (value instanceof Date) {

    return value.toISOString();

  }



  if (

    typeof value === 'object' &&

    value !== null

  ) {

    const objectValue =

      value as Record<string, unknown>;



    if (

      'text' in objectValue &&

      typeof objectValue.text === 'string'

    ) {

      return objectValue.text

        .replace(/\s+/g, ' ')

        .trim();

    }



    if (

      'result' in objectValue &&

      objectValue.result !== undefined

    ) {

      return clean(

        objectValue.result,

      );

    }

  }



  return String(value)

    .replace(/\s+/g, ' ')

    .trim();

}



function nullableText(

  value: unknown,

): string | null {

  const result = clean(value);



  if (!result) {

    return null;

  }



  const upper =

    result.toUpperCase();



  if (

    [

      'NULL',

      'N/A',

      'NA',

      'UNKNOWN',

      '-',

    ].includes(upper)

  ) {

    return null;

  }



  return result;

}



function normalizeHeader(

  value: unknown,

): string {

  return clean(value)

    .toUpperCase()

    .replace(/[^A-Z0-9]/g, '');

}



function normalizeKey(

  value: string,

): string {

  return value

    .trim()

    .replace(/\s+/g, ' ')

    .toUpperCase();

}



function normalizeBankCode(

  value: string | null,

): string | null {

  if (!value) {

    return null;

  }



  return value

    .replace(/\s+/g, '')

    .toUpperCase();

}



function cellText(

  row: ExcelJS.Row,

  columnNumber:

    | number

    | undefined,

): string {

  if (!columnNumber) {

    return '';

  }



  const cell =

    row.getCell(

      columnNumber,

    );



  const text =

    cell.text?.trim();



  if (text) {

    return text

      .replace(/\s+/g, ' ')

      .trim();

  }



  return clean(cell.value);

}



function parseDate(

  value: unknown,

): Date | null {

  if (value instanceof Date) {

    return Number.isNaN(

      value.getTime(),

    )

      ? null

      : value;

  }



  if (

    typeof value === 'number'

  ) {

    // Excel serial date.

    const excelEpoch =

      Date.UTC(

        1899,

        11,

        30,

      );



    const date =

      new Date(

        excelEpoch +

          value *

            24 *

            60 *

            60 *

            1000,

      );



    return Number.isNaN(

      date.getTime(),

    )

      ? null

      : date;

  }



  const textValue =

    nullableText(value);



  if (!textValue) {

    return null;

  }



  const parsed =

    new Date(textValue);



  return Number.isNaN(

    parsed.getTime(),

  )

    ? null

    : parsed;

}



function parseNumber(

  value: unknown,

): number | null {

  if (

    typeof value === 'number'

  ) {

    return Number.isFinite(value)

      ? value

      : null;

  }



  const textValue =

    nullableText(value);



  if (!textValue) {

    return null;

  }



  const parsed =

    Number(

      textValue.replace(

        /,/g,

        '',

      ),

    );



  return Number.isFinite(parsed)

    ? parsed

    : null;

}



function dateOnly(

  value: Date | null,

): string | null {

  return value

    ? value

        .toISOString()

        .slice(0, 10)

    : null;

}



function sameDate(

  first: Date | null,

  second: Date | null,

): boolean {

  if (!first && !second) {

    return true;

  }



  if (!first || !second) {

    return false;

  }



  return (

    dateOnly(first) ===

    dateOnly(second)

  );

}



async function ensureDepartment(

  name: string,

): Promise<string> {

  const existing =

    await prisma.department.findFirst({

      where: {

        name: {

          equals: name,

          mode: 'insensitive',

        },

      },



      select: {

        id: true,

      },

    });



  if (existing) {

    return existing.id;

  }



  const created =

    await prisma.department.create({

      data: {

        name,

        description:

          `Imported from ${SOURCE_NAME}`,

      },



      select: {

        id: true,

      },

    });



  return created.id;

}



async function ensureJobTitle(

  name: string,

): Promise<string> {

  const existing =

    await prisma.jobTitle.findFirst({

      where: {

        name: {

          equals: name,

          mode: 'insensitive',

        },

      },



      select: {

        id: true,

      },

    });



  if (existing) {

    return existing.id;

  }



  const created =

    await prisma.jobTitle.create({

      data: {

        name,

        description:

          `Imported from ${SOURCE_NAME}`,

      },



      select: {

        id: true,

      },

    });



  return created.id;

}



async function ensureEmploymentType(

  name: string,

): Promise<string> {

  const existing =

    await prisma.employmentType.findFirst({

      where: {

        name: {

          equals: name,

          mode: 'insensitive',

        },

      },



      select: {

        id: true,

      },

    });



  if (existing) {

    return existing.id;

  }



  const created =

    await prisma.employmentType.create({

      data: {

        name,

        description:

          `Baseline inferred from approved September 2026 contract data`,

      },



      select: {

        id: true,

      },

    });



  return created.id;

}



function normalizeAccountNumber(

  value: string,

): string {

  return value

    .replace(/\s+/g, '')

    .replace(/^0+/, '');

}



async function buildBankCodeMap(

  sourceRows: SourceRow[],

  employees: Array<{

    employeeNumber: string;

    bankAccounts: Array<{

      accountNumber: string;

      bankName: string;

    }>;

  }>,

) {

  const employeeByNumber =

    new Map(

      employees.map(

        (employee) => [

          employee.employeeNumber

            .trim()

            .toUpperCase(),



          employee,

        ],

      ),

    );



  const candidates =

    new Map<

      string,

      Set<string>

    >();



  for (const row of sourceRows) {

    const code =

      normalizeBankCode(

        row.bankCode,

      );



    if (

      !code ||

      !row.accountNumber

    ) {

      continue;

    }



    const employee =

      employeeByNumber.get(

        row.employeeNumber,

      );



    if (!employee) {

      continue;

    }



    const sourceAccount =

      normalizeAccountNumber(

        row.accountNumber,

      );



    const matchingAccount =

      employee.bankAccounts.find(

        (account) =>

          normalizeAccountNumber(

            account.accountNumber,

          ) === sourceAccount,

      );



    if (

      !matchingAccount?.bankName

    ) {

      continue;

    }



    const names =

      candidates.get(code) ??

      new Set<string>();



    names.add(

      matchingAccount.bankName

        .trim(),

    );



    candidates.set(

      code,

      names,

    );

  }



  const resolved =

    new Map<

      string,

      string

    >();



  const ambiguous =

    new Map<

      string,

      string[]

    >();



  for (

    const [code, names]

    of candidates.entries()

  ) {

    if (names.size === 1) {

      resolved.set(

        code,

        [...names][0],

      );

    } else if (

      names.size > 1

    ) {

      ambiguous.set(

        code,

        [...names].sort(),

      );

    }

  }



  return {

    resolved,

    ambiguous,

  };

}



async function loadWorkbook() {

  if (

    !fs.existsSync(

      SOURCE_FILE,

    )

  ) {

    throw new Error(

      `Workbook not found: ${SOURCE_FILE}`,

    );

  }



  const workbook =

    new ExcelJS.Workbook();



  await workbook.xlsx.readFile(

    SOURCE_FILE,

  );



  const worksheet =

    workbook.getWorksheet(

      'ExportData',

    ) ??

    workbook.worksheets[0];



  if (!worksheet) {

    throw new Error(

      'ExportData worksheet was not found.',

    );

  }



  let headerRowNumber = 0;



  const columns:

    Record<string, number> = {};



  for (

    let rowNumber = 1;

    rowNumber <=

    Math.min(

      worksheet.rowCount,

      30,

    );

    rowNumber++

  ) {

    const row =

      worksheet.getRow(

        rowNumber,

      );



    const discovered:

      Record<string, number> = {};



    row.eachCell(

      (

        cell,

        columnNumber,

      ) => {

        const key =

          normalizeHeader(

            cell.value,

          );



        if (key) {

          discovered[key] =

            columnNumber;

        }

      },

    );



    if (

      discovered.EMPNO &&

      discovered.FULLNAME &&

      discovered.DIVISION

    ) {

      headerRowNumber =

        rowNumber;



      Object.assign(

        columns,

        discovered,

      );



      break;

    }

  }



  if (!headerRowNumber) {

    throw new Error(

      'Could not locate payroll workbook header row.',

    );

  }



  const requiredHeaders = [

    'EMPNO',

    'FULLNAME',

    'DIVISION',

    'DEPARTMENT',

    'JOBTITLE',

    'DATEOFENGAGEMENT',

    'CONTRACTSTARTDATE',

    'CONTRACTENDDATE',

    'NAPSANO',

    'ACCNO',

    'BANKCODE',

  ];



  for (

    const requiredHeader

    of requiredHeaders

  ) {

    if (

      !columns[

        requiredHeader

      ]

    ) {

      throw new Error(

        `Required column missing: ${requiredHeader}`,

      );

    }

  }



  const rows:

    SourceRow[] = [];



  const duplicateCheck =

    new Set<string>();



  for (

    let rowNumber =

      headerRowNumber + 1;

    rowNumber <=

    worksheet.rowCount;

    rowNumber++

  ) {

    const row =

      worksheet.getRow(

        rowNumber,

      );



    const employeeNumber =

      cellText(

        row,

        columns.EMPNO,

      )

        .trim()

        .toUpperCase();



    const fullName =

      cellText(

        row,

        columns.FULLNAME,

      );



    if (

      !employeeNumber ||

      !fullName

    ) {

      continue;

    }



    if (

      duplicateCheck.has(

        employeeNumber,

      )

    ) {

      throw new Error(

        `Duplicate EMPNO found in workbook: ${employeeNumber}`,

      );

    }



    duplicateCheck.add(

      employeeNumber,

    );



    const accountNumber =

      nullableText(

        cellText(

          row,

          columns.ACCNO,

        ),

      );



    const bankCode =

      nullableText(

        cellText(

          row,

          columns.BANKCODE,

        ),

      );



    const napsaNumber =

      nullableText(

        cellText(

          row,

          columns.NAPSANO,

        ),

      );



    rows.push({

      employeeNumber,

      fullName,



      nrcNumber:

        columns.NRCNO

          ? nullableText(

              cellText(

                row,

                columns.NRCNO,

              ),

            )

          : null,



      accountNumber,

      bankCode,



      department:

        nullableText(

          cellText(

            row,

            columns.DEPARTMENT,

          ),

        ),



      jobTitle:

        nullableText(

          cellText(

            row,

            columns.JOBTITLE,

          ),

        ),



      division:

        nullableText(

          cellText(

            row,

            columns.DIVISION,

          ),

        ),



      dateOfEngagement:

        parseDate(

          row.getCell(

            columns.DATEOFENGAGEMENT,

          ).value,

        ),



      contractStartDate:

        parseDate(

          row.getCell(

            columns.CONTRACTSTARTDATE,

          ).value,

        ),



      contractEndDate:

        parseDate(

          row.getCell(

            columns.CONTRACTENDDATE,

          ).value,

        ),



      napsaNumber,



      basicRate:

        columns.BASICRATE

          ? parseNumber(

              row.getCell(

                columns.BASICRATE,

              ).value,

            )

          : null,

    });

  }



  return {

    worksheetName:

      worksheet.name,



    headerRowNumber,



    rows,

  };

}



async function main() {

  console.log('');

  console.log(

    'SOUTHIN SEPTEMBER PAYROLL SOURCE FINALIZER',

  );



  console.log(

    `Mode: ${

      APPLY

        ? 'APPLY'

        : 'PREVIEW'

    }`,

  );



  console.log(

    `Workbook: ${SOURCE_FILE}`,

  );



  if (

    APPLY &&

    !APPROVED_SOURCE

  ) {

    throw new Error(

      'Apply mode requires --approved-source because this operation approves HR/Finance source data.',

    );

  }



  const workbook =

    await loadWorkbook();



  const employeeNumbers =

    workbook.rows.map(

      (row) =>

        row.employeeNumber,

    );



  const employees =

    await prisma.employee.findMany({

      where: {

        employeeNumber: {

          in:

            employeeNumbers,

        },

      },



      include: {

        department: true,

        jobTitle: true,

        employmentType: true,



        contracts: true,



        statutoryDetails:

          true,



        bankAccounts: true,



        serviceConditions: true,

      },

    });



  const employeeByNumber =

    new Map(

      employees.map(

        (employee) => [

          employee.employeeNumber

            .toUpperCase(),

          employee,

        ],

      ),

    );



  const missingEmployees =

    workbook.rows.filter(

      (row) =>

        !employeeByNumber.has(

          row.employeeNumber,

        ),

    );



  if (

    missingEmployees.length

  ) {

    console.table(

      missingEmployees.map(

        (row) => ({

          employeeNumber:

            row.employeeNumber,



          fullName:

            row.fullName,

        }),

      ),

    );



    throw new Error(

      `${missingEmployees.length} source employees are missing from Employee master. Run the roster recovery importer first.`,

    );

  }



  const archivedRows =

    workbook.rows.filter(

      (row) =>

        employeeByNumber.get(

          row.employeeNumber,

        )?.status ===

        'ARCHIVED',

    );



  const currentRows =

    workbook.rows.filter(

      (row) =>

        employeeByNumber.get(

          row.employeeNumber,

        )?.status !==

        'ARCHIVED',

    );



  console.log('');

  console.log(

    'SOURCE INTEGRITY',

  );



  console.table({

    sourceRows:

      workbook.rows.length,



    archivedRows:

      archivedRows.length,



    currentRows:

      currentRows.length,



    employeesMatched:

      employees.length,



    employeesMissing:

      missingEmployees.length,

  });



  if (

    workbook.rows.length !==

      EXPECTED_SOURCE_ROWS ||

    archivedRows.length !==

      EXPECTED_ARCHIVED_ROWS ||

    currentRows.length !==

      EXPECTED_CURRENT_ROWS

  ) {

    throw new Error(

      [

        'September source integrity counts do not match the approved baseline.',

        `Expected ${EXPECTED_SOURCE_ROWS}/${EXPECTED_ARCHIVED_ROWS}/${EXPECTED_CURRENT_ROWS}`,

        `Found ${workbook.rows.length}/${archivedRows.length}/${currentRows.length}`,

        'No changes were made.',

      ].join(' '),

    );

  }



  const {

    resolved:

        bankCodeMap,



    ambiguous:

        ambiguousBankCodes,

    } =

    await buildBankCodeMap(

        currentRows,

        employees,

    );



  const changes:

    ChangeRow[] = [];



  const exceptions:

    ExceptionRow[] = [];



  let departmentsToSet = 0;

  let jobTitlesToSet = 0;

  let employmentTypesToSet = 0;

  let startDatesToSet = 0;

  let contractsToCreate = 0;

  let statutoryRowsToCreate = 0;

  let statutoryRowsToUpdate = 0;

  let bankAccountsToCreate = 0;

  let bankAccountsToApprove = 0;

  let serviceConditionsToCreate = 0;

  let employeesToActivate = 0;



  for (

    const sourceRow

    of currentRows

  ) {

    const employee =

      employeeByNumber.get(

        sourceRow.employeeNumber,

      )!;



    const employeeName =

      `${employee.firstName} ${employee.lastName}`

        .replace(/\s+/g, ' ')

        .trim();



    const rowChanges:

      string[] = [];



    if (

      sourceRow.department

    ) {

      if (

        !employee.department ||

        normalizeKey(

          employee.department.name,

        ) !==

          normalizeKey(

            sourceRow.department,

          )

      ) {

        departmentsToSet++;



        rowChanges.push(

          `Department -> ${sourceRow.department}`,

        );

      }

    } else if (

      !employee.departmentId

    ) {

      exceptions.push({

        employeeNumber:

          employee.employeeNumber,



        employeeName,



        issue:

          'MISSING_DEPARTMENT_IN_SOURCE',

      });

    }



    if (

      sourceRow.jobTitle

    ) {

      if (

        !employee.jobTitle ||

        normalizeKey(

          employee.jobTitle.name,

        ) !==

          normalizeKey(

            sourceRow.jobTitle,

          )

      ) {

        jobTitlesToSet++;



        rowChanges.push(

          `Job title -> ${sourceRow.jobTitle}`,

        );

      }

    } else if (

      !employee.jobTitleId

    ) {

      exceptions.push({

        employeeNumber:

          employee.employeeNumber,



        employeeName,



        issue:

          'MISSING_JOB_TITLE_IN_SOURCE',

      });

    }



    if (sourceRow.dateOfEngagement) {

        if (

            !sameDate(

            employee.startDate,

            sourceRow.dateOfEngagement,

            )

        ) {

            startDatesToSet++;



            rowChanges.push(

            `Start date ${

                dateOnly(employee.startDate) ??

                'NULL'

            } -> ${dateOnly(

                sourceRow.dateOfEngagement,

            )}`,

            );

        }

        } else if (!employee.startDate) {

        exceptions.push({

            employeeNumber:

            employee.employeeNumber,



            employeeName,



            issue:

            'MISSING_ENGAGEMENT_DATE',

        });

        }



    if (

      !employee.employmentTypeId

    ) {

      const inferredType =

        sourceRow.contractEndDate

          ? 'Fixed Term'

          : 'Permanent';



      employmentTypesToSet++;



      rowChanges.push(

        `Employment type -> ${inferredType} (baseline inference)`,

      );

    }



    const hasActiveContract =

      employee.contracts.some(

        (contract) =>

          contract.status

            .trim()

            .toUpperCase() ===

          'ACTIVE',

      );



    if (!hasActiveContract) {

      const contractStart =

        sourceRow.contractStartDate ??

        sourceRow.dateOfEngagement;



      if (contractStart) {

        contractsToCreate++;



        rowChanges.push(

          `Create ACTIVE contract ${dateOnly(

            contractStart,

          )} -> ${

            dateOnly(

              sourceRow.contractEndDate,

            ) ?? 'OPEN'

          }`,

        );

      } else {

        exceptions.push({

          employeeNumber:

            employee.employeeNumber,



          employeeName,



          issue:

            'CANNOT_CREATE_CONTRACT_NO_START_DATE',

        });

      }

    }



    if (sourceRow.napsaNumber) {
      if (employee.statutoryDetails) {
        if (
          employee.statutoryDetails.napsaNumber !==
          sourceRow.napsaNumber
        ) {
          statutoryRowsToUpdate++;

          rowChanges.push(
            `NAPSA -> ${sourceRow.napsaNumber}`,
          );
        }
      } else {
        statutoryRowsToCreate++;

        rowChanges.push(
          `Create statutory details: NAPSA ${sourceRow.napsaNumber}`,
        );
      }
    } else if (
      !employee.statutoryDetails?.napsaNumber
    ) {
      exceptions.push({
        employeeNumber:
          employee.employeeNumber,

        employeeName,

        issue:
          'NAPSA_NUMBER_NOT_AVAILABLE',
      });
    }


    const sourceAccount =
      sourceRow.accountNumber;

    if (!sourceAccount) {
      exceptions.push({
        employeeNumber:
          employee.employeeNumber,

        employeeName,

        issue:
          'MISSING_BANK_ACCOUNT_IN_SOURCE',
      });
    } else {
      const primaryAccount =
        employee.bankAccounts.find(
          (account) =>
            account.isPrimary,
        );

      const matchingAccount =
        employee.bankAccounts.find(
          (account) =>
            normalizeAccountNumber(
              account.accountNumber,
            ) ===
            normalizeAccountNumber(
              sourceAccount,
            ),
        );

      if (matchingAccount) {
        if (
          matchingAccount.approvalStatus !==
            ApprovalStatus.APPROVED ||
          !matchingAccount.isPrimary
        ) {
          bankAccountsToApprove++;

          rowChanges.push(
            `Approve/use source bank account ${sourceAccount}`,
          );
        }
      } else {
        const normalizedCode =
          normalizeBankCode(
            sourceRow.bankCode,
          );

        if (!normalizedCode) {
          exceptions.push({
            employeeNumber:
              employee.employeeNumber,

            employeeName,

            issue:
              'MISSING_BANK_CODE',
          });
        } else if (
          ambiguousBankCodes.has(
            normalizedCode,
          )
        ) {
          exceptions.push({
            employeeNumber:
              employee.employeeNumber,

            employeeName,

            issue:
              'AMBIGUOUS_BANK_CODE',

            detail:
              `${normalizedCode}: ${ambiguousBankCodes
                .get(
                  normalizedCode,
                )!
                .join(', ')}`,
          });
        } else if (
          !bankCodeMap.has(
            normalizedCode,
          )
        ) {
          exceptions.push({
            employeeNumber:
              employee.employeeNumber,

            employeeName,

            issue:
              'UNKNOWN_BANK_CODE',

            detail:
              normalizedCode,
          });
        } else {
          bankAccountsToCreate++;

          if (primaryAccount) {
            rowChanges.push(
              `Replace primary ${primaryAccount.accountNumber} -> ${sourceAccount}`,
            );
          } else {
            rowChanges.push(
              `Create primary bank account ${sourceAccount}`,
            );
          }

          rowChanges.push(
            `Bank -> ${bankCodeMap.get(
              normalizedCode,
            )}`,
          );
        }
      }
    }


    const hasApprovedCondition =

      employee.serviceConditions.some(

        (condition) =>

          condition.status ===

          ApprovalStatus.APPROVED,

      );



    if (!hasApprovedCondition) {

      serviceConditionsToCreate++;



      rowChanges.push(

        'Create approved September service-condition baseline',

      );

    }



    if (

      employee.status ===

      'DRAFT'

    ) {

      employeesToActivate++;



      rowChanges.push(

        'DRAFT -> ACTIVE',

      );

    }



    if (

      rowChanges.length

    ) {

      changes.push({

        employeeNumber:

          employee.employeeNumber,



        employeeName,



        changes:

          rowChanges,

      });

    }

  }



  console.log('');

  console.log(

    'PROPOSED CHANGES',

  );



  console.table({

    currentEmployees:

      currentRows.length,



    employeesWithChanges:

      changes.length,



    departmentsToSet,

    jobTitlesToSet,

    employmentTypesToSet,

    startDatesToSet,

    contractsToCreate,

    statutoryRowsToCreate,

    statutoryRowsToUpdate,

    bankAccountsToCreate,

    bankAccountsToApprove,

    serviceConditionsToCreate,

    employeesToActivate,

    exceptions:

      exceptions.length,

  });



  console.log('');



  if (exceptions.length) {

    console.log(

      'SOURCE / DATA EXCEPTIONS',

    );



    console.table(

      exceptions,

    );

  }



  if (!APPLY) {

    console.log('');

    console.log(

      'PREVIEW ONLY - no database records were changed.',

    );



    writeReport({

      mode: 'PREVIEW',

      workbook,

      changes,

      exceptions,

    });



    return;

  }



  console.log('');

  console.log(

    'APPLYING APPROVED SEPTEMBER BASELINE...',

  );



  const serviceTemplate =

    await prisma

      .serviceConditionTemplate

      .upsert({

        where: {

          name:

            SERVICE_TEMPLATE_NAME,

        },



        create: {

          name:

            SERVICE_TEMPLATE_NAME,



          description:

            `Approved HR/Finance baseline imported from ${SOURCE_NAME}`,



          isActive: true,

        },



        update: {

          description:

            `Approved HR/Finance baseline imported from ${SOURCE_NAME}`,



          isActive: true,

        },

      });



  let processed = 0;



  for (

    const sourceRow

    of currentRows

  ) {

    const employee =

      await prisma.employee.findUniqueOrThrow({

        where: {

          employeeNumber:

            sourceRow.employeeNumber,

        },



        include: {

          department: true,

          jobTitle: true,

          employmentType: true,

          contracts: true,

          statutoryDetails:

            true,

          bankAccounts: true,

          serviceConditions:

            true,

        },

      });



    const employeeUpdate:

      Record<string, unknown> = {};



    if (

      sourceRow.department

    ) {

      employeeUpdate.departmentId =

        await ensureDepartment(

          sourceRow.department,

        );

    }



    if (

      sourceRow.jobTitle

    ) {

      employeeUpdate.jobTitleId =

        await ensureJobTitle(

          sourceRow.jobTitle,

        );

    }



    if (

      !employee.employmentTypeId

    ) {

      const inferredType =

        sourceRow.contractEndDate

          ? 'Fixed Term'

          : 'Permanent';



      employeeUpdate.employmentTypeId =

        await ensureEmploymentType(

          inferredType,

        );

    }



    if (

    sourceRow.dateOfEngagement &&

    !sameDate(

        employee.startDate,

        sourceRow.dateOfEngagement,

    )

    ) {

    employeeUpdate.startDate =

        sourceRow.dateOfEngagement;

    }



    if (

      !employee.nrcNumber &&

      sourceRow.nrcNumber

    ) {

      employeeUpdate.nrcNumber =

        sourceRow.nrcNumber;

    }



    if (

      employee.status ===

      'DRAFT'

    ) {

      employeeUpdate.status =

        'ACTIVE';

    }



    if (

      Object.keys(

        employeeUpdate,

      ).length

    ) {

      await prisma.employee.update({

        where: {

          id: employee.id,

        },



        data:

          employeeUpdate,

      });

    }



    const hasActiveContract =

      employee.contracts.some(

        (contract) =>

          contract.status

            .trim()

            .toUpperCase() ===

          'ACTIVE',

      );



    if (!hasActiveContract) {

      const contractStart =

        sourceRow.contractStartDate ??

        sourceRow.dateOfEngagement;



      if (contractStart) {

        const contractNumber =

          `SEP2026-${employee.employeeNumber}`;



        await prisma.employeeContract.upsert({

          where: {

            contractNumber,

          },



          create: {

            employeeId:

              employee.id,



            contractNumber,



            startDate:

              contractStart,



            endDate:

              sourceRow.contractEndDate,



            status:

              'ACTIVE',

          },



          update: {

            employeeId:

              employee.id,



            startDate:

              contractStart,



            endDate:

              sourceRow.contractEndDate,



            status:

              'ACTIVE',

          },

        });

      }

    }



    if (
      sourceRow.napsaNumber ||
      employee.statutoryDetails
    ) {
      await prisma
        .employeeStatutoryDetails
        .upsert({
          where: {
            employeeId:
              employee.id,
          },

          create: {
            employeeId:
              employee.id,

            napsaNumber:
              sourceRow.napsaNumber,

            payeApplicable:
              true,

            napsaApplicable:
              true,

            nhimaApplicable:
              true,
          },

          update: {
            ...(sourceRow.napsaNumber
              ? {
                  napsaNumber:
                    sourceRow.napsaNumber,
                }
              : {}),

            payeApplicable:
              true,

            napsaApplicable:
              true,

            nhimaApplicable:
              true,
          },
        });
    }


    const approvedCondition =

      employee.serviceConditions.find(

        (condition) =>

          condition.status ===

          ApprovalStatus.APPROVED,

      );



    if (!approvedCondition) {

      const existingBaseline =

        await prisma

          .employeeServiceCondition

          .findFirst({

            where: {

              employeeId:

                employee.id,



              templateId:

                serviceTemplate.id,

            },

          });



      if (existingBaseline) {

        await prisma

          .employeeServiceCondition

          .update({

            where: {

              id:

                existingBaseline.id,

            },



            data: {

              effectiveFrom:

                BASELINE_DATE,



              status:

                ApprovalStatus.APPROVED,



              assignedBy:

                SOURCE_ACTOR,



              approvedBy:

                SOURCE_ACTOR,



              approvedAt:

                new Date(),

            },

          });

      } else {

        await prisma

          .employeeServiceCondition

          .create({

            data: {

              employeeId:

                employee.id,



              templateId:

                serviceTemplate.id,



              effectiveFrom:

                BASELINE_DATE,



              status:

                ApprovalStatus.APPROVED,



              assignedBy:

                SOURCE_ACTOR,



              approvedBy:

                SOURCE_ACTOR,



              approvedAt:

                new Date(),

            },

          });

      }

    }



    if (sourceRow.accountNumber) {
      const sourceAccount =
        normalizeAccountNumber(
          sourceRow.accountNumber,
        );

      const matchingAccount =
        employee.bankAccounts.find(
          (account) =>
            normalizeAccountNumber(
              account.accountNumber,
            ) === sourceAccount,
        );

      let bankAccount =
        matchingAccount;

      if (bankAccount) {
        const previousStatus =
          bankAccount.approvalStatus;

        await prisma
          .employeeBankAccount
          .updateMany({
            where: {
              employeeId:
                employee.id,

              id: {
                not:
                  bankAccount.id,
              },

              isPrimary:
                true,
            },

            data: {
              isPrimary:
                false,
            },
          });

        bankAccount =
          await prisma
            .employeeBankAccount
            .update({
              where: {
                id:
                  bankAccount.id,
              },

              data: {
                isPrimary:
                  true,

                approvalStatus:
                  ApprovalStatus.APPROVED,

                effectiveFrom:
                  bankAccount.effectiveFrom ??
                  BASELINE_DATE,
              },
            });

        if (
          previousStatus !==
          ApprovalStatus.APPROVED
        ) {
          await prisma
            .employeeBankAuditLog
            .create({
              data: {
                employeeId:
                  employee.id,

                bankAccountId:
                  bankAccount.id,

                action:
                  'APPROVED_SOURCE_IMPORT',

                previousStatus,

                newStatus:
                  ApprovalStatus.APPROVED,

                changedBy:
                  SOURCE_ACTOR,

                notes:
                  `Approved from ${SOURCE_NAME}`,

                snapshot: {
                  bankName:
                    bankAccount.bankName,

                  accountNumber:
                    bankAccount.accountNumber,

                  bankCode:
                    sourceRow.bankCode,
                },
              },
            });
        }
      } else {
        const normalizedCode =
          normalizeBankCode(
            sourceRow.bankCode,
          );

        const bankName =
          normalizedCode &&
          !ambiguousBankCodes.has(
            normalizedCode,
          )
            ? bankCodeMap.get(
                normalizedCode,
              )
            : null;

        if (bankName) {
          await prisma
            .employeeBankAccount
            .updateMany({
              where: {
                employeeId:
                  employee.id,

                isPrimary:
                  true,
              },

              data: {
                isPrimary:
                  false,
              },
            });

          bankAccount =
            await prisma
              .employeeBankAccount
              .create({
                data: {
                  employeeId:
                    employee.id,

                  bankName,

                  accountNumber:
                    sourceRow.accountNumber,

                  accountName:
                    sourceRow.fullName,

                  isPrimary:
                    true,

                  approvalStatus:
                    ApprovalStatus.APPROVED,

                  effectiveFrom:
                    BASELINE_DATE,
                },
              });
        }
      }

      if (bankAccount) {
        const normalizedCode =
          normalizeBankCode(
            sourceRow.bankCode,
          );

        await prisma.employee.update({
          where: {
            id:
              employee.id,
          },

          data: {
            bankName:
              bankAccount.bankName,

            bankAccountNumber:
              bankAccount.accountNumber,

            bankAccountName:
              bankAccount.accountName,

            ...(normalizedCode
              ? {
                  bankSortCode:
                    normalizedCode,
                }
              : {}),

            bankDetailsStatus:
              'VALIDATED',

            bankDetailsReviewedBy:
              SOURCE_ACTOR,

            bankDetailsReviewedAt:
              new Date(),

            bankDetailsNotes:
              `Validated from ${SOURCE_NAME}`,
          },
        });
      }
    }


    processed++;



    if (

      processed % 25 ===

      0

    ) {

      console.log(

        `Processed ${processed}/${currentRows.length}`,

      );

    }

  }



  console.log('');

  console.log(

    `Apply phase complete: ${processed} employees processed.`,

  );



  const audit =

    await auditCurrentEmployees(

      currentRows.map(

        (row) =>

          row.employeeNumber,

      ),

    );



  console.log('');

  console.log(

    'POST-APPLY READINESS AUDIT',

  );



  console.table(

    audit.summary,

  );



  if (

    audit.blocked.length

  ) {

    console.log('');

    console.log(

      'REMAINING GENUINE BLOCKERS',

    );



    console.table(

      audit.blocked,

    );

  }



  writeReport({

    mode: 'APPLY',

    workbook,

    changes,

    exceptions,

    audit,

  });

}



async function auditCurrentEmployees(

  employeeNumbers: string[],

) {

  const employees =

    await prisma.employee.findMany({

      where: {

        employeeNumber: {

          in:

            employeeNumbers,

        },



        status: {

          not:

            'ARCHIVED',

        },

      },



      include: {

        department: true,

        jobTitle: true,

        employmentType: true,

        contracts: true,

        statutoryDetails:

          true,

        bankAccounts: true,

        serviceConditions:

          true,

        site: true,

      },

    });



  const blocked:

    Array<{

      employeeNumber: string;

      employeeName: string;

      blockers: string;

    }> = [];



  let missingSite = 0;

  let missingDepartment = 0;

  let missingJobTitle = 0;

  let missingEmploymentType = 0;

  let missingStartDate = 0;

  let missingContract = 0;

  let missingStatutory = 0;

  let missingApprovedBank = 0;

  let bankNotValidated = 0;

  let missingApprovedCondition = 0;



  for (

    const employee

    of employees

  ) {

    const blockers:

      string[] = [];



    if (!employee.siteId) {

      missingSite++;

      blockers.push(

        'Missing Site',

      );

    }



    if (

      !employee.departmentId

    ) {

      missingDepartment++;

      blockers.push(

        'Missing Department',

      );

    }



    if (

      !employee.jobTitleId

    ) {

      missingJobTitle++;

      blockers.push(

        'Missing Job Title',

      );

    }



    if (

      !employee.employmentTypeId

    ) {

      missingEmploymentType++;

      blockers.push(

        'Missing Employment Type',

      );

    }



    if (!employee.startDate) {

      missingStartDate++;

      blockers.push(

        'Missing Start Date',

      );

    }



    if (

      !employee.contracts.some(

        (contract) =>

          contract.status

            .trim()

            .toUpperCase() ===

          'ACTIVE',

      )

    ) {

      missingContract++;

      blockers.push(

        'Missing Active Contract',

      );

    }



    if (
      !employee.statutoryDetails ||
      (
        employee.statutoryDetails.napsaApplicable &&
        !employee.statutoryDetails.napsaNumber
      )
    ) {
      missingStatutory++;

      blockers.push(
        'Missing Statutory/NAPSA Details',
      );
    }


    const approvedPrimaryBank =

      employee.bankAccounts.find(

        (bank) =>

          bank.isPrimary &&

          bank.approvalStatus ===

            ApprovalStatus.APPROVED,

      );



    if (

      !approvedPrimaryBank

    ) {

      missingApprovedBank++;



      blockers.push(

        'Missing Approved Primary Bank Account',

      );

    }



    if (

      employee.bankDetailsStatus !==

      'VALIDATED'

    ) {

      bankNotValidated++;



      blockers.push(

        'Bank Details Not Validated',

      );

    }



    if (

      !employee.serviceConditions.some(

        (condition) =>

          condition.status ===

          ApprovalStatus.APPROVED,

      )

    ) {

      missingApprovedCondition++;



      blockers.push(

        'Missing Approved Conditions Of Service',

      );

    }



    if (

      blockers.length

    ) {

      blocked.push({

        employeeNumber:

          employee.employeeNumber,



        employeeName:

          `${employee.firstName} ${employee.lastName}`,



        blockers:

          blockers.join('; '),

      });

    }

  }



  return {

    summary: {

      employeesAudited:

        employees.length,



      employeesReady:

        employees.length -

        blocked.length,



      employeesBlocked:

        blocked.length,



      missingSite,



      missingDepartment,



      missingJobTitle,



      missingEmploymentType,



      missingStartDate,



      missingContract,



      missingStatutory,



      missingApprovedBank,



      bankNotValidated,



      missingApprovedCondition,

    },



    blocked,

  };

}



function writeReport(

  data: unknown,

) {

  const directory =

    path.resolve(

      process.cwd(),

      'payroll-source-reports',

    );



  fs.mkdirSync(

    directory,

    {

      recursive: true,

    },

  );



  const stamp =

    new Date()

      .toISOString()

      .replace(

        /[:.]/g,

        '-',

      );



  const mode =

    APPLY

      ? 'apply'

      : 'preview';



  const output =

    path.join(

      directory,

      `september-payroll-finalizer-${mode}-${stamp}.json`,

    );



  fs.writeFileSync(

    output,

    JSON.stringify(

      {

        source:

          SOURCE_NAME,



        approvedSource:

          APPROVED_SOURCE,



        generatedAt:

          new Date().toISOString(),



        ...(

          data as Record<

            string,

            unknown

          >

        ),

      },

      null,

      2,

    ),

    'utf8',

  );



  console.log('');

  console.log(

    `Report: ${output}`,

  );

}



main()

  .catch((error) => {

    console.error('');

    console.error(

      'September payroll finalizer failed:',

    );



    console.error(error);



    process.exit(1);

  })

  .finally(

    async () => {

      await prisma.$disconnect();

    },

  );