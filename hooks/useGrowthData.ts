import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Goal, GrowthDNA, Habit, JournalEntry, Quest, STORAGE_KEYS, Task, Transaction, UserRewardData } from "../constants/types";

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
    activeQuest: (Quest & { isFinished: boolean; isClaimed: boolean }) | null;
    userTitle: string;
    weeklyTasksDone: number;
    weeklyHabitsDone: number;
    weeklySavings: number;
    weeklyExpenses: number;
    weeklyProductivityScore: number;
    growthDNA: GrowthDNA;
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
        quests: Quest[];
        rewardData: UserRewardData;
    }>({
        tasks: [],
        habits: [],
        transactions: [],
        goals: [],
        journalEntries: [],
        userName: "Sandy",
        quests: [],
        rewardData: { currentTitle: "Growth Seeker", unlockedTitles: ["Growth Seeker"], completedQuestIds: [] },
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
                AsyncStorage.getItem(STORAGE_KEYS.QUESTS),
                AsyncStorage.getItem(STORAGE_KEYS.REWARDS),
                AsyncStorage.getItem("LIFE_BALANCE_STORAGE"),
            ]);

            const [sTasks, sHabits, sFinance, sUser, sGoals, sJournal, sQuests, sRewards, sLifeBalance] = results;

            const tasks: Task[] = sTasks ? JSON.parse(sTasks) : [];
            const habits: Habit[] = sHabits ? JSON.parse(sHabits) : [];
            const transactions: Transaction[] = sFinance ? JSON.parse(sFinance) : [];
            const goals: Goal[] = sGoals ? JSON.parse(sGoals) : [];
            const journalEntries: JournalEntry[] = sJournal ? JSON.parse(sJournal) : [];
            let quests: Quest[] = sQuests ? JSON.parse(sQuests) : [];
            let rewardData: UserRewardData = sRewards ? JSON.parse(sRewards) : {
                currentTitle: "Growth Seeker",
                unlockedTitles: ["Growth Seeker"],
                completedQuestIds: []
            };
            const lifeBalance: Record<string, number> = sLifeBalance ? JSON.parse(sLifeBalance) : {};

            const todayStr = new Date().toISOString().split("T")[0];
            let activeQuest = quests.find(q => q.date === todayStr);

            if (!activeQuest) {
                activeQuest = generateDailyQuest(todayStr);
                quests = [activeQuest, ...quests.slice(0, 9)]; // Keep last 10
                await AsyncStorage.setItem(STORAGE_KEYS.QUESTS, JSON.stringify(quests));
            }

            let userName = "Sandy";
            if (sUser) {
                const user = JSON.parse(sUser);
                if (user.name) userName = user.name;
            }

            calculateMetrics(tasks, habits, goals, transactions, journalEntries, activeQuest, rewardData, lifeBalance);
            setData({ tasks, habits, transactions, goals, journalEntries, userName, quests, rewardData });
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
        journalEntries: JournalEntry[],
        activeQuest: Quest | null,
        rewardData: UserRewardData,
        lifeBalance: Record<string, number>
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
        const lifetimeTasks = tasks.filter(t => t.completed).length * 10;
        const lifetimeHabitCompletions = habits.reduce((sum, h) => sum + (h.completedDates?.length || 0), 0) * 5;
        const lifetimeGoals = goals.filter(g => g.completed).length * 50;
        const lifetimeJournal = journalEntries.length * 15;
        const questXP = rewardData.completedQuestIds.length * 100;

        const totalXP = lifetimeTasks + lifetimeHabitCompletions + lifetimeGoals + lifetimeJournal + questXP;
        const levelInfo = getLevelInfo(totalXP);

        // 4. Growth DNA
        const growthDNA = calculateGrowthDNA(tasks, habits, goals, transactions, journalEntries, lifeBalance, todayStr);

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
            activeQuest: activeQuest ? {
                ...activeQuest,
                isFinished: checkQuestStatus(activeQuest, tasks, habits, transactions, journalEntries, rewardData),
                isClaimed: rewardData.completedQuestIds.includes(activeQuest.id)
            } : null,
            userTitle: rewardData.currentTitle,
            growthDNA,
            ...calculateWeeklyMetrics(tasks, habits, transactions)
        });
    };

    const calculateWeeklyMetrics = (tasks: Task[], habits: Habit[], transactions: Transaction[]) => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyTasksDone = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= startOfWeek).length;

        const weeklyHabitsDone = habits.reduce((sum, h) => {
            const inWeek = h.completedDates?.filter(d => new Date(d) >= startOfWeek).length || 0;
            return sum + inWeek;
        }, 0);

        const weeklyIncome = transactions
            .filter(t => t.type === 'income' && new Date(t.date) >= startOfWeek)
            .reduce((sum, t) => sum + t.amount, 0);

        const weeklyExpenses = transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= startOfWeek)
            .reduce((sum, t) => sum + t.amount, 0);

        const weeklySavings = weeklyIncome - weeklyExpenses;

        // Weekly Productivity: (weeklyTasks completion * 0.6) + (weeklyHabits completion * 0.4)
        // For simplicity, we compare to a target (e.g., 10 tasks/week, 20 habits/week)
        const taskTarget = 10;
        const habitTarget = 20;
        const weeklyProductivityScore = Math.min(100, Math.round(
            (Math.min(1, weeklyTasksDone / taskTarget) * 0.6 +
                Math.min(1, weeklyHabitsDone / habitTarget) * 0.4) * 100
        ));

        return {
            weeklyTasksDone,
            weeklyHabitsDone,
            weeklySavings,
            weeklyExpenses,
            weeklyProductivityScore
        };
    };

    const checkQuestStatus = (
        quest: Quest,
        tasks: Task[],
        habits: Habit[],
        transactions: Transaction[],
        journalEntries: JournalEntry[],
        rewardData: UserRewardData
    ) => {
        if (quest.completed) return true;

        const todayStr = new Date().toISOString().split("T")[0];

        switch (quest.type) {
            case "tasks":
                return tasks.filter(t => t.completed && t.completedAt?.startsWith(todayStr)).length >= quest.targetCount;
            case "habits":
                return habits.filter(h => h.completedDates?.includes(todayStr)).length >= quest.targetCount;
            case "journal":
                const journalToday = journalEntries.some(e => e.date === new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }));
                return journalToday;
            case "finance":
                return transactions.filter(t => t.date?.startsWith(todayStr)).length >= quest.targetCount;
            default:
                return false;
        }
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

    // ─── Growth DNA Engine ────────────────────────────────────────────
    const calculateGrowthDNA = (
        tasks: Task[],
        habits: Habit[],
        goals: Goal[],
        transactions: Transaction[],
        journalEntries: JournalEntry[],
        lifeBalance: Record<string, number>,
        todayStr: string
    ): GrowthDNA => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // ── Discipline (task completion rate + daily focus) ──
        const completedTasks = tasks.filter(t => t.completed).length;
        const taskRate = tasks.length > 0 ? completedTasks / tasks.length : 0;
        const todayTasks = tasks.filter(t => t.completed && t.completedAt?.startsWith(todayStr)).length;
        const dailyBonus = Math.min(1, todayTasks / 3); // up to 3 tasks today = bonus
        const discipline = Math.round(Math.min(100, (taskRate * 70 + dailyBonus * 30)));

        // ── Mindfulness (journal activity + mood variety) ──
        const weekJournals = journalEntries.filter(e => {
            try { return new Date(e.date) >= startOfWeek; } catch { return false; }
        }).length;
        const uniqueMoods = new Set(journalEntries.map(e => e.mood)).size;
        const journalScore = Math.min(1, weekJournals / 5); // 5 entries/week = max
        const moodScore = Math.min(1, uniqueMoods / 4); // 4 different moods = max awareness
        const mindfulness = Math.round(Math.min(100, (journalScore * 60 + moodScore * 40)));

        // ── Financial Health (savings ratio + income vs expense trend) ──
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savingsRatio = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / totalIncome) : 0;
        const hasTransactions = transactions.length > 0;
        const financialHealth = Math.round(Math.min(100, hasTransactions ? savingsRatio * 100 : 0));

        // ── Consistency (habit streaks + completion spread) ──
        const avgStreak = habits.length > 0 ? habits.reduce((s, h) => s + h.streak, 0) / habits.length : 0;
        const totalCompletions = habits.reduce((s, h) => s + (h.completedDates?.length || 0), 0);
        const completionDensity = habits.length > 0 ? Math.min(1, totalCompletions / (habits.length * 7)) : 0;
        const consistency = Math.round(Math.min(100, (Math.min(1, avgStreak / 7) * 50 + completionDensity * 50)));

        // ── Ambition (goals created + progress + high priority tasks) ──
        const goalsCreated = Math.min(1, goals.length / 5);
        const avgGoalProgress = goals.length > 0
            ? goals.reduce((s, g) => s + Math.min(1, g.currentValue / Math.max(g.targetValue, 1)), 0) / goals.length
            : 0;
        const highPriorityRate = tasks.length > 0
            ? tasks.filter(t => t.priority === 'high' && t.completed).length / Math.max(1, tasks.filter(t => t.priority === 'high').length)
            : 0;
        const ambition = Math.round(Math.min(100, (goalsCreated * 30 + avgGoalProgress * 40 + highPriorityRate * 30)));

        // ── Self-Awareness (life balance engagement + reflections) ──
        const balanceValues = Object.values(lifeBalance);
        const balanceEngagement = balanceValues.length > 0 ? 1 : 0; // Have they used the feature?
        const balanceVariety = balanceValues.length > 0
            ? 1 - (Math.max(...balanceValues) - Math.min(...balanceValues)) / 10 // closer values = more balanced
            : 0;
        const reflectionDepth = Math.min(1, journalEntries.length / 10);
        const selfAwareness = Math.round(Math.min(100, (balanceEngagement * 20 + balanceVariety * 30 + reflectionDepth * 50)));

        const dims = { discipline, mindfulness, financialHealth, consistency, ambition, selfAwareness };

        // ── Archetype (top 2 dimensions determine type) ──
        const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
        const top2 = new Set([sorted[0][0], sorted[1][0]]);
        const archetype = getArchetype(top2);

        // ── Cross-module insights ──
        const insights = generateInsights(tasks, habits, journalEntries, transactions, todayStr, dims);

        return { dimensions: dims, archetype, insights };
    };

    const getArchetype = (top2: Set<string>): { name: string; emoji: string; description: string } => {
        if (top2.has('discipline') && top2.has('ambition'))
            return { name: 'The Strategist', emoji: '🧠', description: 'You combine fierce discipline with bold ambitions. You plan, execute, and conquer.' };
        if (top2.has('mindfulness') && top2.has('consistency'))
            return { name: 'The Monk', emoji: '🧘', description: 'Steady and self-aware, you build lasting habits through reflection and patience.' };
        if (top2.has('consistency') && top2.has('discipline'))
            return { name: 'The Machine', emoji: '⚙️', description: 'Relentless and reliable. Your consistency and discipline make you unstoppable.' };
        if (top2.has('financialHealth') && top2.has('ambition'))
            return { name: 'The Mogul', emoji: '💎', description: 'You chase big goals while keeping finances sharp. A natural empire-builder.' };
        if (top2.has('mindfulness') && top2.has('selfAwareness'))
            return { name: 'The Sage', emoji: '🔮', description: 'Deep self-knowledge and reflection guide your growth journey.' };
        if (top2.has('ambition') && top2.has('consistency'))
            return { name: 'The Climber', emoji: '🏔️', description: 'You set ambitious goals and chip away at them day after day. Unstoppable momentum.' };
        if (top2.has('discipline') && top2.has('financialHealth'))
            return { name: 'The Architect', emoji: '🏗️', description: 'You build solid foundations — structured habits, sound finances, and clear plans.' };
        if (top2.has('selfAwareness') && top2.has('consistency'))
            return { name: 'The Philosopher', emoji: '📖', description: 'You reflect deeply and move steadily. Your growth is intentional and measured.' };
        // Default / all-rounder
        return { name: 'The Explorer', emoji: '🌱', description: 'You\'re growing across all dimensions. Keep exploring and your unique path will reveal itself.' };
    };

    const generateInsights = (
        tasks: Task[],
        habits: Habit[],
        journalEntries: JournalEntry[],
        transactions: Transaction[],
        todayStr: string,
        dims: Record<string, number>
    ): string[] => {
        const insights: string[] = [];

        // Insight: Journal & task correlation
        const journalDates = new Set(journalEntries.map(e => e.date));
        const taskDatesCompleted = tasks.filter(t => t.completed && t.completedAt).map(t => t.completedAt!.split('T')[0]);
        const tasksOnJournalDays = taskDatesCompleted.filter(d => journalDates.has(d)).length;
        const tasksOnOtherDays = taskDatesCompleted.length - tasksOnJournalDays;
        if (journalDates.size > 0 && tasksOnJournalDays > tasksOnOtherDays) {
            insights.push('You complete more tasks on days you write a journal entry. Reflection fuels productivity!');
        }

        // Insight: Spending vs habits
        if (dims.consistency > 60 && dims.financialHealth > 50) {
            insights.push('Strong habits correlate with better finances for you. Discipline in one area spills over!');
        } else if (dims.consistency < 30 && dims.financialHealth < 40) {
            insights.push('Building consistent habits could help improve your financial health too. Start small!');
        }

        // Insight: Strongest dimension
        const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
        const dimLabels: Record<string, string> = {
            discipline: 'Discipline', mindfulness: 'Mindfulness', financialHealth: 'Financial Health',
            consistency: 'Consistency', ambition: 'Ambition', selfAwareness: 'Self-Awareness'
        };
        if (sorted[0][1] > 0) {
            insights.push(`Your superpower is ${dimLabels[sorted[0][0]]} — it's your highest Growth DNA dimension.`);
        }

        // Insight: Weakest dimension
        if (sorted[sorted.length - 1][1] < sorted[0][1] && sorted[0][1] > 0) {
            insights.push(`${dimLabels[sorted[sorted.length - 1][0]]} has the most room to grow. Small steps there can boost your overall DNA.`);
        }

        // Insight: Habit streaks
        const maxStreak = Math.max(...habits.map(h => h.streak), 0);
        if (maxStreak >= 7) {
            insights.push(`Amazing! You have a ${maxStreak}-day habit streak going. This consistency is rare.`);
        }

        // Fallback
        if (insights.length === 0) {
            insights.push('Start completing tasks, building habits, and journaling to unlock personalized insights!');
        }

        return insights.slice(0, 4); // Max 4 insights
    };

    const generateDailyQuest = (date: string): Quest => {
        const questPool: Omit<Quest, 'id' | 'completed' | 'date'>[] = [
            { title: "Complete 3 Tasks", rewardXP: 100, type: "tasks", targetCount: 3 },
            { title: "Register 2 Habits", rewardXP: 100, type: "habits", targetCount: 2 },
            { title: "Journal Reflection", rewardXP: 50, type: "journal", targetCount: 1 },
            { title: "Review Finances", rewardXP: 50, type: "finance", targetCount: 1 },
        ];
        const random = questPool[Math.floor(Math.random() * questPool.length)];
        return {
            ...random,
            id: `q-${date}`,
            completed: false,
            date
        };
    };

    const [isClaiming, setIsClaiming] = useState(false);

    const completeQuest = async (questId: string) => {
        if (isClaiming) return;
        setIsClaiming(true);
        try {
            // Prevent multiple claims or claiming unfinished quests
            const quest = data.quests.find(q => q.id === questId);
            if (!quest || data.rewardData.completedQuestIds.includes(questId)) return;

            // Final strict check
            const isActuallyFinished = checkQuestStatus(quest, data.tasks, data.habits, data.transactions, data.journalEntries, data.rewardData);
            if (!isActuallyFinished) {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Quest Not Complete ❌",
                        body: "Complete the quest requirements before claiming your reward!",
                    },
                    trigger: null,
                });
                setIsClaiming(false);
                return;
            }

            const updatedRewardData = {
                ...data.rewardData,
                completedQuestIds: [...data.rewardData.completedQuestIds, questId]
            };

            await AsyncStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(updatedRewardData));
            await loadData();
        } finally {
            setIsClaiming(false);
        }
    };

    const updateTitle = async (newTitle: string) => {
        const updatedRewardData = { ...data.rewardData, currentTitle: newTitle };
        await AsyncStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(updatedRewardData));
        loadData();
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    return { loading, data, metrics, refresh: loadData, completeQuest, updateTitle };
}
