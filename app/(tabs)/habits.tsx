import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Habit, STORAGE_KEYS, THEME } from "../../constants/types";
import { useGrowthData } from "../../hooks/useGrowthData";

const getWeekDays = () => {
  const currentDate = new Date();
  const currentDay = currentDate.getDay();
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() - currentDay + i);
    weekDays.push(d);
  }
  return weekDays;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isReady, setIsReady] = useState(false);
  const { metrics } = useGrowthData();

  const weekDaysDates = getWeekDays();
  const todayIndex = new Date().getDay();

  useEffect(() => {
    const loadHabits = async () => {
      try {
        const storedHabits = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
        if (storedHabits) {
          setHabits(JSON.parse(storedHabits));
        }
      } catch (error) {
        console.error("Failed to load habits:", error);
      } finally {
        setIsReady(true);
      }
    };
    loadHabits();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
  }, [habits, isReady]);

  const addHabit = () => {
    if (newHabitTitle.trim() === "") return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      title: newHabitTitle.trim(),
      streak: 0,
      completedDates: [],
    };
    setHabits((prev) => [...prev, newHabit]);
    setNewHabitTitle("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const toggleComplete = (id: string, dateStr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id === id) {
          const isCompleted = habit.completedDates.includes(dateStr);
          let newCompletedDates = [...habit.completedDates];
          let newStreak = habit.streak;

          if (isCompleted) {
            newCompletedDates = newCompletedDates.filter((d) => d !== dateStr);
            newStreak = Math.max(0, newStreak - 1);
          } else {
            newCompletedDates.push(dateStr);
            newStreak += 1;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          return { ...habit, completedDates: newCompletedDates, streak: newStreak };
        }
        return habit;
      })
    );
  };

  const deleteHabit = (id: string) => {
    Alert.alert("Delete Habit", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => setHabits(prev => prev.filter(h => h.id !== id)) }
    ]);
  };

  const renderHabit = ({ item }: { item: Habit }) => (
    <View style={styles.habitCard}>
      <View style={styles.habitHeader}>
        <View style={styles.habitInfo}>
          <Text style={styles.habitTitle}>{item.title}</Text>
          <Text style={styles.streakText}>🔥 {item.streak} day streak</Text>
        </View>
        <TouchableOpacity onPress={() => deleteHabit(item.id)}>
          <Ionicons name="trash-outline" size={20} color={THEME.colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekContainer}>
        {weekDaysDates.map((date, index) => {
          const dateStr = formatDate(date);
          const isCompleted = item.completedDates.includes(dateStr);
          const isToday = index === todayIndex;

          return (
            <View key={index} style={styles.dayCol}>
              <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>{WEEK_DAYS[index]}</Text>
              <TouchableOpacity
                onPress={() => toggleComplete(item.id, dateStr)}
                style={[
                  styles.dayCircle,
                  isCompleted ? styles.completedCircle : (isToday ? styles.todayCircle : styles.emptyCircle)
                ]}
              >
                {isCompleted && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.container}>

        {/* Standardized Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.greeting}>Habits 🌱</Text>
            <View style={styles.titleBadgeContainer}>
              <Text style={styles.titleBadgeText}>{metrics?.userTitle || "Growth Seeker"}</Text>
            </View>
          </View>
          <View style={styles.lvlBadge}>
            <Text style={styles.lvlText}>LVL {metrics?.level || 1}</Text>
          </View>
        </View>

        {/* Level Progress Bar */}
        <View style={styles.levelProgressContainer}>
          <View style={styles.levelInfoRow}>
            <Text style={styles.levelTitle}>{metrics?.levelTitle || "Growth Seeker"}</Text>
            <Text style={styles.xpText}>{metrics?.xp || 0} XP</Text>
          </View>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${(metrics?.xp || 0) % 100}%` }]} />
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="New habit..."
              placeholderTextColor="#A0A0A0"
              value={newHabitTitle}
              onChangeText={setNewHabitTitle}
              onSubmitEditing={addHabit}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addHabit} activeOpacity={0.8}>
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderHabit}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Small steps lead to big changes.</Text>
            </View>
          }
        />
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: THEME.colors.text },
  lvlBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lvlText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  levelProgressContainer: { marginBottom: 24 },
  levelInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text },
  xpText: { fontSize: 14, color: THEME.colors.primary, fontWeight: "600" },
  levelBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  levelBarFill: { height: "100%", backgroundColor: THEME.colors.primary },
  titleBadgeContainer: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  titleBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  inputCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFC",
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: THEME.colors.text,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    marginRight: 10,
  },
  addBtn: {
    width: 50,
    height: 50,
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  list: { paddingBottom: 40 },
  habitCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: 18, fontWeight: "800", color: THEME.colors.text },
  streakText: { fontSize: 13, color: "#FF8C00", fontWeight: "700", marginTop: 2 },
  weekContainer: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center" },
  dayLabel: {
    fontSize: 12,
    color: THEME.colors.textLight,
    marginBottom: 8,
    fontWeight: "600",
  },
  todayLabel: { color: THEME.colors.primary, fontWeight: "900" },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCircle: { backgroundColor: "#F3F4F6" },
  todayCircle: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  completedCircle: { backgroundColor: THEME.colors.primary },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: {
    color: THEME.colors.textLight,
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
});
