import { query } from '../config/database';
import { FocusTrendData } from '../types/index';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export class FocusTrendService {
    /**
     * Get focus trend data for specified range
     */
    static async getFocusTrend(
        userId: string,
        range: 7 | 14 | 30 = 7
    ): Promise<FocusTrendData[]> {
        try {
            const endDate = new Date();
            const startDate = subDays(endDate, range - 1);

            const days = eachDayOfInterval({ start: startDate, end: endDate });
            const trendData: FocusTrendData[] = [];

            for (const day of days) {
                const dateStr = format(day, 'yyyy-MM-DD');

                // Get heatmap entry for the day
                const heatmapResult = await query(
                    `SELECT * FROM heatmap_entries 
           WHERE user_id = $1 AND date = $2`,
                    [userId, dateStr]
                );

                if (heatmapResult.rows.length > 0) {
                    const entry = heatmapResult.rows[0];

                    trendData.push({
                        date: dateStr,
                        hoursWorked: parseFloat(entry.hours_worked),
                        tasksCompleted: entry.tasks_completed,
                        trendScore: this.calculateTrendScore(
                            parseFloat(entry.hours_worked),
                            entry.tasks_completed,
                            entry.violations
                        ),
                        hasViolations: entry.violations > 0,
                    });
                } else {
                    // No data for this day
                    trendData.push({
                        date: dateStr,
                        hoursWorked: 0,
                        tasksCompleted: 0,
                        trendScore: 0,
                        hasViolations: false,
                    });
                }
            }

            return trendData;
        } catch (error) {
            console.error('Error getting focus trend:', error);
            throw error;
        }
    }

    /**
     * Calculate normalized trend score (0-100)
     * Similar to productivity score but optimized for graphing
     */
    static calculateTrendScore(
        hoursWorked: number,
        tasksCompleted: number,
        violations: number
    ): number {
        // Base score from hours and tasks
        let score = (hoursWorked * 25) + (tasksCompleted * 15);

        // Penalty for violations
        score -= violations * 15;

        // Normalize to 0-100
        return Math.max(0, Math.min(100, Math.floor(score)));
    }

    /**
     * Detect trend direction
     */
    static detectTrendDirection(trendData: FocusTrendData[]): 'upward' | 'downward' | 'stable' {
        if (trendData.length < 3) return 'stable';

        // Compare first half vs second half average
        const midpoint = Math.floor(trendData.length / 2);
        const firstHalf = trendData.slice(0, midpoint);
        const secondHalf = trendData.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, d) => sum + d.trendScore, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, d) => sum + d.trendScore, 0) / secondHalf.length;

        const difference = secondAvg - firstAvg;

        if (difference > 10) return 'upward';
        if (difference < -10) return 'downward';
        return 'stable';
    }

    /**
     * Get trend statistics
     */
    static async getTrendStats(userId: string, range: 7 | 14 | 30 = 7): Promise<{
        averageScore: number;
        totalHours: number;
        totalTasks: number;
        totalViolations: number;
        direction: 'upward' | 'downward' | 'stable';
    }> {
        try {
            const trendData = await this.getFocusTrend(userId, range);

            const totalHours = trendData.reduce((sum, d) => sum + d.hoursWorked, 0);
            const totalTasks = trendData.reduce((sum, d) => sum + d.tasksCompleted, 0);
            const totalViolations = trendData.filter(d => d.hasViolations).length;
            const averageScore = trendData.reduce((sum, d) => sum + d.trendScore, 0) / trendData.length;
            const direction = this.detectTrendDirection(trendData);

            return {
                averageScore: Math.floor(averageScore),
                totalHours: Math.round(totalHours * 10) / 10,
                totalTasks,
                totalViolations,
                direction,
            };
        } catch (error) {
            console.error('Error getting trend stats:', error);
            throw error;
        }
    }
}

export default FocusTrendService;

