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
  const { loading, data, metrics, refresh } = useGrowthData();
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

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {data.userName} 👋</Text>
            <Text style={styles.date}>{todayDateStr}</Text>
          </View>
          <TouchableOpacity style={styles.levelBadge} onPress={() => router.push("/profile")}>
            <Text style={styles.levelText}>LVL {metrics?.level || 1}</Text>
          </TouchableOpacity>
        </View>

        {/* Level Progress Bar (Premium Touch) */}
        <View style={styles.levelProgressContainer}>
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelTitle}>{metrics?.levelTitle || "Growth Seeker"}</Text>
            <Text style={styles.xpText}>{metrics?.xp || 0} XP</Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${(metrics?.xp || 0) % 100}%` }]} />
          </View>
        </View>

        {/* Main Growth Card */}
        <View style={styles.growthCard}>
          <View style={styles.growthHeader}>
            <Text style={styles.growthLabel}>Growth Score</Text>
            <Text style={styles.growthScore}>{metrics?.personalGrowthScore || 0}%</Text>
          </View>
          <View style={styles.growthBarBg}>
            <View style={[styles.growthBarFill, { width: `${metrics?.personalGrowthScore || 0}%` }]} />
          </View>
          <Text style={styles.growthInsight}>{getSmartInsight()}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="checkbox" size={24} color={THEME.colors.primary} />
            <Text style={styles.statValue}>{Math.round((metrics?.tasksProgress || 0) * 100)}%</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flame" size={24} color="#FF8C00" />
            <Text style={styles.statValue}>{Math.round((metrics?.habitsProgress || 0) * 100)}%</Text>
            <Text style={styles.statLabel}>Habits</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: "800", color: THEME.colors.text },
  date: { fontSize: 14, color: THEME.colors.textLight, marginTop: 4 },
  levelBadge: { backgroundColor: THEME.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  levelText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },

  levelProgressContainer: { marginBottom: 24 },
  levelInfoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  levelTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text },
  xpText: { fontSize: 14, color: THEME.colors.primary, fontWeight: "600" },
  levelBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  levelBarFill: { height: "100%", backgroundColor: THEME.colors.primary },

  growthCard: { backgroundColor: THEME.colors.white, borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  growthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  growthLabel: { fontSize: 16, color: THEME.colors.textLight, fontWeight: "600" },
  growthScore: { fontSize: 32, fontWeight: "900", color: THEME.colors.text },
  growthBarBg: { height: 12, backgroundColor: "#F3F4F6", borderRadius: 6, overflow: "hidden", marginBottom: 16 },
  growthBarFill: { height: "100%", backgroundColor: THEME.colors.secondary },
  growthInsight: { fontSize: 14, color: THEME.colors.textLight, lineHeight: 20, fontStyle: "italic" },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statBox: { backgroundColor: THEME.colors.white, width: '30%', padding: 16, borderRadius: 20, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: THEME.colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: THEME.colors.textLight, marginTop: 2 },

  quoteCard: { backgroundColor: "#F9FAFB", borderRadius: 20, padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: THEME.colors.primary },
  quoteText: { fontSize: 16, color: THEME.colors.text, fontWeight: "600", lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { fontSize: 14, color: THEME.colors.textLight, fontWeight: "500" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text, marginBottom: 16 },
  actionsRow: { paddingRight: 20, marginBottom: 24 },
  actionBtn: { alignItems: "center", marginRight: 24 },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: "600", color: THEME.colors.text },

  focusCard: { backgroundColor: "#1F2937", borderRadius: 24, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  focusInfo: { flex: 1 },
  focusTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  focusSub: { color: "#9CA3AF", fontSize: 13 },
  focusBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  focusBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});