import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsAnalyticsQueryDto } from './dto/products-analytics-query.dto';
import { ProductsAnalyticsService } from './products-analytics.service';

@Controller('analytics/products')
@UseGuards(JwtAuthGuard)
export class ProductsAnalyticsController {
  constructor(
    private readonly productsAnalyticsService: ProductsAnalyticsService,
  ) {}

  /**
   * Product performance from DuckDB gold marts.
   *
   * Query: from, to (YYYY-MM-DD, inclusive). Default window = last 60 days.
   */
  @Get()
  getProductsAnalytics(@Query() query: ProductsAnalyticsQueryDto) {
    return this.productsAnalyticsService.getProductsAnalytics(query);
  }
}
