import {
    FleetVehicleStatus,
    PrismaClient,
} from '@prisma/client';

const prisma =
  new PrismaClient();

const APPLY =
  process.argv.includes(
    '--apply',
  );

function clean(
  value: unknown,
) {
  return String(
    value ?? '',
  ).trim();
}

function fleetStatusForAsset(
  status: unknown,
): FleetVehicleStatus {
  const value =
    clean(status).toUpperCase();

  if (value === 'UNDER_REPAIR') {
    return FleetVehicleStatus.IN_WORKSHOP;
  }

  if (
    [
      'DAMAGED',
      'QUARANTINED',
      'LOST',
    ].includes(value)
  ) {
    return FleetVehicleStatus.OUT_OF_SERVICE;
  }

  if (
    [
      'RETIRED',
      'DISPOSED',
    ].includes(value)
  ) {
    return FleetVehicleStatus.RETIRED;
  }

  return FleetVehicleStatus.ACTIVE;
}

function descriptionValue(
  description:
    | string
    | null
    | undefined,
  label: string,
) {
  if (!description) {
    return '';
  }

  const prefix =
    `${label}:`.toUpperCase();

  const part =
    description
      .split('|')
      .map(
        (entry) =>
          entry.trim(),
      )
      .find((entry) =>
        entry
          .toUpperCase()
          .startsWith(prefix),
      );

  if (!part) {
    return '';
  }

  return part
    .slice(
      part.indexOf(':') + 1,
    )
    .trim();
}

function parseMakeModel(
  asset: any,
) {
  if (
    asset.manufacturer ||
    asset.modelNumber
  ) {
    return {
      make:
        clean(
          asset.manufacturer,
        ) || null,

      model:
        clean(
          asset.modelNumber,
        ) || null,
    };
  }

  const source =
    descriptionValue(
      asset.description,
      'Make/Model',
    );

  if (!source) {
    return {
      make: null,
      model: null,
    };
  }

  const parts =
    source.split(/\s+/);

  return {
    make:
      parts[0] || null,

    model:
      parts
        .slice(1)
        .join(' ') ||
      null,
  };
}

function parseYear(
  asset: any,
) {
  const source =
    descriptionValue(
      asset.description,
      'Year',
    );

  const year =
    Number(source);

  if (
    Number.isInteger(year) &&
    year >= 1900 &&
    year <= 2100
  ) {
    return year;
  }

  return null;
}

async function main() {
  const assets =
    await prisma.hubAsset
      .findMany({
        where: {
          category:
            'VEHICLE',
        },

        include: {
          fleetVehicle:
            true,
        },

        orderBy: {
          assetNo:
            'asc',
        },
      });

  console.log('');
  console.log(
    'VEHICLE ASSET → FLEET ACTIVATION',
  );
  console.log(
    '================================',
  );

  const preview =
    assets.map(
      (asset) => {
        const {
          make,
          model,
        } =
          parseMakeModel(
            asset,
          );

        return {
            assetId:
                asset.id,

            registrationNo:
                asset.assetTag ||
                asset.assetNo,

            assetNo:
                asset.assetNo,

            make:
                make || '-',

            model:
                model || '-',

            year:
                parseYear(asset) || '-',

            site:
                asset.site ||
                asset.location ||
                '-',

            assetStatus:
                asset.status,

            fleetStatus:
                fleetStatusForAsset(
                asset.status,
                ),

            existingProfile:
                Boolean(
                asset.fleetVehicle,
                ),
            };
      },
    );

  console.table(preview);

  if (!APPLY) {
    console.log('');
    console.log(
      'PREVIEW ONLY — no Fleet profiles created.',
    );

    console.log(
      'Run again with --apply when satisfied.',
    );

    return;
  }

  let created = 0;
  let skipped = 0;

  for (
    const asset of assets
  ) {
    if (
      asset.fleetVehicle
    ) {
      skipped += 1;
      continue;
    }

    const registrationNo =
      clean(
        asset.assetTag ||
        asset.assetNo,
      );

    if (!registrationNo) {
      console.warn(
        `Skipped ${asset.id}: no registration/asset number.`,
      );

      skipped += 1;
      continue;
    }

    const {
      make,
      model,
    } =
      parseMakeModel(
        asset,
      );

    await prisma
      .fleetVehicle
      .create({
        data: {
          registrationNo,

          assetId:
            asset.id,

          make,

          model,

          year:
            parseYear(
              asset,
            ),

          vehicleType:
            null,

          department:
            asset.department ||
            null,

          site:
            asset.site ||
            asset.location ||
            null,

          status:
            fleetStatusForAsset(
                asset.status,
            ),

          odometerCurrent:
            0,
        },
      });

    created += 1;
  }

  console.log('');
  console.log(
    `Fleet profiles created: ${created}`,
  );

  console.log(
    `Existing/skipped:       ${skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(
    async () => {
      await prisma
        .$disconnect();
    },
  );