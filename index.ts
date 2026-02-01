export interface User {
    id: string;
    email: string;
    username: string;
    journeyStartDate: Date;
    lastLogin: Date | null;
    streakCount: number;
    highestStreak: number;
    daysActive: number;
    coinBalance: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeepWorkSession {
    id: string;
    userId: string;
    startedAt: Date;
    endedAt: Date | null;
    durationMinutes: number | null;
    status: 'active' | 'completed' | 'aborted';
    coinsEarned: number;
    coinsDeducted: number;
    notes: string | null;
    abortCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface HeatmapEntry {
    id: string;
    userId: string;
    date: string;
    productivityScore: number;
    hoursWorked: number;
    tasksCompleted: number;
    violations: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Task {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    completed: boolean;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface MentorMessage {
    id: string;
    userId: string;
    messageType: 'daily' | 'abort' | 'streak_break' | 'milestone';
    messageText: string;
    streakCount: number | null;
    coinsAffected: number | null;
    read: boolean;
    readAt: Date | null;
    createdAt: Date;
}

export interface CoinTransaction {
    id: string;
    userId: string;
    amount: number;
    transactionType: 'session_reward' | 'abort_penalty' | 'task_reward';
    relatedSessionId: string | null;
    relatedTaskId: string | null;
    balanceAfter: number;
    description: string | null;
    createdAt: Date;
}

export interface ActivityLogEntry {
    id: string;
    userId: string;
    eventType: string;
    eventData: any;
    createdAt: Date;
}

export interface FocusTrendData {
    date: string;
    hoursWorked: number;
    tasksCompleted: number;
    trendScore: number;
    hasViolations: boolean;
}

export interface TodayStats {
    hoursWorked: number;
    tasksCompleted: number;
    coinsEarned: number;
    activeSession: DeepWorkSession | null;
}

