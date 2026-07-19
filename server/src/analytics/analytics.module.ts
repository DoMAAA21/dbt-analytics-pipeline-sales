import { Module } from '@nestjs/common';
import { ProductsAnalyticsController } from './products-analytics.controller';
import { ProductsAnalyticsService } from './products-analytics.service';

@Module({
  controllers: [ProductsAnalyticsController],
  providers: [ProductsAnalyticsService],
})
export class AnalyticsModule {}
