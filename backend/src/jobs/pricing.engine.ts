import { BadRequestException } from '@nestjs/common';

export interface PricingParams {
  pages: number;
  copies: number;
  jobType: 'normal' | 'bulk';
  printMode: 'bw' | 'colour';
  printSide: 'single' | 'double';
  collectionSlot: string; // ISO string
}

export function calculateJobDetails(params: PricingParams) {
  const { pages, copies, jobType, printMode, printSide, collectionSlot } =
    params;

  let basePrice = jobType === 'bulk' ? 5 : 7;
  const totalPages = pages * copies;

  // Side adjustment
  if (printSide === 'double') basePrice -= 2;
  if (printSide === 'single') basePrice += 1;

  // Colour adjustment (Assumption: colour costs extra, adjust as needed)
  if (printMode === 'colour') basePrice += 10;

  const slotDate = new Date(collectionSlot);
  let expiryTime = new Date(slotDate);

  if (jobType === 'normal') {
    const hour = slotDate.getHours();
    if (hour < 8 || hour > 20) {
      throw new BadRequestException(
        'Collection slot must be between 8 AM and 8 PM',
      );
    }
    // Linear interpolation: 8 AM (+5), 8 PM (+0)
    // Formula: 5 - ((hour - 8) * (5 / 12))
    const timeSurcharge = 5 - (hour - 8) * (5 / 12);
    basePrice += timeSurcharge;

    // Normal expiry is 2 hours after slot
    expiryTime.setHours(expiryTime.getHours() + 2);
  } else {
    // Bulk jobs forced to next 8 PM
    slotDate.setHours(20, 0, 0, 0);
    // Expiry is next day 10:30 AM
    expiryTime = new Date(slotDate);
    expiryTime.setDate(expiryTime.getDate() + 1);
    expiryTime.setHours(10, 30, 0, 0);
  }

  // Round to 2 decimal places to avoid floating point anomalies
  const totalCost = Math.round(totalPages * basePrice * 100) / 100;

  return {
    totalPages,
    totalCost,
    calculatedSlot: slotDate,
    expiryTime,
  };
}
