import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreateJobDto {
  @IsNotEmpty()
  @IsNumberString()
  pageCount: string;

  @IsNotEmpty()
  @IsIn(['normal', 'bulk'])
  jobType: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string;
}
