import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

type SiteGroupCode =
  | 'CHINGOLA'
  | 'KALUMBILA'
  | 'KITWE'
  | 'MUFULIRA'
  | 'SOLWEZI';

type CanonicalSite = {
  code: string;
  name: string;
  sourceDivisionName: string;
  group: SiteGroupCode;
};

const GROUPS: Record<
  SiteGroupCode,
  { code: SiteGroupCode; name: string; town: string }
> = {
  CHINGOLA: {
    code: 'CHINGOLA',
    name: 'CHINGOLA',
    town: 'Chingola',
  },
  KALUMBILA: {
    code: 'KALUMBILA',
    name: 'KALUMBILA',
    town: 'Kalumbila',
  },
  KITWE: {
    code: 'KITWE',
    name: 'KITWE',
    town: 'Kitwe',
  },
  MUFULIRA: {
    code: 'MUFULIRA',
    name: 'MUFULIRA',
    town: 'Mufulira',
  },
  SOLWEZI: {
    code: 'SOLWEZI',
    name: 'SOLWEZI',
    town: 'Solwezi',
  },
};

const SITES: CanonicalSite[] = [
  {
    code: 'CHI-GRIT',
    name: 'CHINGOLA GRIT',
    sourceDivisionName: 'CHINGOLA GRIT',
    group: 'CHINGOLA',
  },
  {
    code: 'KAL-TRI1073',
    name: 'KALUMBILA TRI 1073',
    sourceDivisionName: 'KALUMBILA TRI 1073',
    group: 'KALUMBILA',
  },
  {
    code: 'KIT-BRANCH',
    name: 'KITWE BRANCH OFFICE',
    sourceDivisionName: 'KITWE BRANCH OFFICE',
    group: 'KITWE',
  },
  {
    code: 'MUF-CP',
    name: 'MUFULIRA SITE - CORROSSION AND PROTECTION',
    sourceDivisionName: 'MUFULIRA SITE - CORROSSION AND PROTECTION',
    group: 'MUFULIRA',
  },
  {
    code: 'MUF-SDOWN',
    name: 'SHUTDOWN MUFULIRA',
    sourceDivisionName: 'SHUTDOWN MUFULIRA',
    group: 'MUFULIRA',
  },
  {
    code: 'SOL-ADMIN',
    name: 'ADMINISTRATION & CORPORATE SERVICE SUPPORT',
    sourceDivisionName: 'ADMINISTRATION & CORPORATE SERVICE SUPPORT',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-HO',
    name: 'HEAD OFFICE',
    sourceDivisionName: 'HEAD OFFICE',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-HWW',
    name: 'HEAVY WELDING WORKSHOP',
    sourceDivisionName: 'HEAVY WELDING WORKSHOP',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-MIN',
    name: 'MINING',
    sourceDivisionName: 'MINING',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-PPE-SCAF',
    name: 'POWER PLANT ENGINEERING - SCAFFOLDING MAINTENANCE',
    sourceDivisionName:
      'POWER PLANT ENGINEERING - SCAFFOLDING MAINTENANCE',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-PP-SHEET',
    name: 'PROCESSING PLANT - SHEETING',
    sourceDivisionName: 'PROCESSING PLANT - SHEETING',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-S3-YARD',
    name: 'S3 ASSEMBLY YARD',
    sourceDivisionName: 'S3 ASSEMBLY YARD',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-S3-EXP',
    name: 'S3 EXPANSION PROJECT',
    sourceDivisionName: 'S3 EXPANSION PROJECT',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-SCAF-CONC',
    name: 'SCAFFOLDING MAINTENENACE - CONCETRATOR',
    sourceDivisionName: 'SCAFFOLDING MAINTENENACE - CONCETRATOR',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-SMELT-SHEET',
    name: 'SMELTER - MAINTENANCE SHEETING',
    sourceDivisionName: 'SMELTER - MAINTENANCE SHEETING',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-SMELT-MAINT',
    name: 'SMELTER MAINTENANCE',
    sourceDivisionName: 'SMELTER MAINTENANCE',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-SMELT-PROJ',
    name: 'SMELTER PROJECT',
    sourceDivisionName: 'SMELTER PROJECT',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-SMELT-SDOWN',
    name: 'SMELTER SHUTDOWN',
    sourceDivisionName: 'SMELTER SHUTDOWN',
    group: 'SOLWEZI',
  },
  {
    code: 'SOL-TAIL-CP',
    name: 'TAILINGS - CORROSSION AND PROTECTION',
    sourceDivisionName: 'TAILINGS - CORROSSION AND PROTECTION',
    group: 'SOLWEZI',
  },
];

