import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { THEME } from "../../constants/types";
import { useGrowthData } from "../../hooks/useGrowthData";

const QUOTES = [
  { text: "Small daily improvements lead to big success.", author: "Robin Sharma" },
  { text: "Consistency is what transforms average into excellence.", author: "Tony Robbins" },
  { text: "Your future is created by what you do today.", author: "Robert Kiyosaki" },
  { text: "The secret to getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, data, metrics, refresh, completeQuest } = useGrowthData();
  const [quote, setQuote] = useState(QUOTES[0]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const todayDateStr = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  // Smart Insight Logic
  const getSmartInsight = () => {
    if (!metrics) return "Loading insights...";
    if (metrics.personalGrowthScore > 80) return "You're in the elite 1% of growth today! Keep the momentum.";
    if (metrics.habitsProgress === 0 && data.habits.length > 0) return "Your habits are waiting for you. Small steps count!";
    if (metrics.tasksProgress > 0.7) return "Productivity is high! Remember to take breaks.";
    return "Consistency is the key to transformation. You're doing great!";
  };

  // Rank Calculation (Real Users Only)
  const leaderboardData = [
    { name: data.userName, score: metrics?.personalGrowthScore || 0, avatar: "🌟", isUser: true, level: metrics?.level || 1 },
  ].sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));

  const userRank = leaderboardData.find(i => i.isUser)?.rank || 1;

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} numberOfLines={1}>{greeting}, {data.userName} 👋</Text>
            <Text style={styles.userTitleBadge}>{metrics?.userTitle || "Growth Seeker"}</Text>
          </View>
        </View>

        {/* Badges Row */}
        <View style={styles.headerBadgesRow}>
          <TouchableOpacity style={styles.levelBadge} onPress={() => router.push("/profile")}>
            <Text style={styles.levelText}>LVL {metrics?.level || 1}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.levelBadge, { backgroundColor: THEME.colors.secondary, marginLeft: 8 }]}
            onPress={() => router.push("/leaderboard")}
          >
            <Text style={styles.levelText}>RANK #{userRank}</Text>
          </TouchableOpacity>
        </View>

        {/* Restore Level Progress Bar */}
        <View style={styles.levelProgressContainer}>
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelTitle}>{metrics?.levelTitle || "Growth Seeker"}</Text>
            <Text style={styles.xpText}>{metrics?.xp || 0} XP</Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${(metrics?.xp || 0) % 100}%` }]} />
          </View>
        </View>

        {/* Daily Quest Card */}
        {metrics?.activeQuest && (
          <TouchableOpacity
            onPress={() => {
              if (metrics.activeQuest?.isClaimed) return;
              const route = metrics.activeQuest?.type === "tasks" ? "/tasks" :
                metrics.activeQuest?.type === "habits" ? "/habits" :
                  metrics.activeQuest?.type === "finance" ? "/finance" : "/journal";
              router.push(route as any);
            }}
            activeOpacity={0.8}
            style={[styles.questCard, metrics.activeQuest.isClaimed && styles.questCardCompleted]}
          >
            <View style={styles.questHeader}>
              <View style={styles.questInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.questLabel}>Daily Quest 💎</Text>
                  {!metrics.activeQuest.isFinished && !metrics.activeQuest.isClaimed && (
                    <View style={styles.progressTag}>
                      <Text style={styles.progressTagText}>IN PROGRESS</Text>
                    </View>
                  )}
                  {metrics.activeQuest.isFinished && !metrics.activeQuest.isClaimed && (
                    <View style={[styles.progressTag, { backgroundColor: THEME.colors.secondary + '40' }]}>
                      <Text style={[styles.progressTagText, { color: '#065F46' }]}>FINISHED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.questTitle}>{metrics.activeQuest.title}</Text>
              </View>
              {metrics.activeQuest.isClaimed ? (
                <View style={[styles.questCompleteBtn, { backgroundColor: '#E5E7EB' }]}>
                  <Text style={[styles.questBtnText, { color: '#9CA3AF' }]}>Claimed</Text>
                </View>
              ) : metrics.activeQuest.isFinished ? (
                <TouchableOpacity
                  style={styles.questCompleteBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    completeQuest(metrics.activeQuest!.id);
                  }}
                >
                  <Text style={styles.questBtnText}>Claim +{metrics.activeQuest.rewardXP} XP</Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="arrow-forward-circle" size={32} color={THEME.colors.primary} />
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Growth Statistics Row */}
        <View style={styles.dateRow}>
          <Text style={styles.date}>{todayDateStr}</Text>
        </View>

        {/* Main Growth Card */}
        <View style={styles.growthCard}>
          <View style={styles.growthHeader}>
            <View>
              <Text style={styles.growthLabel}>Growth Score</Text>
              <Text style={styles.growthValue}>{metrics?.personalGrowthScore || 0}%</Text>
            </View>
            <View style={styles.growthIconCircle}>
              <Ionicons name="rocket" size={28} color="#FFF" />
            </View>
          </View>

          <View style={styles.growthBarBg}>
            <View style={[styles.growthBarFill, { width: `${metrics?.personalGrowthScore || 0}%` }]} />
          </View>

          <View style={styles.insightBox}>
            <Ionicons name="bulb" size={18} color={THEME.colors.secondary} style={{ marginRight: 8 }} />
            <Text style={styles.growthInsight}>{getSmartInsight()}</Text>
          </View>
        </View>

        {/* Restore Weekly Summary */}
        <Text style={styles.sectionTitle}>Weekly Summary</Text>
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <View>
              <Text style={styles.weeklyLabel}>Productivity</Text>
              <Text style={styles.weeklyValue}>{metrics?.weeklyProductivityScore || 0}%</Text>
            </View>
            <View style={styles.weeklyBarContainer}>
              <View style={[styles.weeklyBarFill, { width: `${metrics?.weeklyProductivityScore || 0}%` }]} />
            </View>
          </View>

          <View style={styles.weeklyGrid}>
            <View style={styles.weeklyItem}>
              <Text style={styles.weeklyStat}>{metrics?.weeklyTasksDone || 0}</Text>
              <Text style={styles.weeklySub}>Tasks</Text>
            </View>
            <View style={styles.weeklyItem}>
              <Text style={styles.weeklyStat}>{metrics?.weeklyHabitsDone || 0}</Text>
              <Text style={styles.weeklySub}>Habits</Text>
            </View>
            <View style={styles.weeklyItem}>
              <Text style={[styles.weeklyStat, { color: '#059669' }]}>₹{metrics?.weeklySavings || 0}</Text>
              <Text style={styles.weeklySub}>Saved</Text>
            </View>
            <View style={styles.weeklyItem}>
              <Text style={[styles.weeklyStat, { color: '#DC2626' }]}>₹{metrics?.weeklyExpenses || 0}</Text>
              <Text style={styles.weeklySub}>Spent</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="checkbox" size={24} color={THEME.colors.primary} />
            <Text style={styles.statValue}>{Math.round((metrics?.tasksProgress || 0) * 100)}%</Text>
            <Text style={styles.statLabel}>Daily Tasks</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flame" size={24} color="#FF8C00" />
            <Text style={styles.statValue}>{Math.round((metrics?.habitsProgress || 0) * 100)}%</Text>
            <Text style={styles.statLabel}>Daily Habits</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={24} color="#00C9A7" />
            <Text style={styles.statValue}>{Math.round((metrics?.goalsProgress || 0) * 100)}%</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>
        </View>

        {/* Quote Section */}
        <View style={styles.quoteCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={THEME.colors.primary} style={{ opacity: 0.3 }} />
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/tasks")}>
            <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}><Ionicons name="add-circle" size={24} color={THEME.colors.primary} /></View>
            <Text style={styles.actionLabel}>Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/habits")}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="calendar" size={24} color="#D97706" /></View>
            <Text style={styles.actionLabel}>Habit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/finance")}>
            <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}><Ionicons name="card" size={24} color="#16A34A" /></View>
            <Text style={styles.actionLabel}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/journal")}>
            <View style={[styles.actionIcon, { backgroundColor: '#FCE7F3' }]}><Ionicons name="book" size={24} color="#DB2777" /></View>
            <Text style={styles.actionLabel}>Journal</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Daily Focus Reminder */}
        <View style={styles.focusCard}>
          <View style={styles.focusInfo}>
            <Text style={styles.focusTitle}>Ready for Focus?</Text>
            <Text style={styles.focusSub}>Active sessions today: {data.tasks.filter(t => t.completed).length}</Text>
          </View>
          <TouchableOpacity style={styles.focusBtn} onPress={() => router.push("/tasks")}>
            <Text style={styles.focusBtnText}>Start Timer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  container: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 16 },
  headerBadgesRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: "800", color: THEME.colors.text },
  date: { fontSize: 14, color: THEME.colors.textLight, marginTop: 4 },
  levelBadge: { backgroundColor: THEME.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  levelText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },

  levelProgressContainer: { marginBottom: 24 },
  levelInfoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  levelTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text },
  xpText: { fontSize: 14, color: THEME.colors.primary, fontWeight: "600" },
  levelBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  levelBarFill: { height: "100%", backgroundColor: THEME.colors.primary },

  userTitleBadge: { fontSize: 13, fontWeight: "700", color: THEME.colors.primary, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  dateRow: { marginBottom: 16 },

  questCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: THEME.colors.primary, shadowColor: THEME.colors.primary, shadowOpacity: 0.1, shadowRadius: 20, elevation: 4 },
  questCardCompleted: { borderColor: THEME.colors.secondary, shadowColor: THEME.colors.secondary, opacity: 0.8 },
  questHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  questInfo: { flex: 1 },
  questLabel: { fontSize: 11, fontWeight: "800", color: THEME.colors.textLight, textTransform: "uppercase", marginBottom: 4 },
  progressTag: { backgroundColor: THEME.colors.secondary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  progressTagText: { fontSize: 9, fontWeight: "800", color: THEME.colors.secondary },
  questTitle: { fontSize: 18, fontWeight: "800", color: THEME.colors.text },
  questCompleteBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  questBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },

  growthCard: { backgroundColor: THEME.colors.white, borderRadius: 28, padding: 24, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: "#F3F4F6" },
  growthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  growthLabel: { fontSize: 14, color: THEME.colors.textLight, fontWeight: "700", textTransform: "uppercase" },
  growthValue: { fontSize: 36, fontWeight: "900", color: THEME.colors.text, marginTop: 4 },
  growthIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: THEME.colors.secondary, justifyContent: "center", alignItems: "center", shadowColor: THEME.colors.secondary, shadowOpacity: 0.3, shadowRadius: 10 },
  growthBarBg: { height: 10, backgroundColor: "#F3F4F6", borderRadius: 5, overflow: "hidden", marginBottom: 20 },
  growthBarFill: { height: "100%", backgroundColor: THEME.colors.secondary },
  insightBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", padding: 12, borderRadius: 16 },
  growthInsight: { flex: 1, fontSize: 13, color: "#166534", lineHeight: 18, fontWeight: "600" },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statBox: { backgroundColor: THEME.colors.white, width: '30%', padding: 20, borderRadius: 28, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: THEME.colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: THEME.colors.textLight, marginTop: 4, fontWeight: "600" },

  quoteCard: { backgroundColor: "#F9FAFB", borderRadius: 28, padding: 24, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: THEME.colors.primary },
  quoteText: { fontSize: 16, color: THEME.colors.text, fontWeight: "600", lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { fontSize: 14, color: THEME.colors.textLight, fontWeight: "500" },

  weeklyCard: { backgroundColor: "#FFF", borderRadius: 28, padding: 24, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  weeklyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  weeklyLabel: { fontSize: 14, color: THEME.colors.textLight, fontWeight: "700", textTransform: "uppercase" },
  weeklyValue: { fontSize: 24, fontWeight: "900", color: THEME.colors.text },
  weeklyBarContainer: { flex: 1, height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, marginLeft: 20, overflow: "hidden" },
  weeklyBarFill: { height: "100%", backgroundColor: THEME.colors.primary },
  weeklyGrid: { flexDirection: "row", justifyContent: "space-between" },
  weeklyItem: { alignItems: "center" },
  weeklyStat: { fontSize: 16, fontWeight: "800", color: THEME.colors.text },
  weeklySub: { fontSize: 11, color: THEME.colors.textLight, marginTop: 4, fontWeight: "600" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text, marginBottom: 16 },
  actionsRow: { paddingRight: 20, marginBottom: 24 },
  actionBtn: { alignItems: "center", marginRight: 24 },
  actionIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: "600", color: THEME.colors.text },

  focusCard: { backgroundColor: "#1F2937", borderRadius: 28, padding: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  focusInfo: { flex: 1 },
  focusTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  focusSub: { color: "#9CA3AF", fontSize: 13 },
  focusBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  focusBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});