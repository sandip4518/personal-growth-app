import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Task {
    id: string;
    title: string;
    completed: boolean;
}

interface Habit {
    id: string;
    title: string;
    streak: number;
    completedDates: string[];
}

interface Transaction {
    id: string;
    amount: number;
    category: string;
    type: "income" | "expense";
    date: string;
}

interface Goal {
    id: string;
    title: string;
    description: string;
    type: "habit" | "task" | "finance" | "custom";
    targetValue: number;
    currentValue: number;
    deadline: string;
    createdAt: string;
    completed: boolean;
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    type: "system" | "achievement" | "finance" | "task" | "goal";
    read: boolean;
}

const GOALS_STORAGE = "GOALS_STORAGE";
const TASK_STORAGE_KEY = "tasks_storage";
const HABITS_STORAGE_KEY = "HABITS_STORAGE";
const FINANCE_STORAGE_KEY = "FINANCE_STORAGE";

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const generateNotifications = async () => {
        try {
            const [storedTasks, storedHabits, storedFinance, storedGoals] = await Promise.all([
                AsyncStorage.getItem(TASK_STORAGE_KEY),
                AsyncStorage.getItem(HABITS_STORAGE_KEY),
                AsyncStorage.getItem(FINANCE_STORAGE_KEY),
                AsyncStorage.getItem(GOALS_STORAGE),
            ]);

            const tasks: Task[] = storedTasks ? JSON.parse(storedTasks) : [];
            const habits: Habit[] = storedHabits ? JSON.parse(storedHabits) : [];
            const transactions: Transaction[] = storedFinance ? JSON.parse(storedFinance) : [];
            const goals: Goal[] = storedGoals ? JSON.parse(storedGoals) : [];

            const newNotifications: NotificationItem[] = [];

            // 1. Task Notifications
            const pendingTasks = tasks.filter(t => !t.completed);
            if (pendingTasks.length > 0) {
                newNotifications.push({
                    id: "tasks-pending",
                    title: "Pending Tasks",
                    message: `You have ${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} left to complete today. Keep going!`,
                    time: "Today",
                    type: "task",
                    read: false,
                });
            } else if (tasks.length > 0) {
                newNotifications.push({
                    id: "tasks-done",
                    title: "All Tasks Completed! 🎉",
                    message: "Awesome work! You've finished all your tasks for today.",
                    time: "Today",
                    type: "achievement",
                    read: true,
                });
            }

            // 2. Habit Notifications
            let bestHabit: Habit | null = null;
            let highestStreak = 0;

            habits.forEach(h => {
                if (h.streak > highestStreak) {
                    highestStreak = h.streak;
                    bestHabit = h;
                }
            });

            if (bestHabit && highestStreak > 1 && (bestHabit as Habit).title) {
                newNotifications.push({
                    id: "habit-streak",
                    title: "Awesome Streak! 🔥",
                    message: `You've been consistent with "${(bestHabit as Habit).title}" for ${highestStreak} days in a row!`,
                    time: "Recent",
                    type: "achievement",
                    read: false, // Make it unread so they feel good
                });
            }

            // 3. Finance Notifications
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const monthExpenses = transactions
                .filter(t => {
                    if (t.type !== 'expense') return false;
                    const tDate = new Date(t.date);
                    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
                })
                .reduce((sum, t) => sum + t.amount, 0);

            if (monthExpenses > 0) {
                newNotifications.push({
                    id: "finance-update",
                    title: "Monthly Budget Update",
                    message: `You've spent ₹${monthExpenses.toLocaleString("en-IN")} so far this month. Keep an eye on your budget!`,
                    time: "Recent",
                    type: "finance",
                    read: true,
                });
            }

            // 4. Goal Notifications
            const activeGoals = goals.filter(g => !g.completed);
            const completedGoals = goals.filter(g => g.completed);

            if (activeGoals.length > 0) {
                newNotifications.push({
                    id: "goals-active",
                    title: "Active Goals",
                    message: `You are currently tracking ${activeGoals.length} long-term goal(s). Remember to log your progress!`,
                    time: "Recent",
                    type: "goal",
                    read: true,
                });
            }

            if (completedGoals.length > 0) {
                // Push the most recently created completed goal as an achievement
                const latestCompleted = completedGoals[0]; // Assuming list is newest to oldest
                newNotifications.push({
                    id: "goals-completed",
                    title: "Goal Reached! 🏆",
                    message: `You successfully completed your goal: "${latestCompleted.title}". Fantastic job!`,
                    time: "Recent",
                    type: "achievement",
                    read: false,
                });
            }

            // 5. Welcome System Notification (always at the bottom/oldest)
            newNotifications.push({
                id: "system-welcome",
                title: "Welcome to Personal Growth!",
                message: "Start building your habits, tracking finances, and managing tasks today to achieve your goals.",
                time: "System",
                type: "system",
                read: true,
            });

            setNotifications(newNotifications);
        } catch (error) {
            console.error("Failed to load notifications data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            generateNotifications();
        }, [])
    );

    const renderItem = ({ item }: { item: NotificationItem }) => {
        let iconName = "notifications-outline";
        let iconColor = "#6C63FF"; // system / default

        if (item.type === "achievement") {
            iconName = "trophy-outline";
            iconColor = "#FF8C00";
        } else if (item.type === "finance") {
            iconName = "wallet-outline";
            iconColor = "#2ECC71";
        } else if (item.type === "task") {
            iconName = "checkbox-outline";
            iconColor = "#E91E63";
        } else if (item.type === "goal") {
            iconName = "flag-outline";
            iconColor = "#6C63FF";
        }

        return (
            <View style={[styles.notificationCard, !item.read && styles.unreadCard]}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: `${iconColor}15` }, // 15% opacity
                    ]}
                >
                    <Ionicons name={iconName as any} size={24} color={iconColor} />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            {isLoading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color="#6C63FF" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>Nothing to see here</Text>
                            <Text style={styles.emptyText}>
                                You don't have any notifications right now.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F7FB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1A1A1A",
    },
    loadingState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    notificationCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: "flex-start",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: "transparent",
    },
    unreadCard: {
        backgroundColor: "#F9F8FF",
        borderColor: "#E8E6FF",
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
        marginBottom: 8,
    },
    time: {
        fontSize: 12,
        color: "#A0A0A0",
        fontWeight: "500",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#6C63FF",
        marginLeft: 8,
        marginTop: 6,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#888",
        textAlign: "center",
        paddingHorizontal: 40,
    },
});
