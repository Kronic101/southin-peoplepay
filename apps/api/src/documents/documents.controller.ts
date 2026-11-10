import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  list(
    @Query('module') module?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('category') category?: string,
  ) {
    return this.documentsService.listDocuments({
      module,
      entityType,
      entityId,
      category,
    });
  }

  @Get(':id/signed-url')
  signedUrl(
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    return this.documentsService.createSignedUrl(
      id,
      Number(expiresIn || 900),
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize:
          25 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile()
    file: Express.Multer.File,

    @Body()
    body: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Document file is required.',
      );
    }

    return this.documentsService.uploadBuffer({
      module:
        body.module,

      entityType:
        body.entityType,

      entityId:
        body.entityId,

      category:
        body.category,

      title:
        body.title,

      notes:
        body.notes,

      fileName:
        file.originalname,

      mimeType:
        file.mimetype,

      buffer:
        file.buffer,

      uploadedBy:
        body.uploadedBy,

      uploadedByEmail:
        body.uploadedByEmail,

      uploadedByEntraId:
        body.uploadedByEntraId,

      documentDate:
        body.documentDate
          ? new Date(
              body.documentDate,
            )
          : null,

      expiresAt:
        body.expiresAt
          ? new Date(
              body.expiresAt,
            )
          : null,

      isConfidential:
        this.documentsService
          .normaliseConfidentialFlag(
            body.isConfidential,
          ),
    });
  }

  @Delete(':id')
  archive(
    @Param('id')
    id: string,
  ) {
    return this.documentsService.softDeleteDocument(
      id,
    );
  }
}
