import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';

@Injectable()
export class AdminKiosksService {
  constructor(private readonly db: DbService) {}

  // --- TASK 3: Get Available Bins with Capacity Filter ---
  async getAvailableBins(pagesRequired?: number) {
    const conn = await this.db.getConnection();
    try {
      let query = `
        SELECT b.Kiosk_ID, k.Location_name, b.Bin_ID, b.Max_page_capacity, b.used_pages,
               (b.Max_page_capacity - b.used_pages) as REMAINING_CAPACITY
        FROM COLLECTION_BINS b
        JOIN KIOSK k ON b.Kiosk_ID = k.Kiosk_ID
        WHERE b.Bin_status = 'available'
      `;
      const binds: oracledb.BindParameters = {};

      if (pagesRequired) {
        query += ` AND (b.Max_page_capacity - b.used_pages) >= :pagesRequired`;
        binds.pagesRequired = pagesRequired;
      }

      const result = await conn.execute(query, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return (result.rows as any[]).map((row) => ({
        kioskId: row.KIOSK_ID,
        locationName: row.LOCATION_NAME,
        binId: row.BIN_ID,
        maxPageCapacity: row.MAX_PAGE_CAPACITY,
        usedPages: row.USED_PAGES,
        remainingCapacity: row.REMAINING_CAPACITY,
      }));
    } finally {
      await conn.close();
    }
  }

  // --- TASK 6: Get Kiosk Bins with Jobs Array ---
  async getKioskBins(kioskId: number) {
    const conn = await this.db.getConnection();
    try {
      // 1. Fetch all physical bins for the kiosk
      const binsRes = await conn.execute(
        `SELECT Bin_ID, Max_page_capacity, NVL(used_pages, 0) as USED_PAGES, Bin_status 
        FROM COLLECTION_BINS WHERE Kiosk_ID = :kioskId`,
        { kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      // 2. Fetch all active jobs placed in these bins
      // We filter by 'Printing' and 'Binned' because 'Collected' jobs are physically removed
      const jobsRes = await conn.execute(
        `SELECT pi.Bin_ID, pj.Job_ID, pj.Page_count, pj.copies, 
                (pj.Page_count * pj.copies) as EFFECTIVE_PAGES, v.Status_Name
        FROM PLACED_IN pi
        JOIN PRINT_JOB pj ON pi.Job_ID = pj.Job_ID
        JOIN V_JOB_DETAILS v ON pj.Job_ID = v.Job_ID
        WHERE pi.Kiosk_ID = :kioskId 
        AND v.Status_Name IN ('Printing', 'Binned')`,
        { kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const jobsData = jobsRes.rows as any[];
      const binsData = binsRes.rows as any[];

      // 3. Assemble the nested structure
      return binsData.map((bin) => {
        // Filter jobs belonging to this specific bin
        const binJobs = jobsData
          .filter((j) => j.BIN_ID === bin.BIN_ID)
          .map((j) => ({
            jobId: j.JOB_ID,
            pageCount: j.PAGE_COUNT,
            copies: j.COPIES,
            effectivePages: j.EFFECTIVE_PAGES,
            statusName: j.STATUS_NAME,
          }));

        return {
          binId: bin.BIN_ID,
          maxPageCapacity: bin.MAX_PAGE_CAPACITY,
          usedPages: bin.USED_PAGES,
          remainingCapacity: bin.MAX_PAGE_CAPACITY - bin.USED_PAGES,
          binStatus: bin.BIN_STATUS,
          isFull: (bin.USED_PAGES >= bin.MAX_PAGE_CAPACITY), // Useful for UI logic
          jobs: binJobs,
        };
      });
    } finally {
      await conn.close();
    }
  }
}
