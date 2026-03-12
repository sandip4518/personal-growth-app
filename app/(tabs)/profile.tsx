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
  View
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
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed) setLifeBalance(parsed);
        } catch (e) {
          console.error("Failed to parse life balance", e);
        }
      }
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

  const balanceValues = Object.values(lifeBalance);
  const averageBalance = balanceValues.length > 0
    ? (balanceValues.reduce((a, b) => a + b, 0) / balanceValues.length).toFixed(1)
    : "0.0";

  // Rank Calculation (Real Users Only)
  const leaderboardData = [
    { name: data.userName, score: metrics?.personalGrowthScore || 0, avatar: "🌟", rank: 1, isUser: true, level: metrics?.level || 1 },
  ].sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));

  const userRank = leaderboardData.find(i => i.isUser)?.rank || 1;

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

        {/* Growth Score Center */}
        <View style={styles.growthCardProfile}>
          <View style={styles.growthHeaderProfile}>
            <View>
              <Text style={styles.growthLabel}>Overall Growth</Text>
              <Text style={styles.growthValue}>{metrics?.personalGrowthScore || 0}%</Text>
            </View>
            <TouchableOpacity style={styles.rankBadgeProfile} onPress={() => router.push("/leaderboard")}>
              <Text style={styles.rankBadgeTextProfile}>RANK #{userRank}</Text>
              <Ionicons name="chevron-forward" size={12} color="#FFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
          <View style={styles.growthBarBgProfile}>
            <View style={[styles.growthBarFillProfile, { width: `${metrics?.personalGrowthScore || 0}%` }]} />
          </View>
          <View style={styles.growthBreakdownProfile}>
            <View style={styles.breakdownItemProfile}>
              <View style={styles.breakdownIconBox}><Ionicons name="checkbox" size={14} color="#FFF" /></View>
              <Text style={styles.breakdownValProfile}>{Math.round(metrics?.taskContribution || 0)}</Text>
              <Text style={styles.breakdownLabProfile}>Tasks</Text>
            </View>
            <View style={styles.breakdownItemProfile}>
              <View style={[styles.breakdownIconBox, { backgroundColor: '#FF8C00' }]}><Ionicons name="flame" size={14} color="#FFF" /></View>
              <Text style={styles.breakdownValProfile}>{Math.round(metrics?.habitContribution || 0)}</Text>
              <Text style={styles.breakdownLabProfile}>Habits</Text>
            </View>
            <View style={styles.breakdownItemProfile}>
              <View style={[styles.breakdownIconBox, { backgroundColor: '#00C9A7' }]}><Ionicons name="trending-up" size={14} color="#FFF" /></View>
              <Text style={styles.breakdownValProfile}>{Math.round(metrics?.goalContribution || 0)}</Text>
              <Text style={styles.breakdownLabProfile}>Goals</Text>
            </View>
            <View style={styles.breakdownItemProfile}>
              <View style={[styles.breakdownIconBox, { backgroundColor: '#6C63FF' }]}><Ionicons name="star" size={14} color="#FFF" /></View>
              <Text style={styles.breakdownValProfile}>{Math.round((metrics?.financeContribution || 0) + (metrics?.journalContribution || 0))}</Text>
              <Text style={styles.breakdownLabProfile}>Extra</Text>
            </View>
          </View>
        </View>

        {/* Growth DNA Detail Section */}
        {metrics?.growthDNA && (
          <View style={styles.dnaDetailCard}>
            {/* Header with fingerprint badge */}
            <View style={styles.dnaDetailHeader}>
              <View style={styles.dnaHeaderBadge}>
                <Ionicons name="finger-print" size={16} color="#FFF" />
              </View>
              <Text style={styles.dnaDetailTitle}>Growth DNA</Text>
              <View style={styles.dnaSubBadge}>
                <Text style={styles.dnaSubBadgeText}>UNIQUE TO YOU</Text>
              </View>
            </View>

            {/* Premium Archetype Display */}
            <View style={styles.archetypeDisplayCard}>
              <View style={styles.archetypeGlow}>
                <Text style={styles.archetypeDisplayEmoji}>{metrics.growthDNA.archetype.emoji}</Text>
              </View>
              <Text style={styles.archetypeDisplayName}>{metrics.growthDNA.archetype.name}</Text>
              <View style={styles.archetypeDivider} />
              <Text style={styles.archetypeDisplayDesc}>{metrics.growthDNA.archetype.description}</Text>
            </View>

            {/* 6 Dimension Bars */}
            {([
              { key: 'discipline', label: 'Discipline', color: '#818CF8', icon: 'shield-checkmark' },
              { key: 'mindfulness', label: 'Mindfulness', color: '#F472B6', icon: 'leaf' },
              { key: 'financialHealth', label: 'Financial Health', color: '#34D399', icon: 'wallet' },
              { key: 'consistency', label: 'Consistency', color: '#FBBF24', icon: 'flame' },
              { key: 'ambition', label: 'Ambition', color: '#F87171', icon: 'rocket' },
              { key: 'selfAwareness', label: 'Self-Awareness', color: '#A78BFA', icon: 'eye' },
            ] as const).map(dim => (
              <View key={dim.key} style={styles.dnaDimRow}>
                <View style={styles.dnaDimLabelRow}>
                  <View style={[styles.dnaDimIconBox, { backgroundColor: dim.color + '18' }]}>
                    <Ionicons name={dim.icon as any} size={16} color={dim.color} />
                  </View>
                  <Text style={styles.dnaDimLabel}>{dim.label}</Text>
                  <Text style={[styles.dnaDimValue, { color: dim.color }]}>{metrics.growthDNA.dimensions[dim.key]}%</Text>
                </View>
                <View style={styles.dnaDimBarBg}>
                  <View style={[styles.dnaDimBarFill, { width: `${metrics.growthDNA.dimensions[dim.key]}%`, backgroundColor: dim.color }]} />
                </View>
              </View>
            ))}

            {/* Cross-Module Insights */}
            <View style={styles.insightsHeader}>
              <Ionicons name="bulb-outline" size={16} color={THEME.colors.secondary} />
              <Text style={styles.insightsTitle}>Aha! Insights</Text>
            </View>
            {metrics.growthDNA.insights.map((insight, idx) => {
              const bgColors = ['#EEF2FF', '#FDF2F8', '#ECFDF5', '#FEF3C7'];
              const textColors = ['#3730A3', '#9D174D', '#065F46', '#92400E'];
              const emojis = ['💡', '🔗', '⚡', '🎯'];
              return (
                <View key={idx} style={[styles.insightCard, { backgroundColor: bgColors[idx % 4] }]}>
                  <View style={styles.insightEmojiCircle}>
                    <Text style={styles.insightEmoji}>{emojis[idx % 4]}</Text>
                  </View>
                  <Text style={[styles.insightText, { color: textColors[idx % 4] }]}>{insight}</Text>
                </View>
              );
            })}
          </View>
        )}

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

        {/* Global Leaderboard Highlighting */}
        <TouchableOpacity style={styles.card} onPress={() => router.push("/leaderboard")}>
          <View style={styles.cardHeader}>
            <Ionicons name="trophy-outline" size={20} color="#FFD700" />
            <Text style={styles.cardTitle}>Global Leaderboard</Text>
            <View style={styles.viewAllBadge}><Text style={styles.viewAllText}>VIEW ALL</Text></View>
          </View>
          <View style={styles.leaderboardList}>
            {leaderboardData.slice(0, 3).map((item) => (
              <View key={item.name} style={[styles.leaderboardItem, item.isUser && styles.leaderboardItemUser]}>
                <View style={styles.leaderboardLeft}>
                  <Text style={[styles.rankText, item.rank <= 3 && styles.topRank]}>#{item.rank}</Text>
                  <View style={styles.avatarCircle}><Text style={{ fontSize: 18 }}>{item.avatar}</Text></View>
                  <Text style={[styles.leaderboardName, item.isUser && styles.leaderboardNameUser]}>{item.isUser ? "You" : item.name}</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>{item.score}%</Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>

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

  growthCardProfile: { backgroundColor: "#1F2937", padding: 24, borderRadius: 28, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  growthHeaderProfile: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  growthLabel: { fontSize: 14, color: "#9CA3AF", fontWeight: "700", textTransform: "uppercase" },
  growthValue: { fontSize: 36, fontWeight: "900", color: "#FFF", marginTop: 4 },
  rankBadgeProfile: { backgroundColor: THEME.colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  rankBadgeTextProfile: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  growthBarBgProfile: { height: 10, backgroundColor: "#374151", borderRadius: 5, overflow: "hidden", marginBottom: 24 },
  growthBarFillProfile: { height: "100%", backgroundColor: THEME.colors.secondary },
  growthBreakdownProfile: { flexDirection: "row", justifyContent: "space-between" },
  breakdownItemProfile: { alignItems: "center", flex: 1 },
  breakdownIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  breakdownValProfile: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  breakdownLabProfile: { fontSize: 10, color: "#9CA3AF", marginTop: 4, fontWeight: "700", textTransform: 'uppercase' },

  card: { backgroundColor: "#FFF", padding: 24, borderRadius: 28, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text, marginLeft: 8, flex: 1 },
  viewAllBadge: { backgroundColor: THEME.colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  viewAllText: { fontSize: 10, fontWeight: "800", color: THEME.colors.primary },

  leaderboardList: { marginTop: 8 },
  leaderboardItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  leaderboardItemUser: { backgroundColor: THEME.colors.primary + '10', borderRadius: 16, paddingHorizontal: 12, borderBottomWidth: 0, marginVertical: 4 },
  leaderboardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  rankText: { fontSize: 14, fontWeight: "800", color: THEME.colors.textLight, width: 30 },
  topRank: { color: THEME.colors.primary },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  leaderboardName: { fontSize: 15, fontWeight: "600", color: THEME.colors.text },
  leaderboardNameUser: { fontWeight: "800", color: THEME.colors.primary },
  scoreBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  scoreBadgeText: { fontSize: 13, fontWeight: "800", color: THEME.colors.text },

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

  // Growth DNA Detail — Premium
  dnaDetailCard: { backgroundColor: "#FFF", padding: 24, borderRadius: 28, marginBottom: 24, shadowColor: "#6C63FF", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6, borderWidth: 1, borderColor: '#F3F4F6' },
  dnaDetailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  dnaHeaderBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME.colors.primary, justifyContent: 'center', alignItems: 'center' },
  dnaDetailTitle: { fontSize: 18, fontWeight: "900", color: THEME.colors.text, marginLeft: 10, flex: 1 },
  dnaSubBadge: { backgroundColor: THEME.colors.secondary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dnaSubBadgeText: { fontSize: 8, fontWeight: "900", color: THEME.colors.secondary, letterSpacing: 1 },
  archetypeDisplayCard: { backgroundColor: "#0F172A", borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: '#1E293B' },
  archetypeGlow: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#334155' },
  archetypeDisplayEmoji: { fontSize: 36 },
  archetypeDisplayName: { fontSize: 24, fontWeight: "900", color: "#F1F5F9", marginBottom: 12, letterSpacing: 0.5 },
  archetypeDivider: { width: 40, height: 3, backgroundColor: THEME.colors.primary, borderRadius: 2, marginBottom: 14 },
  archetypeDisplayDesc: { fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 20, fontWeight: "500", paddingHorizontal: 8 },
  dnaDimRow: { marginBottom: 14 },
  dnaDimLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dnaDimIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 10 },
  dnaDimLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: THEME.colors.text },
  dnaDimValue: { fontSize: 14, fontWeight: "900" },
  dnaDimBarBg: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  dnaDimBarFill: { height: "100%", borderRadius: 4 },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 14 },
  insightsTitle: { fontSize: 16, fontWeight: "900", color: THEME.colors.text, marginLeft: 8 },
  insightCard: { flexDirection: "row", padding: 16, borderRadius: 18, marginBottom: 10, alignItems: "center" },
  insightEmojiCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  insightEmoji: { fontSize: 14 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
});