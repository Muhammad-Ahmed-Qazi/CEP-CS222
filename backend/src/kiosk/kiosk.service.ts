import { Injectable, BadRequestException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as oracledb from 'oracledb';

export interface CreateKioskDto {
  locationName: string;
  status: string;
}
export interface UpdateKioskDto {
  locationName?: string;
  status?: string;
  currentLoad?: number;
}
export interface CreateBinDto {
  binId: string;
  maxPageCapacity: number;
}
export interface UpdateBinDto {
  binStatus?: string;
  maxPageCapacity?: number;
}

@Injectable()
export class KioskService {
  constructor(private readonly db: DbService) {}

  async getAllKiosks() {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT k.Kiosk_ID, k.Location_name, k.Status, k.Current_load, 
                COUNT(b.Bin_ID) AS total_bins, 
                SUM(CASE WHEN b.Bin_status = 'available' THEN 1 ELSE 0 END) AS available_bins
         FROM KIOSK k
         LEFT JOIN COLLECTION_BINS b ON k.Kiosk_ID = b.Kiosk_ID
         GROUP BY k.Kiosk_ID, k.Location_name, k.Status, k.Current_load`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return (result.rows as Record<string, unknown>[]).map((row) => ({
        kioskId: row.KIOSK_ID as number,
        locationName: row.LOCATION_NAME as string,
        status: row.STATUS as string,
        currentLoad: row.CURRENT_LOAD as number,
        totalBins: (row.TOTAL_BINS as number) || 0,
        availableBins: (row.AVAILABLE_BINS as number) || 0,
      }));
    } finally {
      await conn.close();
    }
  }

  async createKiosk(dto: CreateKioskDto) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `INSERT INTO KIOSK (Location_name, Status, Current_load) 
         VALUES (:loc, :status, 0) RETURNING Kiosk_ID INTO :id`,
        {
          loc: dto.locationName,
          status: dto.status,
          id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        },
        { autoCommit: true },
      );
      return {
        message: 'Kiosk created',
        kioskId: (result.outBinds as any).id[0],
      };
    } finally {
      await conn.close();
    }
  }

  async updateKiosk(id: number, dto: UpdateKioskDto) {
    const conn = await this.db.getConnection();
    try {
      const updates: string[] = [];
      const binds: Record<string, any> = { id };

      if (dto.locationName) {
        updates.push('Location_name = :loc');
        binds.loc = dto.locationName;
      }
      if (dto.status) {
        updates.push('Status = :status');
        binds.status = dto.status;
      }
      if (dto.currentLoad !== undefined) {
        updates.push('Current_load = :load');
        binds.load = dto.currentLoad;
      }

      if (updates.length === 0) return { message: 'No updates provided' };

      await conn.execute(
        `UPDATE KIOSK SET ${updates.join(', ')} WHERE Kiosk_ID = :id`,
        binds,
        { autoCommit: true },
      );
      return { message: 'Kiosk updated', kioskId: id };
    } finally {
      await conn.close();
    }
  }

  async deleteKiosk(id: number) {
    const conn = await this.db.getConnection();
    try {
      // Check active jobs
      const activeJobs = await conn.execute(
        `SELECT COUNT(*) as active_count FROM PLACED_IN p
         JOIN HAS_STATUS hs ON p.Job_ID = hs.Job_ID
         JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
         WHERE p.Kiosk_ID = :id AND js.Status_name IN ('Printing', 'Binned')`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const count = (activeJobs.rows as any[])[0].ACTIVE_COUNT;
      if (count > 0)
        throw new BadRequestException('Cannot delete kiosk with active jobs.');

      await conn.execute(
        `DELETE FROM KIOSK WHERE Kiosk_ID = :id`,
        { id },
        { autoCommit: true },
      );
      return { message: 'Kiosk deleted' };
    } finally {
      await conn.close();
    }
  }

  async getBins(kioskId: number) {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT b.Kiosk_ID, b.Bin_ID, b.Max_page_capacity, b.Bin_status, 
                p.Job_ID as current_job_id, v.Status_Name as current_job_status
         FROM COLLECTION_BINS b
         LEFT JOIN PLACED_IN p ON b.Kiosk_ID = p.Kiosk_ID AND b.Bin_ID = p.Bin_ID
         LEFT JOIN V_JOB_DETAILS v ON p.Job_ID = v.Job_ID
         WHERE b.Kiosk_ID = :kioskId`,
        { kioskId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return (result.rows as Record<string, unknown>[]).map((row) => ({
        kioskId: row.KIOSK_ID as number,
        binId: row.BIN_ID as string,
        maxPageCapacity: row.MAX_PAGE_CAPACITY as number,
        binStatus: row.BIN_STATUS as string,
        currentJobId: row.CURRENT_JOB_ID as number | null,
        currentJobStatus: row.CURRENT_JOB_STATUS as string | null,
      }));
    } finally {
      await conn.close();
    }
  }

  async addBin(kioskId: number, dto: CreateBinDto) {
    const conn = await this.db.getConnection();
    try {
      await conn.execute(
        `INSERT INTO COLLECTION_BINS (Kiosk_ID, Bin_ID, Max_page_capacity, Bin_status) 
         VALUES (:kioskId, :binId, :cap, 'available')`,
        { kioskId, binId: dto.binId, cap: dto.maxPageCapacity },
        { autoCommit: true },
      );
      return { message: 'Bin added', kioskId, binId: dto.binId };
    } finally {
      await conn.close();
    }
  }

  async updateBin(kioskId: number, binId: string, dto: UpdateBinDto) {
    const conn = await this.db.getConnection();
    try {
      const updates: string[] = [];
      const binds: Record<string, any> = { kioskId, binId };

      if (dto.binStatus) {
        updates.push('Bin_status = :status');
        binds.status = dto.binStatus;
      }
      if (dto.maxPageCapacity) {
        updates.push('Max_page_capacity = :cap');
        binds.cap = dto.maxPageCapacity;
      }

      if (updates.length > 0) {
        await conn.execute(
          `UPDATE COLLECTION_BINS SET ${updates.join(', ')} WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
          binds,
          { autoCommit: true },
        );
      }
      return { message: 'Bin updated', kioskId, binId };
    } finally {
      await conn.close();
    }
  }

  async deleteBin(kioskId: number, binId: string) {
    const conn = await this.db.getConnection();
    try {
      const check = await conn.execute(
        `SELECT COUNT(*) as job_count FROM PLACED_IN WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { kioskId, binId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      if ((check.rows as any[])[0].JOB_COUNT > 0)
        throw new BadRequestException('Bin currently has a job placed in it.');

      await conn.execute(
        `DELETE FROM COLLECTION_BINS WHERE Kiosk_ID = :kioskId AND Bin_ID = :binId`,
        { kioskId, binId },
        { autoCommit: true },
      );
      return { message: 'Bin deleted' };
    } finally {
      await conn.close();
    }
  }

  async getAvailableBins() {
    const conn = await this.db.getConnection();
    try {
      const result = await conn.execute(
        `SELECT b.Kiosk_ID, k.Location_name, b.Bin_ID, b.Max_page_capacity
         FROM COLLECTION_BINS b
         JOIN KIOSK k ON b.Kiosk_ID = k.Kiosk_ID
         WHERE b.Bin_status = 'available'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows as Record<string, unknown>[]).map((row) => ({
        kioskId: row.KIOSK_ID as number,
        locationName: row.LOCATION_NAME as string,
        binId: row.BIN_ID as string,
        maxPageCapacity: row.MAX_PAGE_CAPACITY as number,
      }));
    } finally {
      await conn.close();
    }
  }
}
