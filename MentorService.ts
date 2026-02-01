import { query } from '../config/database';
import { MentorMessage } from '../types/index';
import crypto from 'crypto';

export class MentorService {
    private static ruthlessQuotes = [
        "Are you rushing or are you dragging? START WORKING.",
        "There are no two words in the English language more harmful than 'good job'.",
        "I don't care about your dreams. I care about your output. SHOW ME.",
        "You think you're special? You're not. Prove me wrong.",
        "Is that a tear? Wipe it. Get back to work.",
        "You want to be great? Then stop acting like a mediocrity.",
        "If you sabotage my band (your life), I will gut you like a pig.",
        "Not my tempo. FASTER.",
        "You're here to do a job. Do it or get out.",
        "Sleep is for those who are broke. Are you broke? Then wake up."
    ];

    private static praiseQuotes = [
        "Not quite my tempo... but acceptable.",
        "You didn't trip. Good.",
        "Adequate. Do it again.",
        "Finally. A glimmer of competence.",
        "You managed to not embarrass yourself today."
    ];

    /**
     * Generate daily mentor message (Ruthless Persona)
     */
    static async generateDailyMessage(userId: string, streakCount: number): Promise<string> {
        try {
            // JK Simmons Persona Logic
            let message = "";

            if (streakCount === 0) {
                message = "Day Zero. You are nothing. You have earned nothing. Start climbing or rot at the bottom.";
            } else if (streakCount < 3) {
                message = `Day ${streakCount}. Cute. My grandmother has a better streak. Don't get comfortable.`;
            } else if (streakCount < 10) {
                message = `Day ${streakCount}. You think this is impressive? It's the bare minimum. Keep going.`;
            } else {
                message = `Day ${streakCount}. You're finally finding the tempo. Don't you dare drag now.`;
            }

            // Save message
            const id = crypto.randomUUID();
            await query(
                `INSERT INTO mentor_messages 
         (id, user_id, message_type, message_text, streak_count, read)
         VALUES ($1, $2, $3, $4, $5, 0)`,
                [id, userId, 'daily', message, streakCount]
            );

            return message;
        } catch (error) {
            console.error('Error generating daily message:', error);
            return "Get to work.";
        }
    }

    /**
     * Generate message based on To-Do List status
     */
    static async generateTaskMessage(userId: string, pendingTasks: number, completedTasks: number): Promise<string> {
        if (pendingTasks > 0 && completedTasks === 0) {
            return "Your list is full and your output is zero. You are wasting my time. START.";
        } else if (pendingTasks > 5) {
            return "You're drowning in tasks. Swim or sink. I don't care which.";
        } else if (pendingTasks === 0 && completedTasks > 0) {
            const quote = this.praiseQuotes[Math.floor(Math.random() * this.praiseQuotes.length)];
            return quote;
        } else {
            const quote = this.ruthlessQuotes[Math.floor(Math.random() * this.ruthlessQuotes.length)];
            return quote;
        }
    }

    /**
     * Generate abort message (tough love)
     */
    static async generateAbortMessage(userId: string, coinsLost: number): Promise<string> {
        try {
            const message = `You quit? PATHETIC. You just burned ${coinsLost} coins. Get out of my sight.`;

            const id = crypto.randomUUID();
            await query(
                `INSERT INTO mentor_messages 
         (id, user_id, message_type, message_text, coins_affected, read)
         VALUES ($1, $2, $3, $4, $5, 0)`,
                [id, userId, 'abort', message, coinsLost]
            );

            return message;
        } catch (error) {
            console.error('Error generating abort message:', error);
            return "Failure.";
        }
    }

    /**
     * Generate streak break message
     */
    static async generateStreakBreakMessage(userId: string, oldStreak: number): Promise<string> {
        try {
            const message = `You broke a ${oldStreak} day streak. You are unreliable. Start from zero and think about your failure.`;

            const id = crypto.randomUUID();
            await query(
                `INSERT INTO mentor_messages 
         (id, user_id, message_type, message_text, streak_count, read)
         VALUES ($1, $2, $3, $4, $5, 0)`,
                [id, userId, 'streak_break', message, oldStreak]
            );

            return message;
        } catch (error) {
            console.error('Error generating streak break message:', error);
            return "Streak broken.";
        }
    }

    /**
     * Get today's message if exists
     */
    static async getTodayMessage(userId: string): Promise<MentorMessage | null> {
        try {
            const result = await query(
                `SELECT * FROM mentor_messages 
         WHERE user_id = $1 AND message_type = 'daily' 
         AND date(created_at) = date('now')
         LIMIT 1`,
                [userId]
            );

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('Error getting today message:', error);
            return null;
        }
    }

    /**
     * Get unread messages
     */
    static async getUnreadMessages(userId: string): Promise<MentorMessage[]> {
        try {
            const result = await query(
                `SELECT * FROM mentor_messages 
         WHERE user_id = $1 AND read = 0
         ORDER BY created_at DESC`,
                [userId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting unread messages:', error);
            return [];
        }
    }

    /**
     * Mark message as read
     */
    static async markAsRead(messageId: string, userId: string): Promise<void> {
        try {
            await query(
                'UPDATE mentor_messages SET read = 1 WHERE id = $1 AND user_id = $2',
                [messageId, userId]
            );
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    /**
     * Get message history
     */
    static async getMessageHistory(userId: string, limit: number = 30): Promise<MentorMessage[]> {
        try {
            const result = await query(
                `SELECT * FROM mentor_messages 
         WHERE user_id = $1 
         ORDER BY created_at DESC LIMIT $2`,
                [userId, limit]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting message history:', error);
            return [];
        }
    }

}

export default MentorService;
