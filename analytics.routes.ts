import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import FocusTrendService from '../services/FocusTrendService';
import StreakService from '../services/StreakService';
import { query } from '../config/database';
import { format } from 'date-fns';

const router = express.Router();

/**
 * GET /api/v1/analytics/focus-trend
 * Get focus trend graph data
 * Query params: range (7, 14, or 30)
 */
router.get('/focus-trend', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const range = parseInt(req.query.range as string) || 7;

        if (![7, 14, 30].includes(range)) {
            res.status(400).json({ error: 'Range must be 7, 14, or 30' });
            return;
        }

        const trendData = await FocusTrendService.getFocusTrend(req.user!.id, range as 7 | 14 | 30);
        const stats = await FocusTrendService.getTrendStats(req.user!.id, range as 7 | 14 | 30);

        res.json({
            trend: trendData,
            stats,
        });
    } catch (error) {
        console.error('Get focus trend error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/v1/analytics/stats/today
 * Get today's hours worked and tasks completed
 */
router.get('/stats/today', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const today = format(new Date(), 'yyyy-MM-DD');

        // Get today's sessions
        const sessionsResult = await query(
            `SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM deep_work_sessions 
       WHERE user_id = $1 
       AND DATE(started_at) = $2
       AND status IN ('completed', 'active')`,
            [req.user!.id, today]
        );

        const totalMinutes = parseFloat(sessionsResult.rows[0].total_minutes) || 0;
        const hoursWorked = totalMinutes / 60;

        // Get today's completed tasks
        const tasksResult = await query(
            `SELECT COUNT(*) as count
       FROM tasks 
       WHERE user_id = $1 
       AND completed = true
       AND DATE(completed_at) = $2`,
            [req.user!.id, today]
        );

        const tasksCompleted = parseInt(tasksResult.rows[0].count) || 0;

        // Get today's coins earned
        const coinsResult = await query(
            `SELECT COALESCE(SUM(amount), 0) as total
       FROM coin_transactions 
       WHERE user_id = $1 
       AND DATE(created_at) = $2
       AND amount > 0`,
            [req.user!.id, today]
        );

        const coinsEarned = parseInt(coinsResult.rows[0].total) || 0;

        // Get active session
        const activeSessionResult = await query(
            `SELECT * FROM deep_work_sessions 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
            [req.user!.id]
        );

        const activeSession = activeSessionResult.rows.length > 0 ? activeSessionResult.rows[0] : null;

        res.json({
            hoursWorked: Math.round(hoursWorked * 10) / 10,
            tasksCompleted,
            coinsEarned,
            activeSession,
        });
    } catch (error) {
        console.error('Get today stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/v1/analytics/stats/streak
 * Get current and highest streak
 */
router.get('/stats/streak', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const streakInfo = await StreakService.getStreakInfo(req.user!.id);

        res.json(streakInfo);
    } catch (error) {
        console.error('Get streak stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

