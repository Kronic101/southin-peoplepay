import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.assetsService.getDashboard();
  }

  @Get('stock-items')
  getStockItems() {
    return this.assetsService.getStockItems();
  }

  @Post('stock-items')
  createStockItem(@Body() body: any) {
    return this.assetsService.createStockItem(body);
  }

  @Post('stock-items/preview-code')
  previewStockItemCode(@Body() body: any) {
    return this.assetsService.previewStockItemCode(body);
  }

  @Get('locations')
  getLocations() {
    return this.assetsService.getLocations();
  }

  @Post('locations')
  createLocation(@Body() body: any) {
    return this.assetsService.createLocation(body);
  }

  @Get('balances')
  getBalances() {
    return this.assetsService.getBalances();
  }

  @Get('ledger')
  getStockLedger() {
    return this.assetsService.getStockLedger();
  }

  @Get('movements')
  getMovements() {
    return this.assetsService.getMovements();
  }

  @Get('stock-counts')
  getStockCounts() {
    return this.assetsService.getStockCounts();
  }

  @Post('stock-counts')
  createStockCount(@Body() body: any) {
    return this.assetsService.createStockCount(body);
  }

  @Patch('stock-counts/:id/approve')
  approveStockCount(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.approveStockCount(id, body);
  }

  @Get('custody')
  getCustodyAssignments() {
    return this.assetsService.getCustodyAssignments();
  }

  @Post('custody')
  createCustodyAssignment(@Body() body: any) {
    return this.assetsService.createCustodyAssignment(body);
  }

  @Patch('custody/:id/return')
  returnCustodyAssignment(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.returnCustodyAssignment(id, body);
  }

  @Get('deployments')
  getScaffoldDeployments() {
    return this.assetsService.getScaffoldDeployments();
  }

  @Post('deployments')
  createScaffoldDeployment(@Body() body: any) {
    return this.assetsService.createScaffoldDeployment(body);
  }

  @Patch('deployments/:id/close')
  closeScaffoldDeployment(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.closeScaffoldDeployment(id, body);
  }

  @Get('movements/:id')
  getMovement(@Param('id') id: string) {
    return this.assetsService.getMovement(id);
  }

  @Post('movements')
  createMovement(@Body() body: any) {
    return this.assetsService.createMovement(body);
  }

  @Patch('movements/:id/approve')
  approveMovement(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.approveMovement(id, body);
  }

  @Patch('movements/:id/post')
  postMovement(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.postMovement(id, body);
  }

  @Get('qr-tags')
  getQrTags() {
    return this.assetsService.getQrTags();
  }

  @Post('qr-tags')
  createQrTag(@Body() body: any) {
    return this.assetsService.createQrTag(body);
  }

  @Post('qr-tags/:tagCode/scan')
  scanQrTag(@Param('tagCode') tagCode: string, @Body() body: any) {
    return this.assetsService.scanQrTag(tagCode, body);
  }

  @Get('register')
  getAssets() {
    return this.assetsService.getAssets();
  }

  @Post('register')
  createAsset(@Body() body: any) {
    return this.assetsService.createAsset(body);
  }

  @Get('scaffolds')
  getScaffoldComponents() {
    return this.assetsService.getScaffoldComponents();
  }

  @Post('scaffolds')
  createScaffoldComponent(@Body() body: any) {
    return this.assetsService.createScaffoldComponent(body);
  }

  @Post('seed-demo')
  seedDemoAssetData() {
    return this.assetsService.seedDemoAssetData();
  }
}