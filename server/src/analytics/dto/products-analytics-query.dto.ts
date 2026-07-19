import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ProductsAnalyticsQueryDto {
  /** Inclusive start date (YYYY-MM-DD). Defaults to 60 days before `to`. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive end date (YYYY-MM-DD). Defaults to today (UTC). */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Max products in top / reimbursement tables. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(50)
  limit?: number;
}
