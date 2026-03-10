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
        <Text style={styles.title}>Habits</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="New habit..."
            value={newHabitTitle}
            onChangeText={setNewHabitTitle}
            onSubmitEditing={addHabit}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addHabit}>
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderHabit}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Small steps lead to big changes.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.colors.background },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 32, fontWeight: "800", color: THEME.colors.text, marginBottom: 20 },
  inputRow: { flexDirection: "row", marginBottom: 24 },
  input: { flex: 1, backgroundColor: "#FFF", height: 50, borderRadius: 12, paddingHorizontal: 16, marginRight: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  addBtn: { width: 50, height: 50, backgroundColor: THEME.colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 40 },
  habitCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  habitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text },
  streakText: { fontSize: 13, color: "#FF8C00", fontWeight: "600", marginTop: 2 },
  weekContainer: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center" },
  dayLabel: { fontSize: 12, color: THEME.colors.textLight, marginBottom: 8, fontWeight: "600" },
  todayLabel: { color: THEME.colors.primary, fontWeight: "800" },
  dayCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  emptyCircle: { backgroundColor: "#F3F4F6" },
  todayCircle: { backgroundColor: "#FFF", borderWidth: 2, borderColor: THEME.colors.primary },
  completedCircle: { backgroundColor: THEME.colors.primary },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { color: THEME.colors.textLight, marginTop: 12, fontSize: 16 },
});