function clean(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (
    typeof value === 'object' &&
    value !== null &&
    'text' in value
  ) {
    return String((value as any).text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value: unknown): string {
  return clean(value).toUpperCase();
}

function normalizeHeader(value: unknown): string {
  return normalize(value).replace(/[^A-Z0-9]/g, '');
}

function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const arg = process.argv.find((v) => v.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const apply = hasFlag('apply');
  const fileArg = getArg('file');

  if (!fileArg) {
    throw new Error(
      'Workbook required. Use --file="../../docs/2026_Sep_INCOMESandDEDUCTIONS_DETAILED.xlsx"',
    );
  }

  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found: ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet =
    workbook.getWorksheet('ExportData') ??
    workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('No worksheet found.');
  }

  let headerRowNumber = 0;
  let employeeNumberColumn = 0;
  let divisionColumn = 0;

  for (
    let rowNumber = 1;
    rowNumber <= Math.min(30, worksheet.rowCount);
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    let empCol = 0;
    let divCol = 0;

    row.eachCell((cell, colNumber) => {
      const header = normalizeHeader(cell.value);

      if (header === 'EMPNO') {
        empCol = colNumber;
      }

      if (header === 'DIVISION') {
        divCol = colNumber;
      }
    });

    if (empCol && divCol) {
      headerRowNumber = rowNumber;
      employeeNumberColumn = empCol;
      divisionColumn = divCol;
      break;
    }
  }

  if (
    !headerRowNumber ||
    !employeeNumberColumn ||
    !divisionColumn
  ) {
    throw new Error(
      'Could not locate EMPNO and DIVISION columns.',
    );
  }

  const canonicalByDivision = new Map(
    SITES.map((site) => [
      normalize(site.sourceDivisionName),
      site,
    ]),
  );

  const roster = new Map<
    string,
    {
      employeeNumber: string;
      division: string;
      site: CanonicalSite;
    }
  >();

  const unknownDivisions = new Set<string>();
  const duplicateEmployeeNumbers = new Set<string>();

  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    const employeeNumber = clean(
      row.getCell(employeeNumberColumn).value,
    ).toUpperCase();

    const division = clean(
      row.getCell(divisionColumn).value,
    );

    if (!employeeNumber || !division) {
      continue;
    }

    const site = canonicalByDivision.get(
      normalize(division),
    );

    if (!site) {
      unknownDivisions.add(division);
      continue;
    }

    if (roster.has(employeeNumber)) {
      duplicateEmployeeNumbers.add(employeeNumber);
      continue;
    }

    roster.set(employeeNumber, {
      employeeNumber,
      division,
      site,
    });
  }

  if (unknownDivisions.size > 0) {
    console.error('UNKNOWN DIVISIONS');
    console.table(
      [...unknownDivisions].map((division) => ({
        division,
      })),
    );

    throw new Error(
      'Workbook contains divisions with no canonical site mapping.',
    );
  }

  if (duplicateEmployeeNumbers.size > 0) {
    console.error('DUPLICATE EMPLOYEE NUMBERS');
    console.table(
      [...duplicateEmployeeNumbers].map(
        (employeeNumber) => ({
          employeeNumber,
        }),
      ),
    );

    throw new Error(
      'Duplicate employee numbers found in workbook.',
    );
  }

  const employeeNumbers = [...roster.keys()];

  const dbEmployees = await prisma.employee.findMany({
    where: {
      employeeNumber: {
        in: employeeNumbers,
      },
    },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      siteId: true,
      site: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  const dbEmployeeByNumber = new Map(
    dbEmployees.map((employee) => [
      employee.employeeNumber.toUpperCase(),
      employee,
    ]),
  );

  const missingEmployees = employeeNumbers.filter(
    (employeeNumber) =>
      !dbEmployeeByNumber.has(employeeNumber),
  );

  const currentSites = await prisma.site.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      siteGroupId: true,
      sourceDivisionName: true,
    },
  });

  const currentGroups = await prisma.siteGroup.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  const siteByCode = new Map(
    currentSites
      .filter((site) => site.code)
      .map((site) => [site.code!, site]),
  );

  const groupByCode = new Map(
    currentGroups.map((group) => [
      group.code,
      group,
    ]),
  );

  const groupsToCreate = Object.values(GROUPS).filter(
    (group) => !groupByCode.has(group.code),
  );

  const sitesToCreate = SITES.filter(
    (site) => !siteByCode.has(site.code),
  );

  let unchanged = 0;
  let assignmentRequired = 0;
  let changeRequired = 0;

  const assignmentPreview: Array<{
    employeeNumber: string;
    name: string;
    division: string;
    fromSite: string;
    toSite: string;
    action: string;
  }> = [];

  for (const rosterRow of roster.values()) {
    const employee = dbEmployeeByNumber.get(
      rosterRow.employeeNumber,
    );

    if (!employee) {
      continue;
    }

    const desiredExistingSite =
      siteByCode.get(rosterRow.site.code);

    let action: string;

    if (
      desiredExistingSite &&
      employee.siteId === desiredExistingSite.id
    ) {
      unchanged++;
      action = 'UNCHANGED';
    } else if (!employee.siteId) {
      assignmentRequired++;
      action = 'ASSIGN';
    } else {
      changeRequired++;
      action = 'CHANGE';
    }

    assignmentPreview.push({
      employeeNumber: employee.employeeNumber,
      name: `${employee.firstName} ${employee.lastName}`,
      division: rosterRow.division,
      fromSite:
        employee.site?.name ?? '(UNASSIGNED)',
      toSite: rosterRow.site.name,
      action,
    });
  }

  console.log('');
  console.log(
    apply
      ? 'SOUTHIN SITE RECONCILIATION - APPLY MODE'
      : 'SOUTHIN SITE RECONCILIATION - PREVIEW ONLY',
  );

  console.log('');
  console.table({
    workbookRowsMapped: roster.size,
    employeesMatched: dbEmployees.length,
    employeesMissing: missingEmployees.length,
    groupsExisting: currentGroups.length,
    groupsToCreate: groupsToCreate.length,
    canonicalSitesExisting:
      SITES.length - sitesToCreate.length,
    canonicalSitesToCreate: sitesToCreate.length,
    assignmentsUnchanged: unchanged,
    assignmentsRequired: assignmentRequired,
    assignmentChanges: changeRequired,
  });

  if (missingEmployees.length > 0) {
    console.log('');
    console.log('EMPLOYEES NOT FOUND');

    console.table(
      missingEmployees.map((employeeNumber) => ({
        employeeNumber,
      })),
    );
  }

  console.log('');
  console.log('ASSIGNMENT PREVIEW');

  console.table(assignmentPreview);

  if (!apply) {
    console.log('');
    console.log(
      'PREVIEW ONLY - no database records were changed.',
    );

    console.log(
      'Run again with --apply only after reviewing this output.',
    );

    return;
  }

  if (missingEmployees.length > 0) {
    throw new Error(
      `Refusing APPLY: ${missingEmployees.length} roster employees were not found in Employee.`,
    );
  }

  const beforeSnapshot = {
    generatedAt: new Date().toISOString(),
    sourceFile: filePath,
    employees: dbEmployees.map((employee) => ({
      employeeNumber: employee.employeeNumber,
      employeeId: employee.id,
      previousSiteId: employee.siteId,
      previousSiteCode: employee.site?.code ?? null,
      previousSiteName: employee.site?.name ?? null,
    })),
    sites: currentSites,
    groups: currentGroups,
  };

  const outputDir = path.resolve(
    process.cwd(),
    'site-import-reports',
  );

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const snapshotFile = path.join(
    outputDir,
    `site-reconcile-before-${timestamp}.json`,
  );

  fs.writeFileSync(
    snapshotFile,
    JSON.stringify(beforeSnapshot, null, 2),
    'utf8',
  );

    /*
   * APPLY PHASE
   *
   * Do not hold one long interactive transaction open while updating
   * hundreds of employees through the Supabase pooler.
   *
   * Everything below is idempotent:
   * - SiteGroups are upserted
   * - Sites are upserted
   * - Employees are updated in 19 site-sized batches
   * - Legacy sites are deleted only when completely unreferenced
   */

  const groupIds = new Map<SiteGroupCode, string>();

  for (const group of Object.values(GROUPS)) {
    const dbGroup = await prisma.siteGroup.upsert({
      where: {
        code: group.code,
      },

      create: {
        code: group.code,
        name: group.name,
        town: group.town,
        description: `${group.name} operational site group`,
        isActive: true,
      },

      update: {
        name: group.name,
        town: group.town,
        isActive: true,
      },

      select: {
        id: true,
        code: true,
      },
    });

    groupIds.set(
      dbGroup.code as SiteGroupCode,
      dbGroup.id,
    );
  }

  const canonicalSiteIds =
    new Map<string, string>();

  for (const site of SITES) {
    const siteGroupId =
      groupIds.get(site.group);

    if (!siteGroupId) {
      throw new Error(
        `Missing SiteGroup ${site.group}`,
      );
    }

    const dbSite =
      await prisma.site.upsert({
        where: {
          code: site.code,
        },

        create: {
          code: site.code,
          name: site.name,
          siteGroupId,
          sourceDivisionName:
            site.sourceDivisionName,
          isActive: true,
        },

        update: {
          name: site.name,
          siteGroupId,
          sourceDivisionName:
            site.sourceDivisionName,
          isActive: true,
        },

        select: {
          id: true,
          code: true,
        },
      });

    canonicalSiteIds.set(
      dbSite.code!,
      dbSite.id,
    );
  }

  /*
   * Group roster employees by target site.
   *
   * This changes 242 sequential employee.update() operations
   * into at most 19 updateMany() operations.
   */
  const employeesBySiteCode =
    new Map<string, string[]>();

  for (const rosterRow of roster.values()) {
    const employees =
      employeesBySiteCode.get(
        rosterRow.site.code,
      ) ?? [];

    employees.push(
      rosterRow.employeeNumber,
    );

    employeesBySiteCode.set(
      rosterRow.site.code,
      employees,
    );
  }

  let employeesUpdated = 0;

  for (
    const [
      siteCode,
      employeeNumbersForSite,
    ] of employeesBySiteCode.entries()
  ) {
    const targetSiteId =
      canonicalSiteIds.get(siteCode);

    if (!targetSiteId) {
      throw new Error(
        `Target site was not created: ${siteCode}`,
      );
    }

    const updateResult =
      await prisma.employee.updateMany({
        where: {
          employeeNumber: {
            in: employeeNumbersForSite,
          },

          OR: [
            {
              siteId: null,
            },
            {
              siteId: {
                not: targetSiteId,
              },
            },
          ],
        },

        data: {
          siteId: targetSiteId,
        },
      });

    employeesUpdated +=
      updateResult.count;

    console.log(
      `${siteCode}: ${updateResult.count} employee(s) updated`,
    );
  }

  /*
   * Integrity check: every roster employee must now be assigned
   * to the exact canonical site calculated from the workbook.
   */
  let assignmentErrors = 0;

  for (
    const [
      siteCode,
      employeeNumbersForSite,
    ] of employeesBySiteCode.entries()
  ) {
    const targetSiteId =
      canonicalSiteIds.get(siteCode)!;

    const correctCount =
      await prisma.employee.count({
        where: {
          employeeNumber: {
            in: employeeNumbersForSite,
          },

          siteId: targetSiteId,
        },
      });

    if (
      correctCount !==
      employeeNumbersForSite.length
    ) {
      assignmentErrors +=
        employeeNumbersForSite.length -
        correctCount;

      console.error(
        `${siteCode}: expected ${employeeNumbersForSite.length}, found ${correctCount}`,
      );
    }
  }

  if (assignmentErrors > 0) {
    throw new Error(
      `Site assignment verification failed for ${assignmentErrors} employee(s). ` +
      `The script is safe to rerun after investigation.`,
    );
  }

  const canonicalCodes =
    SITES.map(
      (site) => site.code,
    );

  const legacySites =
    await prisma.site.findMany({
      where: {
        OR: [
          {
            code: null,
          },
          {
            code: {
              notIn:
                canonicalCodes,
            },
          },
        ],
      },

      select: {
        id: true,
        code: true,
        name: true,
      },
    });

  const deletedLegacySites:
    Array<{
      code: string | null;
      name: string;
    }> = [];

  const retainedLegacySites:
    Array<{
      code: string | null;
      name: string;
      employees: number;
      managers: number;
      initiators: number;
      assets: number;
    }> = [];

  for (
    const legacySite of legacySites
  ) {
    const [
      employeeRefs,
      managerRefs,
      initiatorRefs,
      assetRefs,
    ] = await Promise.all([
      prisma.employee.count({
        where: {
          siteId: legacySite.id,
        },
      }),

      prisma.siteManagerAssignment.count({
        where: {
          siteId: legacySite.id,
        },
      }),

      prisma.siteInitiatorAssignment.count({
        where: {
          siteId: legacySite.id,
        },
      }),

      prisma.hubAsset.count({
        where: {
          siteId: legacySite.id,
        },
      }),
    ]);

    if (
      employeeRefs === 0 &&
      managerRefs === 0 &&
      initiatorRefs === 0 &&
      assetRefs === 0
    ) {
      await prisma.site.delete({
        where: {
          id: legacySite.id,
        },
      });

      deletedLegacySites.push({
        code: legacySite.code,
        name: legacySite.name,
      });
    } else {
      retainedLegacySites.push({
        code: legacySite.code,
        name: legacySite.name,
        employees: employeeRefs,
        managers: managerRefs,
        initiators: initiatorRefs,
        assets: assetRefs,
      });
    }
  }

  const result = {
    employeesUpdated,
    deletedLegacySites,
    retainedLegacySites,
  };

  console.log('');
  console.log('RECONCILIATION COMPLETE');

  console.log('');
  console.table({
    rosterEmployees: roster.size,
    employeesUpdated: result.employeesUpdated,
    legacySitesDeleted:
      result.deletedLegacySites.length,
    legacySitesRetained:
      result.retainedLegacySites.length,
  });

  console.log('');
  console.log('DELETED LEGACY SITES');
  console.table(result.deletedLegacySites);

  console.log('');
  console.log(
    'RETAINED LEGACY SITES - still referenced',
  );
  console.table(result.retainedLegacySites);

  console.log('');
  console.log(`Rollback snapshot: ${snapshotFile}`);
}

main()
  .catch((error) => {
    console.error('');
    console.error('Site reconciliation failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });