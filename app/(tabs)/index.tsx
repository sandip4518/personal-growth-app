import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  type: "habit" | "task" | "finance" | "custom";
  targetValue: number;
  currentValue: number;
  deadline: string;
  completed: boolean;
  subgoals?: any[];
}

const GOALS_STORAGE = "GOALS_STORAGE";
const TASK_STORAGE_KEY = "tasks_storage";
const HABITS_STORAGE_KEY = "HABITS_STORAGE";
const FINANCE_STORAGE_KEY = "FINANCE_STORAGE";

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeekDays = () => {
  const currentDate = new Date();
  const currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = currentDay === 0 ? -6 : 1 - currentDay; // Distance to Monday

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + diff + i);
    weekDays.push(d);
  }
  return weekDays;
};

const QUOTES = [
  { text: "Small daily improvements lead to big success.", author: "Robin Sharma" },
  { text: "Consistency is what transforms average into excellence.", author: "Tony Robbins" },
  { text: "Your future is created by what you do today.", author: "Robert Kiyosaki" },
  { text: "The secret to getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The best way to predict your future is to create it.", author: "Abraham Lincoln" },
  { text: "Focus on the step in front of you, not the whole staircase.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userName, setUserName] = useState("Sandy");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [quote, setQuote] = useState(QUOTES[0]);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  const loadData = async () => {
    try {
      const [storedTasks, storedHabits, storedFinance, storedUser, storedGoals] =
        await Promise.all([
          AsyncStorage.getItem(TASK_STORAGE_KEY),
          AsyncStorage.getItem(HABITS_STORAGE_KEY),
          AsyncStorage.getItem(FINANCE_STORAGE_KEY),
          AsyncStorage.getItem("USER_DATA"),
          AsyncStorage.getItem(GOALS_STORAGE),
        ]);

      if (storedTasks) setTasks(JSON.parse(storedTasks));
      if (storedHabits) setHabits(JSON.parse(storedHabits));
      if (storedFinance) setTransactions(JSON.parse(storedFinance));
      if (storedGoals) setGoals(JSON.parse(storedGoals));
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.name) setUserName(user.name);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const fetchQuote = async () => {
    setIsQuoteLoading(true);
    // Simulate a small loading delay for UI feedback
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * QUOTES.length);
      setQuote(QUOTES[randomIndex]);
      setIsQuoteLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    fetchQuote();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // 1. SMART GREETING
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const todayDateStr = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // 2. DAILY PROGRESS & SCORE
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const tasksProgress = totalTasks === 0 ? 0 : completedTasks / totalTasks;

  const todayStr = formatDate(new Date());
  const totalHabits = habits.length;
  const completedHabits = habits.filter((h) =>
    h.completedDates?.includes(todayStr)
  ).length;
  const habitsProgress = totalHabits === 0 ? 0 : completedHabits / totalHabits;

  let score = 0;
  if (totalTasks === 0 && totalHabits === 0) {
    score = 0;
  } else if (totalTasks === 0) {
    score = habitsProgress * 100;
  } else if (totalHabits === 0) {
    score = tasksProgress * 100;
  } else {
    score = tasksProgress * 60 + habitsProgress * 40;
  }
  const scoreInt = Math.round(score);

  let scoreMessage = "Let's get started today!";
  if (scoreInt >= 40 && scoreInt <= 70)
    scoreMessage = "Good progress, keep going!";
  if (scoreInt > 70) scoreMessage = "Amazing productivity today!";

  // 3. FINANCE SNAPSHOT
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const savings = income - expenses;

  // 4. WEEKLY CHART (Mon-Sun)
  const weekDays = getWeekDays();
  const weekData = weekDays.map((date) => {
    const dStr = formatDate(date);
    const dayLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
    }).format(date);

    const habitsDone = habits.filter((h) =>
      h.completedDates?.includes(dStr)
    ).length;
    // We only accurately know today's completed tasks
    const isToday = dStr === todayStr;
    const tasksDone = isToday ? completedTasks : 0;

    const totalDone = habitsDone + tasksDone;

    return { label: dayLabel, count: totalDone };
  });

  const maxActivity = Math.max(...weekData.map((d) => d.count), 1);

  // 5. STREAK
  const maxStreak =
    habits.length > 0 ? Math.max(...habits.map((h) => h.streak)) : 0;

  // 6. ACTIVE GOALS (needed for reminders & active sections)
  // Ensure we fix corrupted state where completed=true but currentValue < targetValue
  const activeGoals = goals.filter((g) => {
    if (g.type === "custom" && g.subgoals && g.subgoals.length > 0) {
      return g.currentValue < g.targetValue;
    }
    return !g.completed && g.currentValue < g.targetValue;
  }).slice(0, 2);

  // 7. REMINDERS
  const uncompletedTasks = tasks.filter((t) => !t.completed);
  const uncompletedHabits = habits.filter(
    (h) => !h.completedDates?.includes(todayStr)
  );

  const reminders = [
    ...uncompletedHabits.map((h) => ({
      id: `h-${h.id}`,
      icon: "repeat-outline",
      text: h.title,
      type: "Habit",
    })),
    ...uncompletedTasks.map((t) => ({
      id: `t-${t.id}`,
      icon: "checkbox-outline",
      text: t.title,
      type: "Task",
    })),
    ...activeGoals.map((g) => ({
      id: `g-${g.id}`,
      icon: "flag-outline",
      text: `Goal Deadline: ${g.deadline}`,
      type: "Goal",
    })),
  ].slice(0, 4); // Only show top 4 reminders

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {greeting} {userName} 👋
            </Text>
            <Text style={styles.date}>{todayDateStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Quote Card */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteDecor1} />
          <View style={styles.quoteDecor2} />
          <View style={styles.quoteCardBg}>
            <TouchableOpacity
              style={styles.refreshQuoteBtn}
              onPress={fetchQuote}
              disabled={isQuoteLoading}
            >
              <Ionicons
                name={isQuoteLoading ? "hourglass-outline" : "refresh"}
                size={20}
                color="#FFF"
              />
            </TouchableOpacity>
            <Ionicons
              name="chatbubbles-outline"
              size={24}
              color="#FFF"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.quoteText}>"{quote.text}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          </View>
        </View>

        {/* Productivity Score */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Productivity Score</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{scoreInt}</Text>
              <Text style={styles.scoreTotal}>/ 100</Text>
            </View>
            <View style={styles.scoreMsgContainer}>
              <Text style={styles.scoreMsgText}>{scoreMessage}</Text>
            </View>
          </View>
          <View style={styles.scoreBarBg}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${scoreInt}%`, backgroundColor: "#6C63FF" },
              ]}
            />
          </View>
        </View>

        {/* Daily Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Progress</Text>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Tasks</Text>
              <Text style={styles.progressRatio}>
                {completedTasks} / {totalTasks} completed
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${tasksProgress * 100}%`, backgroundColor: "#6C63FF" },
                ]}
              />
            </View>
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Habits</Text>
              <Text style={styles.progressRatio}>
                {completedHabits} / {totalHabits} completed
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${habitsProgress * 100}%`, backgroundColor: "#00C9A7" },
                ]}
              />
            </View>
          </View>

          {totalTasks === 0 && totalHabits === 0 && (
            <Text style={styles.emptyInlineText}>
              No tasks or habits for today yet. Add some to get started!
            </Text>
          )}
        </View>

        {/* Finance Snapshot */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Finance Snapshot</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyInlineText}>
              No active finances found. Track your first expense!
            </Text>
          ) : (
            <View style={styles.financeRow}>
              <View
                style={[styles.financeMiniCard, { backgroundColor: "#e8f5e9" }]}
              >
                <Text style={[styles.financeLabel, { color: "#2e7d32" }]}>
                  Income
                </Text>
                <Text style={[styles.financeVal, { color: "#2e7d32" }]}>
                  ₹{income.toLocaleString("en-IN")}
                </Text>
              </View>
              <View
                style={[styles.financeMiniCard, { backgroundColor: "#ffebee" }]}
              >
                <Text style={[styles.financeLabel, { color: "#c62828" }]}>
                  Expenses
                </Text>
                <Text style={[styles.financeVal, { color: "#c62828" }]}>
                  ₹{expenses.toLocaleString("en-IN")}
                </Text>
              </View>
              <View
                style={[styles.financeMiniCard, { backgroundColor: "#f3e5f5" }]}
              >
                <Text style={[styles.financeLabel, { color: "#6a1b9a" }]}>
                  Savings
                </Text>
                <Text style={[styles.financeVal, { color: "#6a1b9a" }]}>
                  ₹{savings.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Active Goals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Goals</Text>
          {activeGoals.length > 0 ? (
            activeGoals.map((goal, i) => {
              const rawProgress = (goal.currentValue / Math.max(goal.targetValue, 1)) * 100;
              const progress = Math.min(100, Math.max(0, rawProgress));
              const filledBlocks = Math.round(progress / 10);
              const emptyBlocks = 10 - filledBlocks;
              const barText = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

              return (
                <View key={goal.id} style={[{ marginBottom: i === activeGoals.length - 1 ? 0 : 16, marginTop: i === 0 ? 8 : 0 }]}>
                  <Text style={styles.goalTitleList}>{goal.title}</Text>
                  <Text style={styles.barTextMode}>
                    {barText} {progress.toFixed(0)}%
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyInlineText}>
              No active goals right now. Set a new target!
            </Text>
          )}
        </View>

        {/* Streak & Chart Row */}
        <View style={styles.flexRow}>
          <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.cardTitle}>🔥 Current Streak</Text>
            <Text style={styles.streakVal}>{maxStreak}</Text>
            <Text style={styles.streakLabel}>days consistency</Text>
          </View>

          <View style={[styles.card, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.cardTitle}>Weekly Activity</Text>
            <View style={styles.chartRow}>
              {weekData.map((d, i) => (
                <View key={i} style={styles.chartCol}>
                  <View style={styles.chartBarBg}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { height: `${(d.count / maxActivity) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{d.label.charAt(0)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/tasks")}
            >
              <View
                style={[styles.actionIconBg, { backgroundColor: "#E6E4FF" }]}
              >
                <Ionicons name="checkbox-outline" size={24} color="#6C63FF" />
              </View>
              <Text style={styles.actionText}>Add Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/habits")}
            >
              <View
                style={[styles.actionIconBg, { backgroundColor: "#E0F9F5" }]}
              >
                <Ionicons name="repeat-outline" size={24} color="#00C9A7" />
              </View>
              <Text style={styles.actionText}>Add Habit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/finance")}
            >
              <View
                style={[styles.actionIconBg, { backgroundColor: "#FFF0E6" }]}
              >
                <Ionicons name="wallet-outline" size={24} color="#FF8C00" />
              </View>
              <Text style={styles.actionText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Reminders */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming Reminders</Text>
          {reminders.length > 0 ? (
            reminders.map((r, i) => {
              let iconColor = "#6C63FF";
              if (r.type === "Habit") iconColor = "#FF8C00";
              if (r.type === "Goal") iconColor = "#2ECC71";

              return (
                <View
                  key={r.id}
                  style={[
                    styles.reminderRow,
                    i === reminders.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.reminderIconBg}>
                    <Ionicons name={r.icon as any} size={22} color={iconColor} />
                  </View>
                  <View style={styles.reminderTextCont}>
                    <Text style={styles.reminderTitle} numberOfLines={1}>
                      {r.text}
                    </Text>
                    <Text style={styles.reminderSub}>{r.type} {r.type === "Goal" ? "" : "- Today"}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>No upcoming reminders</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FB",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  date: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    backgroundColor: "#FF6347",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  quoteCard: {
    backgroundColor: "#6C63FF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  quoteCardBg: {
    position: "relative",
    zIndex: 1,
  },
  refreshQuoteBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 4,
    zIndex: 10,
  },
  quoteText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontStyle: "italic",
    lineHeight: 24,
    fontWeight: "500",
  },
  quoteAuthor: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  quoteDecor1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -40,
    right: -20,
  },
  quoteDecor2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    bottom: -20,
    left: -20,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreCircle: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  scoreTotal: {
    fontSize: 16,
    color: "#A0A0A0",
    fontWeight: "600",
    marginLeft: 4,
  },
  scoreMsgContainer: {
    flex: 1,
    marginLeft: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#F5F7FB",
  },
  scoreMsgText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    lineHeight: 20,
  },
  scoreBarBg: {
    height: 10,
    backgroundColor: "#F5F7FB",
    borderRadius: 5,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  progressRatio: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F5F7FB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  financeMiniCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },
  financeLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  financeVal: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
  },
  actionIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  streakVal: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FF8C00",
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
    fontWeight: "500",
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 70,
  },
  chartCol: {
    alignItems: "center",
    width: 16,
  },
  chartBarBg: {
    width: 10,
    height: 50,
    backgroundColor: "#F5F7FB",
    borderRadius: 5,
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  chartBarFill: {
    width: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 5,
  },
  chartLabel: {
    fontSize: 11,
    color: "#A0A0A0",
    fontWeight: "600",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F7FB",
  },
  reminderIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F5F7FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reminderTextCont: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  reminderSub: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#A0A0A0",
    marginTop: 8,
    fontWeight: "500",
  },
  emptyInlineText: {
    fontSize: 14,
    color: "#A0A0A0",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  goalTitleList: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  barTextMode: {
    fontFamily: "monospace",
    fontSize: 14,
    color: "#6C63FF",
    letterSpacing: 2,
  },
});