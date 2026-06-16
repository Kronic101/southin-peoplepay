import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssetsImportService } from './assets-import.service';
import {
  CreateAssetImportPreviewDto,
  PostAssetImportBatchDto,
} from '../dto/asset-import.dto';

@Controller('assets/imports')
export class AssetsImportController {
  constructor(private readonly importsService: AssetsImportService) {}

  @Post('preview')
  createPreview(@Body() dto: CreateAssetImportPreviewDto) {
    return this.importsService.createPreview(dto);
  }

  @Get()
  listBatches() {
    return this.importsService.listBatches();
  }

  @Get(':id')
  getBatch(@Param('id') id: string) {
    return this.importsService.getBatch(id);
  }

  @Post(':id/post')
  postBatch(@Param('id') id: string, @Body() dto: PostAssetImportBatchDto) {
    return this.importsService.postBatch(id, dto);
  }
}