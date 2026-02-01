import { query } from '../config/database';
import { format, differenceInHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import config from '../config/index';
import crypto from 'crypto';

export class StreakService {
    /**
     * Increment user's streak if it's a new day
     */
    static async incrementStreak(userId: string): Promise<{ incremented: boolean; newStreak: number }> {
        try {
            const userResult = await query(
                'SELECT last_login, streak_count, highest_streak FROM profiles WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];
            const now = toZonedTime(new Date(), config.timezone);
            const lastLogin = user.last_login ? toZonedTime(new Date(user.last_login), config.timezone) : null;

            // Check if it's a new day
            const isNewDay = !lastLogin || format(now, 'yyyy-MM-dd') !== format(lastLogin, 'yyyy-MM-dd');

            if (!isNewDay) {
                return { incremented: false, newStreak: user.streak_count };
            }

            // Check streak continuity (24h rule)
            const isContinuous = this.checkStreakContinuity(lastLogin, now);

            let newStreak = user.streak_count;

            if (isContinuous || !lastLogin) {
                // Increment streak
                newStreak = user.streak_count + 1;
            } else {
                // Reset streak due to inactivity
                newStreak = 1;

                // Log streak break
                const logId = crypto.randomUUID();
                await query(
                    `INSERT INTO activity_log (id, user_id, event_type, event_data)
           VALUES ($1, $2, $3, $4)`,
                    [logId, userId, 'streak_break_inactivity', JSON.stringify({ previousStreak: user.streak_count })]
                );
            }

            // Update highest streak if needed
            const newHighestStreak = Math.max(newStreak, user.highest_streak);

            // Update profile
            await query(
                `UPDATE profiles 
         SET streak_count = $1, 
             highest_streak = $2, 
             days_active = days_active + 1,
             last_login = $3
         WHERE id = $4`,
                [newStreak, newHighestStreak, now.toISOString(), userId]
            );

            // Log streak increment
            if (isContinuous || !lastLogin) {
                const logId = crypto.randomUUID();
                await query(
                    `INSERT INTO activity_log (id, user_id, event_type, event_data)
           VALUES ($1, $2, $3, $4)`,
                    [logId, userId, 'streak_incremented', JSON.stringify({ newStreak, isNewRecord: newStreak === newHighestStreak })]
                );
            }

            return { incremented: true, newStreak };
        } catch (error) {
            console.error('Error incrementing streak:', error);
            throw error;
        }
    }

    /**
     * Reset user's streak to zero
     */
    static async resetStreak(userId: string, reason: string): Promise<void> {
        try {
            const userResult = await query(
                'SELECT streak_count FROM profiles WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const previousStreak = userResult.rows[0].streak_count;

            await query(
                'UPDATE profiles SET streak_count = 0 WHERE id = $1',
                [userId]
            );

            // Log the streak reset
            const logId = crypto.randomUUID();
            await query(
                `INSERT INTO activity_log (id, user_id, event_type, event_data)
         VALUES ($1, $2, $3, $4)`,
                [logId, userId, 'streak_reset', JSON.stringify({ reason, previousStreak })]
            );
        } catch (error) {
            console.error('Error resetting streak:', error);
            throw error;
        }
    }

    /**
     * Check if streak is continuous (within 24 hours)
     */
    static checkStreakContinuity(lastLogin: Date | null, currentTime: Date): boolean {
        if (!lastLogin) return true;

        const hoursSinceLastLogin = differenceInHours(currentTime, lastLogin);

        // Allow up to 48 hours (gives some grace period)
        return hoursSinceLastLogin <= 48;
    }

    /**
     * Get user's current streak info
     */
    static async getStreakInfo(userId: string): Promise<{
        currentStreak: number;
        highestStreak: number;
        daysActive: number;
    }> {
        try {
            const result = await query(
                'SELECT streak_count, highest_streak, days_active FROM profiles WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];

            return {
                currentStreak: user.streak_count,
                highestStreak: user.highest_streak,
                daysActive: user.days_active,
            };
        } catch (error) {
            console.error('Error getting streak info:', error);
            throw error;
        }
    }
}

export default StreakService;
