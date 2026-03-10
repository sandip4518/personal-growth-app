import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

const HABITS_STORAGE_KEY = 'HABITS_STORAGE';
const TASK_STORAGE_KEY = 'tasks_storage';
const FINANCE_STORAGE_KEY = 'FINANCE_STORAGE';
const TARGET_SAVINGS = 100000;

const QUOTES = [
  "You are becoming better every day.",
  "Small steps every day lead to big results.",
  "Consistency is what transforms average into excellence.",
  "Your future is created by what you do today.",
  "Focus on the step in front of you, not the whole staircase.",
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);

  // Stats State
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalHabits, setTotalHabits] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [savings, setSavings] = useState(0);
  const [weeklyData, setWeeklyData] = useState(Array(7).fill(0));

  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useFocusEffect(
    useCallback(() => {
      checkLoginStatus();
    }, [])
  );

  const checkLoginStatus = async () => {
    setIsLoading(true);
    try {
      const isLoggedIn = await AsyncStorage.getItem('USER_LOGGED_IN');
      if (isLoggedIn === 'true') {
        const data = await AsyncStorage.getItem('USER_DATA');
        if (data) {
          setUserData(JSON.parse(data));
        }
        await loadDashboardData();
        setIsLoading(false);
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Failed to check login status', error);
      router.replace('/auth/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load Tasks
      const storedTasks = await AsyncStorage.getItem(TASK_STORAGE_KEY);
      let tasks = [];
      if (storedTasks) {
        tasks = JSON.parse(storedTasks);
        setTotalTasks(tasks.length);
        setCompletedTasks(tasks.filter((t: any) => t.completed).length);
      }

      // Load Habits
      const storedHabits = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
      let activeHabits = [];
      if (storedHabits) {
        const habits = JSON.parse(storedHabits);
        activeHabits = habits;
        setTotalHabits(habits.length);

        let maxStreak = 0;
        let weekCounts = Array(7).fill(0);

        const now = new Date();
        const startOfWeek = new Date(now);
        // Start of week (Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        habits.forEach((h: any) => {
          if (h.streak > maxStreak) maxStreak = h.streak;

          h.completedDates?.forEach((dateStr: string) => {
            const d = new Date(dateStr);
            if (d >= startOfWeek) {
              // 0-6 index for Mon-Sun
              let dayIdx = d.getDay() - 1;
              if (dayIdx === -1) dayIdx = 6;
              weekCounts[dayIdx]++;
            }
          });
        });
        setHighestStreak(maxStreak);
        setWeeklyData(weekCounts);
      }

      // Load Finances
      const storedFinance = await AsyncStorage.getItem(FINANCE_STORAGE_KEY);
      if (storedFinance) {
        const transactions = JSON.parse(storedFinance);
        let totalIncome = 0;
        let totalExpense = 0;
        transactions.forEach((t: any) => {
          if (t.type === 'income') totalIncome += t.amount;
          else totalExpense += t.amount;
        });
        setSavings(Math.max(0, totalIncome - totalExpense));
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('USER_LOGGED_IN');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  // Calculations
  const productivityScore = Math.min(100, Math.round(((completedTasks + (highestStreak * 2)) / Math.max(1, (totalTasks + totalHabits))) * 100)) || 0;
  const savingsProgress = Math.min(100, (savings / TARGET_SAVINGS) * 100);

  // Badges Logic
  // 1. Streak Badge Logic (Tiers: 3, 7, 14, 30, 60, 100 days)
  let streakBadgeDays = 7;
  let hasStreakBadge = false;

  if (highestStreak >= 100) { streakBadgeDays = 100; hasStreakBadge = true; }
  else if (highestStreak >= 60) { streakBadgeDays = 60; hasStreakBadge = true; }
  else if (highestStreak >= 30) { streakBadgeDays = 30; hasStreakBadge = true; }
  else if (highestStreak >= 14) { streakBadgeDays = 14; hasStreakBadge = true; }
  else if (highestStreak >= 7) { streakBadgeDays = 7; hasStreakBadge = true; }
  else if (highestStreak >= 3) { streakBadgeDays = 3; hasStreakBadge = true; }
  else { streakBadgeDays = 7; hasStreakBadge = false; } // Locked base state

  // 2. Tasks Completed Logic (Tiers: 1, 10, 50, 100, 500 tasks)
  let taskBadgeCount = 10;
  let hasTaskBadge = false;

  if (completedTasks >= 500) { taskBadgeCount = 500; hasTaskBadge = true; }
  else if (completedTasks >= 100) { taskBadgeCount = 100; hasTaskBadge = true; }
  else if (completedTasks >= 50) { taskBadgeCount = 50; hasTaskBadge = true; }
  else if (completedTasks >= 10) { taskBadgeCount = 10; hasTaskBadge = true; }
  else if (completedTasks >= 1) { taskBadgeCount = 1; hasTaskBadge = true; }
  else { taskBadgeCount = 10; hasTaskBadge = false; } // Locked base state

  // 3. Savings Logic (Tiers: 1K, 10K, 50K, 100K)
  let savingsBadgeLabel = '10K';
  let hasSavingsBadge = false;

  if (savings >= 100000) { savingsBadgeLabel = '100K'; hasSavingsBadge = true; }
  else if (savings >= 50000) { savingsBadgeLabel = '50K'; hasSavingsBadge = true; }
  else if (savings >= 10000) { savingsBadgeLabel = '10K'; hasSavingsBadge = true; }
  else if (savings >= 1000) { savingsBadgeLabel = '1K'; hasSavingsBadge = true; }
  else { savingsBadgeLabel = '10K'; hasSavingsBadge = false; } // Locked base state

  // Weekly Max for chart scaling
  const maxWeekly = Math.max(...weeklyData, 1);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.headerGradient}>
          <TouchableOpacity style={styles.logoutButtonTopRight} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
            <Text style={styles.logoutTextSmall}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.avatarCard}>
            <Text style={styles.avatarText}>
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{userData?.name || 'User'}</Text>
          <Text style={styles.email}>{userData?.email || 'user@email.com'}</Text>
        </View>

        <View style={styles.content}>

          {/* Quote */}
          <View style={styles.quoteCard}>
            <Ionicons name="sparkles" size={20} color="#6C63FF" style={styles.quoteIcon} />
            <Text style={styles.quoteText}>"{quote}"</Text>
          </View>

          {/* Top Metric Cards */}
          <View style={styles.row}>
            {/* Productivity */}
            <View style={[styles.card, styles.flex1, { marginRight: 8 }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="speedometer" size={20} color="#6C63FF" />
                <Text style={styles.cardTitle}>Score</Text>
              </View>
              <View style={styles.numberRow}>
                <Text style={styles.metricBig}>{productivityScore}</Text>
                <Text style={styles.metricSub}>/100</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${productivityScore}%` }]} />
              </View>
            </View>

            {/* Habit Streak */}
            <View style={[styles.card, styles.flex1, { marginLeft: 8 }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="flame" size={20} color="#FF8C00" />
                <Text style={styles.cardTitle}>Streak</Text>
              </View>
              <View style={styles.numberRow}>
                <Text style={[styles.metricBig, { color: '#FF8C00' }]}>{highestStreak}</Text>
                <Text style={styles.metricSub}>days</Text>
              </View>
              <Text style={styles.statLabel}>Current best streak</Text>
            </View>
          </View>

          {/* Savings Goal */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="wallet" size={20} color="#2ECC71" />
              <Text style={styles.cardTitle}>Savings Goal</Text>
            </View>
            <View style={styles.numberRow}>
              <Text style={[styles.metricBig, { color: '#2ECC71' }]}>₹{savings.toLocaleString('en-IN')}</Text>
              <Text style={styles.metricSub}> / ₹1,00,000</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#2ECC71', width: `${savingsProgress}%` }]} />
            </View>
          </View>

          {/* Weekly Activity */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="bar-chart" size={20} color="#6C63FF" />
              <Text style={styles.cardTitle}>Weekly Activity</Text>
            </View>
            <View style={styles.chartContainer}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, ix) => {
                const val = weeklyData[ix];
                const heightPct = Math.max(10, (val / maxWeekly) * 100);
                const isSelected = new Date().getDay() - 1 === ix || (new Date().getDay() === 0 && ix === 6);
                return (
                  <View key={ix} style={styles.barCol}>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { height: `${heightPct}%`, backgroundColor: isSelected ? '#6C63FF' : '#C7C2FF' }]} />
                    </View>
                    <Text style={[styles.barLabel, isSelected && styles.barLabelSelected]}>{day}</Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Achievements Section */}
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>

            <View style={[styles.badgeCard, !hasStreakBadge && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>🔥</Text>
              <Text style={styles.badgeTitle}>{streakBadgeDays} Day</Text>
              <Text style={styles.badgeSub}>Streak</Text>
            </View>

            <View style={[styles.badgeCard, !hasTaskBadge && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>✅</Text>
              <Text style={styles.badgeTitle}>{taskBadgeCount} Tasks</Text>
              <Text style={styles.badgeSub}>Completed</Text>
            </View>

            <View style={[styles.badgeCard, !hasSavingsBadge && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>💰</Text>
              <Text style={styles.badgeTitle}>₹{savingsBadgeLabel}</Text>
              <Text style={styles.badgeSub}>Saved</Text>
            </View>

            <View style={[styles.badgeCard, productivityScore < 50 && styles.badgeLocked]}>
              <Text style={styles.badgeEmoji}>📚</Text>
              <Text style={styles.badgeTitle}>Consistent</Text>
              <Text style={styles.badgeSub}>Hero</Text>
            </View>

          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 20,
    position: 'relative',
  },
  logoutButtonTopRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logoutTextSmall: {
    color: '#E74C3C',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  avatarCard: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#E8E6FF',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quoteCard: {
    flexDirection: 'row',
    backgroundColor: '#E8E6FF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  quoteIcon: {
    marginRight: 12,
  },
  quoteText: {
    flex: 1,
    color: '#4B42B6',
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#555',
    marginLeft: 8,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  metricBig: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6C63FF',
    lineHeight: 36,
  },
  metricSub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginLeft: 4,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  barCol: {
    alignItems: 'center',
    width: 30,
  },
  barBg: {
    width: 14,
    height: 90,
    backgroundColor: '#F5F7FB',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  barLabelSelected: {
    color: '#6C63FF',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badgeCard: {
    width: (screenWidth - 56) / 2, // 2 columns
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  badgeLocked: {
    opacity: 0.4,
    backgroundColor: '#F8F9FA',
  },
  badgeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  badgeSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
});