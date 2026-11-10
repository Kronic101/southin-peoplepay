import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalise(value: unknown) {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

async function main() {
  const [vehicles, assets] = await Promise.all([
    prisma.fleetVehicle.findMany({
      orderBy: {
        registrationNo: 'asc',
      },
    }),

    prisma.hubAsset.findMany({
      where: {
        category: 'VEHICLE',
      },

      orderBy: {
        assetNo: 'asc',
      },

      select: {
        id: true,
        assetNo: true,
        assetTag: true,
        name: true,
        description: true,
        manufacturer: true,
        modelNumber: true,
        serialNumber: true,
        department: true,
        site: true,
        status: true,
      },
    }),
  ]);

  console.log('');
  console.log('FLEET → ASSET LINK PREVIEW');
  console.log('===========================');

  console.log('');
  console.log('CURRENT VEHICLE ASSETS');
  console.log('---------------------------');

  console.table(
    assets.map((asset) => ({
      assetNo: asset.assetNo,
      assetTag: asset.assetTag || '-',
      name: asset.name,
      manufacturer: asset.manufacturer || '-',
      model: asset.modelNumber || '-',
      serial: asset.serialNumber || '-',
      site: asset.site || '-',
      status: asset.status,
    })),
  );

  console.log('');
  console.log('MATCH ANALYSIS');
  console.log('---------------------------');

  const rows = vehicles.map((vehicle) => {
    const reg =
      normalise(vehicle.registrationNo);

    const matches =
      assets.filter((asset) => {
        const candidates = [
          asset.assetNo,
          asset.assetTag,
          asset.serialNumber,
          asset.name,
        ]
          .map(normalise)
          .filter(Boolean);

        return candidates.some(
          (candidate) =>
            candidate === reg ||
            candidate.includes(reg),
        );
      });

    return {
      registration:
        vehicle.registrationNo,

      make:
        vehicle.make,

      model:
        vehicle.model,

      site:
        vehicle.site || '-',

      currentAssetId:
        vehicle.assetId || '-',

      matches:
        matches.length,

      matchedAsset:
        matches.length === 1
          ? `${matches[0].assetNo} - ${matches[0].name}`
          : matches.length > 1
            ? 'AMBIGUOUS'
            : 'NO EXACT MATCH',
    };
  });

  console.table(rows);

  console.log('');
  console.log(
    'PREVIEW ONLY — no FleetVehicle or HubAsset records were changed.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });