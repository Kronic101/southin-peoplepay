import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

type SiteGroupCode =
  | 'SOLWEZI'
  | 'KITWE'
  | 'MUFULIRA'
  | 'CHINGOLA'
  | 'KALUMBILA'
  | 'LUMWANA';

type SiteStageRow = {
  sourceDivisionName: string;
  siteGroupCode: SiteGroupCode;
  siteGroupName: string;
  normalizedSiteName: string;
  employeeCount: number;
};

type HeaderDiscovery = {
  worksheet: ExcelJS.Worksheet;
  headerRowNumber: number;
  divisionColumnNumber: number;
  headers: Record<string, number>;
};

function clean(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

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

function normalizeHeader(value: unknown): string {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getArg(name: string): string | null {
  const prefix = `--${name}=`;

  const found = process.argv.find((arg) =>
    arg.startsWith(prefix),
  );

  return found
    ? found.slice(prefix.length)
    : null;
}

function resolveSiteGroup(
  division: string,
): SiteGroupCode {
  const value = division.toUpperCase();

  if (value.includes('CHINGOLA')) {
    return 'CHINGOLA';
  }

  if (value.includes('KITWE')) {
    return 'KITWE';
  }

  if (value.includes('MUFULIRA')) {
    return 'MUFULIRA';
  }

  if (value.includes('KALUMBILA')) {
    return 'KALUMBILA';
  }

  if (value.includes('LUMWANA')) {
    return 'LUMWANA';
  }

  return 'SOLWEZI';
}

function normalizeSiteName(
  division: string,
  _group: SiteGroupCode,
): string {
  return clean(division)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

  /**
   * Keep the operational project/site name independent.
   *
   * We do NOT need:
   *
   * SOLWEZI - S3 EXPANSION PROJECT
   *
   * as the Site name.
   *
   * SiteGroup already tells us SOLWEZI.
   *
   * So:
   *
   * SiteGroup = SOLWEZI
   * Site      = S3 EXPANSION PROJECT
   */
  

  /**
   * For other towns remove the town name from the
   * project where doing so produces a cleaner project name.
   *
   * Examples:
   *
   * SHUTDOWN MUFULIRA
   * → SHUTDOWN
   *
   * KITWE BRANCH OFFICE
   * → BRANCH OFFICE
   *
   * CHINGOLA GRIT
   * → GRIT
   *
   * KALUMBILA TRI 1073
   * → TRI 1073
   *
   * The original DIVISION remains stored separately in
   * sourceDivisionName, so no source information is lost.
   */
  

function rowHeaders(
  row: ExcelJS.Row,
): Record<string, number> {
  const result: Record<string, number> = {};

  row.eachCell(
    { includeEmpty: true },
    (cell, colNumber) => {
      const normalized =
        normalizeHeader(cell.value);

      if (normalized) {
        result[normalized] = colNumber;
      }
    },
  );

  return result;
}

function findDivisionColumn(
  headers: Record<string, number>,
): number | null {
  const candidates = [
    'DIVISION',
    'DIVISIONNAME',
    'DIV',
  ];

  for (const candidate of candidates) {
    if (headers[candidate]) {
      return headers[candidate];
    }
  }

  return null;
}

function discoverHeader(
  workbook: ExcelJS.Workbook,
): HeaderDiscovery {
  /**
   * Prefer likely payroll-data worksheets,
   * but search everything if needed.
   */
  const preferredNames = [
    'Export Data',
    'EXPORT DATA',
    'ExportData',
    'Payroll Data',
    'PAYROLL DATA',
  ];

  const orderedWorksheets =
    [
      ...preferredNames
        .map((name) =>
          workbook.getWorksheet(name),
        )
        .filter(
          (
            sheet,
          ): sheet is ExcelJS.Worksheet =>
            Boolean(sheet),
        ),

      ...workbook.worksheets.filter(
        (sheet) =>
          !preferredNames.some(
            (name) =>
              name.toUpperCase() ===
              sheet.name.toUpperCase(),
          ),
      ),
    ];

  for (const worksheet of orderedWorksheets) {
    const maxRowsToInspect = Math.min(
      worksheet.rowCount,
      30,
    );

    for (
      let rowNumber = 1;
      rowNumber <= maxRowsToInspect;
      rowNumber += 1
    ) {
      const row =
        worksheet.getRow(rowNumber);

      const headers =
        rowHeaders(row);

      const divisionColumnNumber =
        findDivisionColumn(headers);

      if (divisionColumnNumber) {
        return {
          worksheet,
          headerRowNumber: rowNumber,
          divisionColumnNumber,
          headers,
        };
      }
    }
  }

  const worksheetDiagnostics =
    workbook.worksheets.map(
      (worksheet) => ({
        name: worksheet.name,
        rowCount: worksheet.rowCount,
        columnCount: worksheet.columnCount,
      }),
    );

  console.error(
    'Worksheets inspected:',
    worksheetDiagnostics,
  );

  throw new Error(
    'DIVISION column was not found in the first 30 rows of any worksheet.',
  );
}

async function main() {
  const fileArg = getArg('file');

  if (!fileArg) {
    throw new Error(
      'Usage: --file="../../docs/2026_Sep_INCOMESandDEDUCTIONS_DETAILED.xlsx"',
    );
  }

  const filePath = path.resolve(
    process.cwd(),
    fileArg,
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Workbook not found: ${filePath}`,
    );
  }

  console.log(
    'Southin site normalization staging',
  );

  console.log(
    `Workbook: ${filePath}`,
  );

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.readFile(
    filePath,
  );

  console.log(
    `Worksheets: ${workbook.worksheets
      .map((sheet) => sheet.name)
      .join(', ')}`,
  );

  const discovered =
    discoverHeader(workbook);

  const {
    worksheet,
    headerRowNumber,
    divisionColumnNumber,
    headers,
  } = discovered;

  console.log(
    `Using worksheet: ${worksheet.name}`,
  );

  console.log(
    `Header row: ${headerRowNumber}`,
  );

  console.log(
    `DIVISION column: ${divisionColumnNumber}`,
  );

  console.log(
    `Detected headers: ${Object.keys(
      headers,
    ).join(', ')}`,
  );

  const counts =
    new Map<string, number>();

  let rowsRead = 0;

  for (
    let rowNumber =
      headerRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row =
      worksheet.getRow(rowNumber);

    const division = clean(
      row.getCell(
        divisionColumnNumber,
      ).value,
    );

    if (!division) {
      continue;
    }

    rowsRead += 1;

    counts.set(
      division,
      (counts.get(division) ?? 0) + 1,
    );
  }

  const sites: SiteStageRow[] =
    Array.from(counts.entries())
      .map(
        ([division, employeeCount]) => {
          const group =
            resolveSiteGroup(
              division,
            );

          return {
            sourceDivisionName:
              division,

            siteGroupCode:
              group,

            siteGroupName:
              group,

            normalizedSiteName:
              normalizeSiteName(
                division,
                group,
              ),

            employeeCount,
          };
        },
      )
      .sort((a, b) => {
        const groupCompare =
          a.siteGroupCode.localeCompare(
            b.siteGroupCode,
          );

        if (groupCompare !== 0) {
          return groupCompare;
        }

        return a.normalizedSiteName.localeCompare(
          b.normalizedSiteName,
        );
      });

  const totalsByGroup =
    sites.reduce<
      Record<string, number>
    >((acc, row) => {
      acc[row.siteGroupCode] =
        (acc[
          row.siteGroupCode
        ] ?? 0) +
        row.employeeCount;

      return acc;
    }, {});

  const report = {
    mode: 'DRY_RUN',

    generatedAt:
      new Date().toISOString(),

    sourceFile:
      filePath,

    worksheet:
      worksheet.name,

    headerRowNumber,

    totals: {
      rowsRead,

      employeesRepresented:
        sites.reduce(
          (sum, row) =>
            sum +
            row.employeeCount,
          0,
        ),

      uniqueSites:
        sites.length,

      siteGroups:
        Object.keys(
          totalsByGroup,
        ).length,
    },

    employeesBySiteGroup:
      totalsByGroup,

    sites,
  };

  const outputDir =
    path.resolve(
      process.cwd(),
      'site-import-reports',
    );

  fs.mkdirSync(
    outputDir,
    {
      recursive: true,
    },
  );

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-',
      );

  const outputFile =
    path.join(
      outputDir,
      `site-stage-${timestamp}.json`,
    );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      report,
      null,
      2,
    ),
    'utf8',
  );

  console.log('');
  console.log('SITE GROUP SUMMARY');
  console.table(
    Object.entries(
      totalsByGroup,
    ).map(
      ([group, employees]) => ({
        siteGroup: group,
        employees,
      }),
    ),
  );

  console.log('');
  console.log('SITE SUMMARY');

  console.table(
    sites.map((row) => ({
      group:
        row.siteGroupCode,

      division:
        row.sourceDivisionName,

      site:
        row.normalizedSiteName,

      employees:
        row.employeeCount,
    })),
  );

  console.log('');
  console.log(
    `Rows represented: ${report.totals.rowsRead}`,
  );

  console.log(
    `Employees represented: ${report.totals.employeesRepresented}`,
  );

  console.log(
    `Unique sites: ${report.totals.uniqueSites}`,
  );

  console.log(
    `Site groups: ${report.totals.siteGroups}`,
  );

  console.log(
    `Report: ${outputFile}`,
  );

  console.log('');
  console.log(
    'DRY RUN ONLY - no database records were changed.',
  );
}

main().catch((error) => {
  console.error('');
  console.error(
    'Site staging failed:',
  );

  console.error(error);

  process.exit(1);
});