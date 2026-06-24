import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { FleetCostsService } from './costs.service';

@Controller('fleet/costs')
export class FleetCostsController {
  constructor(private readonly service: FleetCostsService) {}

  @Get()
  getCosts() {
    return this.service.getCosts();
  }

  @Get('pending')
  getPendingCosts() {
    return this.service.getPendingCosts();
  }

  @Get('posted')
  getPostedCosts() {
    return this.service.getPostedCosts();
  }

  @Patch(':id/review')
  reviewCost(@Param('id') id: string, @Body() body: any) {
    return this.service.reviewCost(id, body);
  }

  @Patch(':id/finance-review')
  financeReviewCost(@Param('id') id: string, @Body() body: any) {
    return this.service.reviewCost(id, body);
  }

  @Patch(':id/finance-review')
  financeReview(@Param('id') id: string, @Body() body: any) {
    return this.service.financeReview(id, body);
  }

  @Patch(':id/post-to-finance')
  postToFinance(@Param('id') id: string, @Body() body: any) {
    return this.service.postToFinance(id, body);
  }
}