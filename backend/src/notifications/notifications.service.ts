import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { mapToCamelCase } from 'src/common/utils/mapper';
import * as oracledb from 'oracledb';

@Injectable()
export class NotificationsService {
  constructor(private dbService: DbService) {}

  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    jobId?: number,
  ) {
    const conn = await this.dbService.getConnection();
    try {
      await conn.execute(
        `INSERT INTO NOTIFICATION (User_ID, Related_Job_ID, Title, Message, Notification_Type) 
         VALUES (:userId, :jobId, :title, :message, :type)`,
        { userId, jobId: jobId || null, title, message, type },
        { autoCommit: true },
      );
    } finally {
      await conn.close();
    }
  }

  async findAll(userId: number) {
    const conn = await this.dbService.getConnection();
    try {
      const result = await conn.execute(
        `SELECT * FROM NOTIFICATION WHERE User_ID = :userId ORDER BY Created_At DESC`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return (result.rows || []).map(mapToCamelCase);
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 5: Mark a single notification as read
   */
  async markAsRead(notificationId: number, userId: number) {
    const conn = await this.dbService.getConnection();
    try {
      const result = await conn.execute(
        `UPDATE NOTIFICATION SET Is_Read = 1 
         WHERE Notification_ID = :notificationId AND User_ID = :userId`,
        { notificationId, userId },
        { autoCommit: true },
      );

      if (result.rowsAffected === 0) {
        throw new NotFoundException('Notification not found');
      }
      return { message: 'Notification marked as read' };
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 5: Mark all notifications for a user as read
   */
  async markAllAsRead(userId: number) {
    const conn = await this.dbService.getConnection();
    try {
      await conn.execute(
        `UPDATE NOTIFICATION SET Is_Read = 1 WHERE User_ID = :userId`,
        { userId },
        { autoCommit: true },
      );
      return { message: 'All notifications marked as read' };
    } finally {
      await conn.close();
    }
  }

  /**
   * Task 5: Clear all notifications for a user
   */
  async deleteAll(userId: number) {
    const conn = await this.dbService.getConnection();
    try {
      await conn.execute(
        `DELETE FROM NOTIFICATION WHERE User_ID = :userId`,
        { userId },
        { autoCommit: true },
      );
      return { message: 'All notifications cleared' };
    } finally {
      await conn.close();
    }
  }
}
