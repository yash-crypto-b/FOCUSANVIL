import { query } from '../config/database';
import { CoinTransaction } from '../types/index';
import crypto from 'crypto';

export class CoinService {
    /**
     * Add coins to user balance
     */
    static async addCoins(
        userId: string,
        amount: number,
        type: string,
        description?: string,
        sessionId?: string,
        taskId?: string
    ): Promise<void> {
        try {
            if (amount <= 0) return;

            // Get current balance
            const userResult = await query(
                'SELECT coin_balance FROM profiles WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) throw new Error('User not found');

            const currentBalance = userResult.rows[0].coin_balance;
            const newBalance = currentBalance + amount;

            // Update balance
            await query(
                'UPDATE profiles SET coin_balance = $1 WHERE id = $2',
                [newBalance, userId]
            );

            // Record transaction
            const id = crypto.randomUUID();
            await query(
                `INSERT INTO coin_transactions 
         (id, user_id, amount, transaction_type, balance_after, description, related_session_id, related_task_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [id, userId, amount, type, newBalance, description || null, sessionId || null, taskId || null]
            );
        } catch (error) {
            console.error('Error adding coins:', error);
            throw error;
        }
    }

    /**
     * Deduct coins (penalty)
     */
    static async deductCoins(
        userId: string,
        amount: number,
        type: string,
        description?: string,
        sessionId?: string
    ): Promise<void> {
        try {
            if (amount <= 0) return;

            // Get current balance
            const userResult = await query(
                'SELECT coin_balance FROM profiles WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) throw new Error('User not found');

            const currentBalance = userResult.rows[0].coin_balance;
            const newBalance = Math.max(0, currentBalance - amount); // No negative balance? Or allow debt?
            // Let's allow 0 floor for now.

            // Update balance
            await query(
                'UPDATE profiles SET coin_balance = $1 WHERE id = $2',
                [newBalance, userId]
            );

            // Record transaction
            const id = crypto.randomUUID();
            await query(
                `INSERT INTO coin_transactions 
         (id, user_id, amount, transaction_type, balance_after, description, related_session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [id, userId, -amount, type, newBalance, description || null, sessionId || null]
            );
        } catch (error) {
            console.error('Error deducting coins:', error);
            throw error;
        }
    }

    /**
     * Get transaction history
     */
    static async getTransactionHistory(userId: string, limit: number = 20): Promise<CoinTransaction[]> {
        try {
            const result = await query(
                `SELECT * FROM coin_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
                [userId, limit]
            );

            return result.rows.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                amount: row.amount,
                transactionType: row.transaction_type,
                balanceAfter: row.balance_after,
                description: row.description,
                relatedSessionId: row.related_session_id,
                relatedTaskId: row.related_task_id,
                createdAt: new Date(row.created_at),
            }));
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw error;
        }
    }
}

export default CoinService;
