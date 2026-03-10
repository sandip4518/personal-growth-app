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
  const { loading, data, metrics, refresh } = useGrowthData();

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
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#FF5252" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarMain}>
                <Text style={styles.avatarInitial}>{data.userName.charAt(0)}</Text>
              </View>
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{data.userName}</Text>
              <Text style={styles.levelBadgeText}>{metrics?.levelTitle || "Growth Seeker"} • LVL {metrics?.level || 1}</Text>
            </View>
          </View>
        </View>

        {/* Level Stats */}
        <View style={styles.levelCard}>
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelLabel}>Progress to Level {(metrics?.level || 1) + 1}</Text>
            <Text style={styles.xpValue}>{metrics?.xp || 0} XP</Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${(metrics?.xp || 0) % 100}%` }]} />
          </View>
        </View>

        {/* Global Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{data.tasks.filter(t => t.completed).length}</Text>
            <Text style={styles.statLab}>Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#FF8C00' }]}>{data.habits.length}</Text>
            <Text style={styles.statLab}>Habits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#00C9A7' }]}>{data.goals.filter(g => g.completed).length}</Text>
            <Text style={styles.statLab}>Goals</Text>
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

        {/* Achievements */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementsRow}>
          <AchievementBadge emoji="🔥" title="Consistent" sub={`${Math.max(...data.habits.map(h => h.streak), 0)} Day Streak`} locked={Math.max(...data.habits.map(h => h.streak), 0) < 3} />
          <AchievementBadge emoji="🏆" title="Goal Crusher" sub={`${data.goals.filter(g => g.completed).length} Goals`} locked={data.goals.filter(g => g.completed).length === 0} />
          <AchievementBadge emoji="⚡" title="Focused" sub="Level 5+" locked={(metrics?.level || 1) < 5} />
          <AchievementBadge emoji="✍️" title="Reflector" sub="Daily Journal" locked={data.journalEntries.length < 5} />
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
  scrollContent: { paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerCard: { backgroundColor: "#FFF", borderRadius: 32, padding: 32, marginTop: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  logoutBtn: { position: "absolute", top: 20, right: 20, flexDirection: "row", alignItems: "center", backgroundColor: "#FFF5F5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  logoutBtnText: { color: "#FF5252", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  headerContent: { alignItems: "center" },
  avatarWrapper: { marginBottom: 16 },
  avatarMain: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.colors.primary, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#FFF", fontSize: 32, fontWeight: "900" },
  onlineBadge: { position: "absolute", bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2ECC71", borderWidth: 3, borderColor: "#FFF" },
  userInfo: { alignItems: "center" },
  userName: { fontSize: 24, fontWeight: "800", color: THEME.colors.text },
  levelBadgeText: { fontSize: 13, color: THEME.colors.textLight, fontWeight: "600", marginTop: 4 },

  levelCard: { backgroundColor: "#FFF", padding: 20, borderRadius: 24, marginBottom: 20 },
  levelInfoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  levelLabel: { fontSize: 14, fontWeight: "700", color: THEME.colors.text },
  xpValue: { fontSize: 14, color: THEME.colors.primary, fontWeight: "800" },
  levelBarBg: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  levelBarFill: { height: "100%", backgroundColor: THEME.colors.primary },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  statItem: { backgroundColor: "#FFF", width: "30%", padding: 16, borderRadius: 20, alignItems: "center" },
  statVal: { fontSize: 20, fontWeight: "900", color: THEME.colors.primary },
  statLab: { fontSize: 12, color: THEME.colors.textLight, marginTop: 2, fontWeight: "600" },

  card: { backgroundColor: "#FFF", padding: 20, borderRadius: 24, marginBottom: 24 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text, marginLeft: 8 },
  avgBalanceContainer: { alignItems: "center", marginBottom: 20 },
  avgBalanceVal: { fontSize: 36, fontWeight: "900", color: THEME.colors.primary },
  avgBalanceLab: { fontSize: 12, color: THEME.colors.textLight, fontWeight: "600" },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  balanceSelectors: { marginTop: 10 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  areaLabel: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  stepperContainer: { flexDirection: "row", alignItems: "center" },
  stepperBtn: { width: 28, height: 28, backgroundColor: "#F3F4F6", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  stepperVal: { width: 30, textAlign: "center", fontWeight: "800", color: THEME.colors.primary, fontSize: 15 },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text, marginBottom: 16 },
  achievementsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  badgeCard: { width: "47%", backgroundColor: "#FFF", padding: 16, borderRadius: 20, alignItems: "center", marginBottom: 16 },
  badgeLocked: { opacity: 0.3 },
  badgeEmoji: { fontSize: 28, marginBottom: 8 },
  badgeTitle: { fontSize: 14, fontWeight: "700", color: THEME.colors.text },
  badgeSub: { fontSize: 11, color: THEME.colors.textLight, marginTop: 2 },
});