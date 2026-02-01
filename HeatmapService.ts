import { query } from '../config/database';
import { format } from 'date-fns';
import { HeatmapEntry } from '../types/index';
import crypto from 'crypto';

export class HeatmapService {
    /**
     * Update heatmap entry for today
     */
    static async updateHeatmapEntry(userId: string, date: Date, violation: boolean = false): Promise<void> {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');

            // Check if entry exists
            const existing = await query(
                'SELECT * FROM heatmap_entries WHERE user_id = $1 AND date = $2',
                [userId, dateStr]
            );

            if (existing.rows.length === 0) {
                // Create new entry
                const id = crypto.randomUUID();
                await query(
                    `INSERT INTO heatmap_entries 
           (id, user_id, date, productivity_score, hours_worked, tasks_completed, violations)
           VALUES ($1, $2, $3, 0, 0, 0, $4)`,
                    [id, userId, dateStr, violation ? 1 : 0]
                );
            } else {
                // Update existing
                const entry = existing.rows[0];
                const newViolations = entry.violations + (violation ? 1 : 0);

                await query(
                    `UPDATE heatmap_entries 
           SET violations = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
                    [newViolations, entry.id]
                );
            }

            // Recalculate metrics
            await this.recalculateDailyMetrics(userId, dateStr);
        } catch (error) {
            console.error('Error updating heatmap:', error);
            throw error;
        }
    }

    /**
     * Recalculate daily metrics (hours, score, tasks)
     */
    private static async recalculateDailyMetrics(userId: string, dateStr: string): Promise<void> {
        try {
            // Get sessions for the day
            // SQLite date functions are different.
            // date(started_at) should work if started_at is ISO string.
            const sessionsResult = await query(
                `SELECT duration_minutes, status, coins_earned, coins_deducted 
         FROM deep_work_sessions 
         WHERE user_id = $1 AND date(started_at) = $2`,
                [userId, dateStr]
            );

            // Get tasks completed
            const tasksResult = await query(
                `SELECT count(*) as count 
         FROM tasks 
         WHERE user_id = $1 AND completed = 1 AND date(completed_at) = $2`,
                [userId, dateStr]
            );

            const tasksCompleted = parseInt(tasksResult.rows[0].count);

            // Calculate hours
            const totalMinutes = sessionsResult.rows.reduce((acc: number, session: any) => {
                return acc + (session.duration_minutes || 0);
            }, 0);
            const hoursWorked = parseFloat((totalMinutes / 60).toFixed(2));

            // Calculate score (simple algorithm)
            // Base 50 + (5 per hour) + (10 per task) - (20 per violation)
            const entryResult = await query(
                'SELECT violations FROM heatmap_entries WHERE user_id = $1 AND date = $2',
                [userId, dateStr]
            );

            if (entryResult.rows.length === 0) return;

            const violations = entryResult.rows[0].violations;

            let score = 50 + (hoursWorked * 5) + (tasksCompleted * 10) - (violations * 20);
            score = Math.max(0, Math.min(100, score)); // Clamp 0-100

            // Update entry
            await query(
                `UPDATE heatmap_entries 
         SET hours_worked = $1, tasks_completed = $2, productivity_score = $3
         WHERE user_id = $4 AND date = $5`,
                [hoursWorked, tasksCompleted, Math.round(score), userId, dateStr]
            );
        } catch (error) {
            console.error('Error recalculating metrics:', error);
        }
    }

    /**
     * Get heatmap data for a range
     */
    static async getHeatmapData(userId: string, startDate: Date, endDate: Date): Promise<HeatmapEntry[]> {
        try {
            const startStr = format(startDate, 'yyyy-MM-dd');
            const endStr = format(endDate, 'yyyy-MM-dd');

            const result = await query(
                `SELECT * FROM heatmap_entries 
         WHERE user_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC`,
                [userId, startStr, endStr]
            );

            return result.rows.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                date: row.date,
                productivityScore: row.productivity_score,
                hoursWorked: row.hours_worked,
                tasksCompleted: row.tasks_completed,
                violations: row.violations,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
            }));
        } catch (error) {
            console.error('Error getting heatmap data:', error);
            throw error;
        }
    }
}

export default HeatmapService;
