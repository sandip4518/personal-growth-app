import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Goal, Habit, JournalEntry, STORAGE_KEYS, Task, Transaction } from "../constants/types";

export interface GrowthMetrics {
    personalGrowthScore: number;
    productivityScore: number;
    xp: number;
    level: number;
    levelTitle: string;
    nextLevelXP: number;
    tasksProgress: number;
    habitsProgress: number;
    goalsProgress: number;
    financeProgress: number;
    journalProgress: number;
    taskContribution: number;
    habitContribution: number;
    goalContribution: number;
    financeContribution: number;
    journalContribution: number;
}

const getLevelInfo = (xp: number) => {
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const levelTitles = [
        "Growth Seeker",
        "Consistency Voyager",
        "Habit Architect",
        "Focus Master",
        "Life Designer",
        "Titan of Discipline",
        "Zen Optimizer",
        "Growth Legend",
    ];
    const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)];
    const currentLevelXP = Math.pow(level - 1, 2) * 100;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const progressToNextLevel = (xp - currentLevelXP) / (nextLevelXP - currentLevelXP);

    return { level, levelTitle, nextLevelXP, progressToNextLevel };
};

export function useGrowthData() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        tasks: Task[];
        habits: Habit[];
        transactions: Transaction[];
        goals: Goal[];
        journalEntries: JournalEntry[];
        userName: string;
    }>({
        tasks: [],
        habits: [],
        transactions: [],
        goals: [],
        journalEntries: [],
        userName: "Sandy",
    });

    const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);

    const loadData = useCallback(async () => {
        try {
            const results = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.TASKS),
                AsyncStorage.getItem(STORAGE_KEYS.HABITS),
                AsyncStorage.getItem(STORAGE_KEYS.FINANCE),
                AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
                AsyncStorage.getItem(STORAGE_KEYS.GOALS),
                AsyncStorage.getItem(STORAGE_KEYS.JOURNAL),
            ]);

            const [sTasks, sHabits, sFinance, sUser, sGoals, sJournal] = results;

            const tasks: Task[] = sTasks ? JSON.parse(sTasks) : [];
            const habits: Habit[] = sHabits ? JSON.parse(sHabits) : [];
            const transactions: Transaction[] = sFinance ? JSON.parse(sFinance) : [];
            const goals: Goal[] = sGoals ? JSON.parse(sGoals) : [];
            const journalEntries: JournalEntry[] = sJournal ? JSON.parse(sJournal) : [];

            let userName = "Sandy";
            if (sUser) {
                const user = JSON.parse(sUser);
                if (user.name) userName = user.name;
            }

            calculateMetrics(tasks, habits, goals, transactions, journalEntries);
            setData({ tasks, habits, transactions, goals, journalEntries, userName });
        } catch (e) {
            console.error("Failed to load growth data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const calculateMetrics = (
        tasks: Task[],
        habits: Habit[],
        goals: Goal[],
        transactions: Transaction[],
        journalEntries: JournalEntry[]
    ) => {
        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Productivity Score (Daily Focus)
        const totalTasks = tasks.length;
        const completedTasksTop = tasks.filter(t => t.completed).length;
        const tasksProgress = totalTasks === 0 ? 0 : completedTasksTop / totalTasks;

        const totalHabits = habits.length;
        const completedHabitsToday = habits.filter(h => h.completedDates?.includes(todayStr)).length;
        const habitsProgress = totalHabits === 0 ? 0 : completedHabitsToday / totalHabits;

        const productivityScore = Math.round(
            (tasksProgress * 0.6 + habitsProgress * 0.4) * 100
        );

        // 2. Personal Growth Score (Overall Weights)
        const taskContrib = tasksProgress * 25;
        const habitContrib = habitRate(habits, todayStr) * 25;
        const goalsProgress = goals.length === 0 ? 0 : goals.reduce((sum, g) => sum + Math.min(1, g.currentValue / Math.max(g.targetValue, 1)), 0) / goals.length;
        const goalContrib = goalsProgress * 25;

        const financeProgress = calculateFinanceProgress(transactions, goals);
        const financeContrib = financeProgress * 15;

        const journalToday = journalEntries.some(e => e.date === new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
        const journalContrib = journalToday ? 10 : 0;

        const personalGrowthScore = Math.round(taskContrib + habitContrib + goalContrib + financeContrib + journalContrib);

        // 3. XP & Leveling
        // XP Calculation: Total Lifetime Completion
        const lifetimeTasks = tasks.filter(t => t.completed).length * 10;
        const lifetimeHabitCompletions = habits.reduce((sum, h) => sum + (h.completedDates?.length || 0), 0) * 5;
        const lifetimeGoals = goals.filter(g => g.completed).length * 50;
        const lifetimeJournal = journalEntries.length * 15;

        const totalXP = lifetimeTasks + lifetimeHabitCompletions + lifetimeGoals + lifetimeJournal;
        const levelInfo = getLevelInfo(totalXP);

        setMetrics({
            personalGrowthScore,
            productivityScore,
            xp: totalXP,
            level: levelInfo.level,
            levelTitle: levelInfo.levelTitle,
            nextLevelXP: levelInfo.nextLevelXP,
            tasksProgress,
            habitsProgress,
            goalsProgress,
            financeProgress,
            journalProgress: journalToday ? 1 : 0,
            taskContribution: taskContrib,
            habitContribution: habitContrib,
            goalContribution: goalContrib,
            financeContribution: financeContrib,
            journalContribution: journalContrib,
        });
    };

    const habitRate = (habits: Habit[], todayStr: string) => {
        if (habits.length === 0) return 0;
        const completed = habits.filter(h => h.completedDates?.includes(todayStr)).length;
        return completed / habits.length;
    };

    const calculateFinanceProgress = (transactions: Transaction[], goals: Goal[]) => {
        const financeGoals = goals.filter(g => g.type === 'finance');
        if (financeGoals.length > 0) {
            return financeGoals.reduce((sum, g) => sum + Math.min(1, g.currentValue / Math.max(g.targetValue, 1)), 0) / financeGoals.length;
        }
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const savings = income - expenses;
        return income > 0 ? Math.min(1, savings / income) : 0;
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    return { loading, data, metrics, refresh: loadData };
}
