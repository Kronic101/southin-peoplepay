import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

import { PrismaService } from '../prisma/prisma.service';

function clean(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function safeSegment(value: unknown, fallback = 'unknown') {
  const result = clean(value)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return result || fallback;
}

function normaliseBoolean(value: unknown) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

@Injectable()
export class DocumentsService {
  private supabaseClient: SupabaseClient | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  private get bucketName(): string {
    return (
        clean(process.env.SUPABASE_DOCUMENT_BUCKET) ||
        clean(process.env.SUPABASE_OPERATIONAL_EVIDENCE_BUCKET) ||
        'southin-operational-evidence'
    );
    }

  private getSupabase() {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const url =
      clean(process.env.SUPABASE_URL) ||
      clean(process.env.NEXT_PUBLIC_SUPABASE_URL);

    const key =
      clean(process.env.SUPABASE_SECRET_KEY) ||
      clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!url) {
      throw new BadRequestException(
        'SUPABASE_URL is not configured for document storage.',
      );
    }

    if (!key) {
      throw new BadRequestException(
        'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured for document storage.',
      );
    }

    this.supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return this.supabaseClient;
  }

  private async ensurePrivateBucket(): Promise<void> {
    const supabase = this.getSupabase();

    const existing = await supabase.storage.getBucket(
        this.bucketName,
    );

    if (existing.data) {
        if (existing.data.public) {
        throw new BadRequestException(
            `Supabase bucket ${this.bucketName} exists but is public. Southin documents must use a private bucket.`,
        );
        }

        return;
    }

    const created = await supabase.storage.createBucket(
        this.bucketName,
        {
        public: false,
        fileSizeLimit: 25 * 1024 * 1024,
        },
    );

    if (created.error) {
        throw new BadRequestException(
        `Unable to create Supabase document bucket ${this.bucketName}: ${created.error.message}`,
        );
    }
    }

  async uploadBuffer(input: {
    module: string;
    entityType: string;
    entityId: string;
    category: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;

    title?: string | null;
    notes?: string | null;

    uploadedBy?: string | null;
    uploadedByEmail?: string | null;
    uploadedByEntraId?: string | null;

    documentDate?: Date | null;
    expiresAt?: Date | null;

    isConfidential?: boolean;
    storagePath?: string | null;
    upsert?: boolean;
  }) {
    const moduleName =
      clean(input.module).toUpperCase();

    const entityType =
      clean(input.entityType).toUpperCase();

    const entityId =
      clean(input.entityId);

    const category =
      clean(input.category).toUpperCase();

    if (!moduleName) {
      throw new BadRequestException(
        'Document module is required.',
      );
    }

    if (!entityType) {
      throw new BadRequestException(
        'Document entityType is required.',
      );
    }

    if (!entityId) {
      throw new BadRequestException(
        'Document entityId is required.',
      );
    }

    if (!category) {
      throw new BadRequestException(
        'Document category is required.',
      );
    }

    if (!input.buffer?.length) {
      throw new BadRequestException(
        'Document file is empty.',
      );
    }

    if (
      input.buffer.length >
      25 * 1024 * 1024
    ) {
      throw new BadRequestException(
        'Document exceeds the 25 MB upload limit.',
      );
    }

    await this.ensurePrivateBucket();

    const originalFileName =
      safeSegment(
        input.fileName,
        'document.bin',
      );

    const storagePath =
      clean(input.storagePath) ||
      [
        moduleName.toLowerCase(),
        entityType.toLowerCase(),
        safeSegment(entityId),
        `${Date.now()}-${originalFileName}`,
      ].join('/');

    const supabase =
      this.getSupabase();

    const upload =
      await supabase.storage
        .from(this.bucketName)
        .upload(
          storagePath,
          input.buffer,
          {
            contentType:
              clean(input.mimeType) ||
              'application/octet-stream',

            upsert:
              Boolean(
                input.upsert,
              ),
          },
        );

    if (upload.error) {
      throw new BadRequestException(
        `Supabase document upload failed: ${upload.error.message}`,
      );
    }

    try {
      return await this.db()
        .documentAttachment
        .create({
          data: {
            module:
              moduleName,

            entityType,

            entityId,

            category,

            title:
              clean(input.title) ||
              originalFileName,

            notes:
              clean(input.notes) ||
              null,

            originalFileName,

            mimeType:
              clean(input.mimeType) ||
              'application/octet-stream',

            fileSize:
              input.buffer.length,

            storageProvider:
              'SUPABASE',

            storageBucket:
              this.bucketName,

            storagePath,

            uploadedBy:
              clean(input.uploadedBy) ||
              null,

            uploadedByEmail:
              clean(input.uploadedByEmail) ||
              null,

            uploadedByEntraId:
              clean(input.uploadedByEntraId) ||
              null,

            documentDate:
              input.documentDate ||
              null,

            expiresAt:
              input.expiresAt ||
              null,

            status:
              'UPLOADED',

            isConfidential:
              Boolean(
                input.isConfidential,
              ),
          },
        });
    } catch (error) {
      /*
       * Avoid an orphaned object if the
       * database metadata insert fails.
       */
      await supabase.storage
        .from(this.bucketName)
        .remove([
          storagePath,
        ]);

      throw error;
    }
  }

  async listDocuments(input: {
    module?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    category?: string | null;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (clean(input.module)) {
      where.module =
        clean(input.module)
          .toUpperCase();
    }

    if (clean(input.entityType)) {
      where.entityType =
        clean(input.entityType)
          .toUpperCase();
    }

    if (clean(input.entityId)) {
      where.entityId =
        clean(input.entityId);
    }

    if (clean(input.category)) {
      where.category =
        clean(input.category)
          .toUpperCase();
    }

    return this.db()
      .documentAttachment
      .findMany({
        where,

        orderBy: {
          uploadedAt:
            'desc',
        },
      });
  }

  async getDocument(
    id: string,
  ) {
    const record =
      await this.db()
        .documentAttachment
        .findUnique({
          where: {
            id,
          },
        });

    if (
      !record ||
      record.deletedAt
    ) {
      throw new NotFoundException(
        'Document not found.',
      );
    }

    return record;
  }

  async createSignedUrl(
    id: string,
    expiresInSeconds = 900,
  ) {
    const record =
      await this.getDocument(
        id,
      );

    const seconds =
      Math.max(
        60,
        Math.min(
          Number(
            expiresInSeconds ||
              900,
          ),
          3600,
        ),
      );

    const supabase =
      this.getSupabase();

    const signed =
      await supabase.storage
        .from(
          record.storageBucket,
        )
        .createSignedUrl(
          record.storagePath,
          seconds,
        );

    if (
      signed.error ||
      !signed.data?.signedUrl
    ) {
      throw new BadRequestException(
        `Unable to create document link: ${
          signed.error
            ?.message ||
          'Unknown Supabase Storage error.'
        }`,
      );
    }

    return {
      document:
        record,

      url:
        signed.data
          .signedUrl,

      expiresIn:
        seconds,
    };
  }

  async softDeleteDocument(
    id: string,
  ) {
    await this.getDocument(
      id,
    );

    return this.db()
      .documentAttachment
      .update({
        where: {
          id,
        },

        data: {
          deletedAt:
            new Date(),

          status:
            'ARCHIVED',
        },
      });
  }

  async createStoresIssueDocketDocument(
    input: {
      requisition: any;
      movement: any;
      operations: any;

      uploadedBy?: string | null;
      uploadedByEmail?: string | null;
      uploadedByEntraId?: string | null;
    },
  ) {
    const requisition =
      input.requisition;

    const movement =
      input.movement;

    if (!movement?.id) {
      throw new BadRequestException(
        'Posted StockMovement is required before generating a Stores issue docket.',
      );
    }

    if (
      clean(
        movement.status,
      ).toUpperCase() !==
      'POSTED'
    ) {
      throw new BadRequestException(
        'Stores issue docket can only be generated for a POSTED stock movement.',
      );
    }

    const existing =
      await this.db()
        .documentAttachment
        .findFirst({
          where: {
            module:
              'STORES',

            entityType:
              'STOCK_MOVEMENT',

            entityId:
              movement.id,

            category:
              'ISSUE_DOCKET',

            deletedAt:
              null,
          },

          orderBy: {
            uploadedAt:
              'desc',
          },
        });

    if (existing) {
      return existing;
    }

    const pdf =
      await this.renderStoresIssueDocketPdf(
        input,
      );

    const requisitionNo =
      safeSegment(
        requisition
          ?.requisitionNo,
        'stores-requisition',
      );

    const movementNo =
      safeSegment(
        movement
          ?.movementNo,
        'stores-issue',
      );

    return this.uploadBuffer({
      module:
        'STORES',

      entityType:
        'STOCK_MOVEMENT',

      entityId:
        movement.id,

      category:
        'ISSUE_DOCKET',

      fileName:
        `${movementNo}-issue-docket.pdf`,

      mimeType:
        'application/pdf',

      buffer:
        pdf,

      title:
        `Stores Issue Docket ${movement.movementNo}`,

      notes:
        `System-generated immutable issue docket for ${requisition.requisitionNo}.`,

      uploadedBy:
        input.uploadedBy ||
        movement.postedBy ||
        null,

      uploadedByEmail:
        input.uploadedByEmail ||
        null,

      uploadedByEntraId:
        input.uploadedByEntraId ||
        null,

      documentDate:
        movement.postedAt
          ? new Date(
              movement.postedAt,
            )
          : new Date(),

      isConfidential:
        false,

      storagePath:
        [
          'stores',
          'issues',
          requisitionNo,
          movementNo,
          `${movementNo}-issue-docket.pdf`,
        ].join('/'),
    });
  }

  private async renderStoresIssueDocketPdf(
    input: {
      requisition: any;
      movement: any;
      operations: any;
    },
  ): Promise<Buffer> {
    return new Promise(
      (
        resolve,
        reject,
      ) => {
        const document =
          new PDFDocument({
            size:
              'A4',

            margin:
              36,

            info: {
              Title:
                `Stores Issue Docket ${input.movement?.movementNo || ''}`,

              Author:
                'Southin Hub',
            },
          });

        const chunks:
          Buffer[] = [];

        document.on(
          'data',
          (
            chunk:
              Buffer,
          ) => {
            chunks.push(
              Buffer.from(
                chunk,
              ),
            );
          },
        );

        document.on(
          'error',
          reject,
        );

        document.on(
          'end',
          () =>
            resolve(
              Buffer.concat(
                chunks,
              ),
            ),
        );

        const requisition =
          input.requisition ||
          {};

        const movement =
          input.movement ||
          {};

        const operations =
          input.operations ||
          {};

        const operationLines:
          any[] =
            Array.isArray(
              operations.lines,
            )
              ? operations.lines
              : [];

        const movementLines:
          any[] =
            Array.isArray(
              movement.lines,
            )
              ? movement.lines
              : [];

        const operationByItem =
          new Map<
            string,
            any
          >(
            operationLines
              .filter(
                (
                  line:
                    any,
                ) =>
                  Boolean(
                    line.stockItemId,
                  ),
              )
              .map(
                (
                  line:
                    any,
                ) => [
                  String(
                    line.stockItemId,
                  ),
                  line,
                ],
              ),
          );

        document
          .font(
            'Helvetica-Bold',
          )
          .fontSize(
            17,
          )
          .text(
            'SOUTHIN CONSTRUCTION LIMITED',
            {
              align:
                'center',
            },
          );

        document
          .fontSize(
            13,
          )
          .text(
            'STORES ISSUE / DELIVERY DOCKET',
            {
              align:
                'center',
            },
          );

        document.moveDown(
          1,
        );

        const addPair = (
          label:
            string,
          value:
            unknown,
        ) => {
          document
            .font(
              'Helvetica-Bold',
            )
            .fontSize(
              9,
            )
            .text(
              `${label}: `,
              {
                continued:
                  true,
              },
            )
            .font(
              'Helvetica',
            )
            .text(
              clean(
                value,
              ) ||
                '-',
            );
        };

        addPair(
          'Requisition',
          requisition.requisitionNo,
        );

        addPair(
          'Movement',
          movement.movementNo,
        );

        addPair(
          'Request Type',
          operations.inventoryControlType,
        );

        addPair(
          'Requested By',
          requisition.requestedBy,
        );

        addPair(
          'Department',
          requisition.department,
        );

        addPair(
          'Site',
          requisition.site,
        );

        addPair(
          'Project',
          requisition.projectCode,
        );

        addPair(
          'Issued From',
          movement.fromLocation
            ?.locationName ||
            movement.fromLocation
              ?.locationCode ||
            movement.fromLocationId,
        );

        addPair(
          'Issued By',
          movement.postedBy,
        );

        addPair(
          'Posted',
          movement.postedAt
            ? new Date(
                movement.postedAt,
              ).toLocaleString(
                'en-ZM',
              )
            : '-',
        );

        document.moveDown(
          1,
        );

        const columns = {
          item:
            36,

          requested:
            310,

          issue:
            375,

          remaining:
            440,

          uom:
            510,
        };

        const rowWidth =
          523;

        const drawHeader =
          () => {
            const y =
              document.y;

            document
              .font(
                'Helvetica-Bold',
              )
              .fontSize(
                8,
              );

            document.text(
              'Item',
              columns.item,
              y,
              {
                width:
                  260,
              },
            );

            document.text(
              'Requested',
              columns.requested,
              y,
              {
                width:
                  60,
              },
            );

            document.text(
              'This Issue',
              columns.issue,
              y,
              {
                width:
                  60,
              },
            );

            document.text(
              'Remaining',
              columns.remaining,
              y,
              {
                width:
                  60,
              },
            );

            document.text(
              'UOM',
              columns.uom,
              y,
              {
                width:
                  45,
              },
            );

            document
              .moveTo(
                36,
                y + 13,
              )
              .lineTo(
                rowWidth + 36,
                y + 13,
              )
              .stroke();

            document.y =
              y + 18;
          };

        drawHeader();

        for (
          const line
          of movementLines
        ) {
          if (
            document.y >
            700
          ) {
            document.addPage();
            drawHeader();
          }

          const operation =
            operationByItem.get(
              String(
                line.stockItemId,
              ),
            );

          const y =
            document.y;

          const itemLabel =
            [
              line.stockItem
                ?.itemCode ||
                operation
                  ?.itemCode ||
                '',

              line.stockItem
                ?.itemName ||
                operation
                  ?.itemName ||
                'Item',
            ]
              .filter(
                Boolean,
              )
              .join(
                ' - ',
              );

          document
            .font(
              'Helvetica',
            )
            .fontSize(
              8,
            )
            .text(
              itemLabel,
              columns.item,
              y,
              {
                width:
                  260,
              },
            );

          document.text(
            String(
              operation
                ?.requestedQuantity ??
                '-',
            ),
            columns.requested,
            y,
            {
              width:
                60,
            },
          );

          document.text(
            String(
              Number(
                line.quantity ||
                  0,
              ),
            ),
            columns.issue,
            y,
            {
              width:
                60,
            },
          );

          document.text(
            String(
              operation
                ?.remainingQuantity ??
                '-',
            ),
            columns.remaining,
            y,
            {
              width:
                60,
            },
          );

          document.text(
            clean(
              operation
                ?.unitOfMeasure ||
                line.stockItem
                  ?.unitOfMeasure,
            ) ||
              '-',
            columns.uom,
            y,
            {
              width:
                45,
            },
          );

          document.y =
            Math.max(
              document.y,
              y + 22,
            );

          document
            .moveTo(
              36,
              document.y,
            )
            .lineTo(
              rowWidth + 36,
              document.y,
            )
            .strokeOpacity(
              0.25,
            )
            .stroke()
            .strokeOpacity(
              1,
            );

          document.y +=
            6;
        }

        document.moveDown(
          2,
        );

        const signatureY =
          Math.min(
            Math.max(
              document.y,
              610,
            ),
            720,
          );

        document
          .font(
            'Helvetica',
          )
          .fontSize(
            9,
          );

        document
          .moveTo(
            45,
            signatureY,
          )
          .lineTo(
            240,
            signatureY,
          )
          .stroke();

        document.text(
          'Stores Officer Signature',
          45,
          signatureY +
            5,
        );

        document
          .moveTo(
            330,
            signatureY,
          )
          .lineTo(
            525,
            signatureY,
          )
          .stroke();

        document.text(
          'Receiver / Custodian Signature',
          330,
          signatureY +
            5,
        );

        document
          .fontSize(
            7,
          )
          .fillColor(
            'gray',
          )
          .text(
            'Generated by Southin Hub from the posted stock movement. This document is the transaction audit copy.',
            36,
            770,
            {
              width:
                523,
              align:
                'center',
            },
          );

        document.end();
      },
    );
  }

  normaliseConfidentialFlag(
    value: unknown,
  ) {
    return normaliseBoolean(
      value,
    );
  }
}
