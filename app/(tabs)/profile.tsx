import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STORAGE_KEYS, THEME } from "../../constants/types";
import { useGrowthData } from "../../hooks/useGrowthData";

const screenWidth = Dimensions.get("window").width;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loading, data, metrics, refresh, updateTitle } = useGrowthData();

  const [lifeBalance, setLifeBalance] = useState<Record<string, number>>({
    Health: 5, Career: 5, Finance: 5, Learning: 5, Relationships: 5, Mindset: 5, Fun: 5
  });

  useEffect(() => {
    const loadLifeBalance = async () => {
      const stored = await AsyncStorage.getItem("LIFE_BALANCE_STORAGE");
      if (stored) setLifeBalance(JSON.parse(stored));
    };
    loadLifeBalance();
  }, []);

  const updateLifeBalance = async (area: string, value: number) => {
    const newBalance = { ...lifeBalance, [area]: value };
    setLifeBalance(newBalance);
    await AsyncStorage.setItem("LIFE_BALANCE_STORAGE", JSON.stringify(newBalance));
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      router.replace("/auth/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const averageBalance = (Object.values(lifeBalance).reduce((a, b) => a + b, 0) / Object.values(lifeBalance).length).toFixed(1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Standardized Profile Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.greeting}>Hey, {data.userName} 👋</Text>
            <View style={styles.titleBadgeContainer}>
              <Text style={styles.titleBadgeText}>{metrics?.userTitle || "Growth Seeker"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.levelBadgeHeader} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Visual Level Progress Bar */}
        <View style={styles.levelProgressContainer}>
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelTitle}>{metrics?.levelTitle || "Growth Seeker"}</Text>
            <Text style={styles.xpText}>{metrics?.xp || 0} XP</Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${(metrics?.xp || 0) % 100}%` }]} />
          </View>
        </View>

        {/* Title Shop / Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Available Titles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.titlesScroll}>
            {data.rewardData.unlockedTitles.concat(metrics?.level && metrics.level >= 5 ? ["Growth Pioneer"] : []).map(title => (
              <TouchableOpacity
                key={title}
                style={[styles.titleChoice, metrics?.userTitle === title && styles.titleChoiceActive]}
                onPress={() => updateTitle(title)}
              >
                <Text style={[styles.titleChoiceText, metrics?.userTitle === title && styles.textWhite]}>{title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats Grid - Standardized to Dashboard Style */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="checkbox" size={24} color={THEME.colors.primary} />
            <Text style={styles.statValue}>{data.tasks.filter(t => t.completed).length}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flame" size={24} color="#FF8C00" />
            <Text style={styles.statValue}>{data.habits.length}</Text>
            <Text style={styles.statLabel}>Habits</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={24} color="#00C9A7" />
            <Text style={styles.statValue}>{data.goals.filter(g => g.completed).length}</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>
        </View>

        {/* Life Balance Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.cardTitle}>Life Balance Tracker</Text>
          </View>
          <View style={styles.avgBalanceContainer}>
            <Text style={styles.avgBalanceVal}>{averageBalance}</Text>
            <Text style={styles.avgBalanceLab}>Overall Balance</Text>
          </View>

          <BarChart
            data={{
              labels: ["Health", "Career", "Finance", "Learn", "Relat.", "Mind.", "Fun"],
              datasets: [{ data: Object.values(lifeBalance) }]
            }}
            width={screenWidth - 64}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundColor: "#FFF",
              backgroundGradientFrom: "#FFF",
              backgroundGradientTo: "#FFF",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              labelColor: () => THEME.colors.textLight,
              barPercentage: 0.6,
              propsForBackgroundLines: { strokeDasharray: "" },
            }}
            style={styles.chartStyle}
            verticalLabelRotation={0}
          />

          <View style={styles.balanceSelectors}>
            {Object.entries(lifeBalance).map(([area, value]) => (
              <View key={area} style={styles.balanceRow}>
                <Text style={styles.areaLabel}>{area}</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity onPress={() => updateLifeBalance(area, Math.max(1, value - 1))} style={styles.stepperBtn}>
                    <Ionicons name="remove" size={16} color={THEME.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{value}</Text>
                  <TouchableOpacity onPress={() => updateLifeBalance(area, Math.min(10, value + 1))} style={styles.stepperBtn}>
                    <Ionicons name="add" size={16} color={THEME.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements - Expanded System */}
        <Text style={styles.sectionTitle}>Hall of Fame</Text>
        <View style={styles.achievementsRow}>
          <AchievementBadge emoji="🚀" title="Quick Starter" sub="5 Tasks Done" locked={data.tasks.filter(t => t.completed).length < 5} />
          <AchievementBadge emoji="👑" title="Habit Master" sub="7 Day Streak" locked={Math.max(...data.habits.map(h => h.streak), 0) < 7} />
          <AchievementBadge emoji="💰" title="Smart Saver" sub="Save ₹1000" locked={metrics?.weeklySavings === undefined || metrics.weeklySavings < 1000} />
          <AchievementBadge emoji="🔥" title="Consistent" sub="3 Day Streak" locked={Math.max(...data.habits.map(h => h.streak), 0) < 3} />
          <AchievementBadge emoji="🏆" title="Goal Crusher" sub="First Goal" locked={data.goals.filter(g => g.completed).length === 0} />
          <AchievementBadge emoji="⚡" title="Focused" sub="Level 5+" locked={(metrics?.level || 1) < 5} />
          <AchievementBadge emoji="✍️" title="Reflector" sub="5 Journals" locked={data.journalEntries.length < 5} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function AchievementBadge({ emoji, title, sub, locked }: { emoji: string; title: string; sub: string; locked: boolean }) {
  return (
    <View style={[styles.badgeCard, locked && styles.badgeLocked]}>
      <Text style={styles.badgeEmoji}>{emoji}</Text>
      <Text style={styles.badgeTitle}>{title}</Text>
      <Text style={styles.badgeSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  dashboardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: "800", color: THEME.colors.text },
  levelBadgeHeader: { backgroundColor: "#FF5252", padding: 10, borderRadius: 15 },

  levelProgressContainer: { marginBottom: 24 },
  levelInfoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  levelTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text },
  xpText: { fontSize: 14, color: THEME.colors.primary, fontWeight: "600" },
  levelBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  levelBarFill: { height: "100%", backgroundColor: THEME.colors.primary },

  titleBadgeContainer: { backgroundColor: THEME.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4, alignSelf: 'flex-start' },
  titleBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  titlesScroll: { marginTop: 12 },
  titleChoice: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F3F4F6", marginRight: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  titleChoiceActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  titleChoiceText: { fontSize: 13, fontWeight: "700", color: THEME.colors.textLight },
  textWhite: { color: "#FFF" },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statBox: { backgroundColor: "#FFF", width: "30%", padding: 20, borderRadius: 28, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statValue: { fontSize: 20, fontWeight: "900", color: THEME.colors.primary, marginTop: 8 },
  statLabel: { fontSize: 12, color: THEME.colors.textLight, marginTop: 4, fontWeight: "600" },

  card: { backgroundColor: "#FFF", padding: 24, borderRadius: 28, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text, marginLeft: 8 },

  avgBalanceContainer: { alignItems: "center", marginBottom: 20 },
  avgBalanceVal: { fontSize: 40, fontWeight: "900", color: THEME.colors.primary },
  avgBalanceLab: { fontSize: 13, color: THEME.colors.textLight, fontWeight: "600" },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  balanceSelectors: { marginTop: 10 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  areaLabel: { fontSize: 14, fontWeight: "700", color: THEME.colors.text },
  stepperContainer: { flexDirection: "row", alignItems: "center" },
  stepperBtn: { width: 32, height: 32, backgroundColor: "#F3F4F6", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  stepperVal: { width: 36, textAlign: "center", fontWeight: "900", color: THEME.colors.primary, fontSize: 16 },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: THEME.colors.text, marginBottom: 16 },
  achievementsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeCard: { width: "47%", backgroundColor: "#FFF", padding: 20, borderRadius: 24, alignItems: "center", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  badgeLocked: { opacity: 0.2, filter: 'grayscale(1)' },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeTitle: { fontSize: 14, fontWeight: "800", color: THEME.colors.text, textAlign: 'center' },
  badgeSub: { fontSize: 11, color: THEME.colors.textLight, marginTop: 4, fontWeight: "600", textAlign: 'center' },
});