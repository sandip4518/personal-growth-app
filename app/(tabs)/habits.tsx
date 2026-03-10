import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Habit {
  id: string;
  title: string;
  streak: number;
  completedDates: string[];
}

const HABITS_STORAGE_KEY = "HABITS_STORAGE";

const getWeekDays = () => {
  const currentDate = new Date();
  const currentDay = currentDate.getDay(); // 0 is Sunday, 1 is Monday...

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

const scheduleHabitNotifications = async (habits: Habit[]) => {
  // Clear existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Make sure we have permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const now = new Date();
  const currentHour = now.getHours();
  // 5 hours before end of day = 19:00 (7 PM)
  const NOTIFY_HOUR = 19;
  const todayStr = formatDate(now);

  const uncompletedHabits = habits.filter(
    (habit) => !habit.completedDates.includes(todayStr)
  );

  if (uncompletedHabits.length === 0) {
    // All habits completed, nothing to schedule!
    return;
  }

  const habitNames = uncompletedHabits.map((h) => h.title).join(", ");
  const atRiskCount = uncompletedHabits.length;

  const titleText = atRiskCount === 1
    ? "Streak at risk! 🔥"
    : `${atRiskCount} Streaks at risk! 🔥`;

  const bodyTextToday = atRiskCount === 1
    ? `Don't break your streak for "${habitNames}"! You have less than 5 hours left.`
    : `Don't break your streaks for: ${habitNames}! You have less than 5 hours left.`;

  // If it's before the target time, schedule for today
  if (currentHour < NOTIFY_HOUR) {
    const todayTrigger = new Date(now);
    todayTrigger.setHours(NOTIFY_HOUR, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titleText,
        body: bodyTextToday,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: todayTrigger
      } as Notifications.DateTriggerInput,
    });
  }

  // Also schedule a reminder for tomorrow just in case they don't open the app
  const tomorrowTrigger = new Date(now);
  tomorrowTrigger.setDate(tomorrowTrigger.getDate() + 1);
  tomorrowTrigger.setHours(NOTIFY_HOUR, 0, 0, 0);

  // For tomorrow's reminder, we assume they didn't complete them today
  const bodyTextTomorrow = atRiskCount === 1
    ? `Don't forget your habit "${habitNames}" today!`
    : `Don't forget your habits: ${habitNames} today!`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Habit Reminder 📅",
      body: bodyTextTomorrow,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrowTrigger
    } as Notifications.DateTriggerInput,
  });
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HabitHeatmap = ({ habits }: { habits: Habit[] }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = MONTH_NAMES[month];

  const blanks = Array.from({ length: firstDay }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const grid = [...blanks, ...days];
  const todayStr = formatDate(today);

  return (
    <View style={styles.heatmapCard}>
      <Text style={styles.heatmapTitle}>{monthName}</Text>
      <View style={styles.heatmapGrid}>
        {grid.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={styles.heatmapCellBlank} />;
          }
          const dateObj = new Date(year, month, day);
          const dateStr = formatDate(dateObj);
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          let count = 0;
          habits.forEach(h => {
            if (h.completedDates?.includes(dateStr)) count++;
          });

          let backgroundColor = "#E0E0E0"; // Missed day -> light gray
          if (isFuture) {
            backgroundColor = "#F5F5F5"; // Future day
          } else if (count > 0) {
            const activeHabits = habits.length;
            const intensity = activeHabits > 0 ? count / activeHabits : 0;
            if (intensity <= 0.33) backgroundColor = "#A7F3D0";
            else if (intensity <= 0.66) backgroundColor = "#34D399";
            else if (intensity < 1) backgroundColor = "#10B981";
            else backgroundColor = "#059669";
          }

          return (
            <View
              key={`day-${day}`}
              style={[
                styles.heatmapCell,
                { backgroundColor },
                isToday && styles.heatmapCellToday
              ]}
            >
              <Text style={[
                styles.heatmapCellText,
                isToday && styles.heatmapCellTextToday,
                count > 0 && styles.heatmapCellTextCompleted
              ]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isReady, setIsReady] = useState(false);

  const testNotification = async () => {
    const todayStr = formatDate(new Date());
    const uncompletedHabits = habits.filter(
      (habit) => !habit.completedDates.includes(todayStr)
    );

    let titleText = "Test Notification 🔔";
    let bodyText = "This is a test notification to verify it works!";

    if (uncompletedHabits.length > 0) {
      const habitNames = uncompletedHabits.map((h) => h.title).join(", ");
      const atRiskCount = uncompletedHabits.length;

      titleText = atRiskCount === 1
        ? "Test Streak at risk! 🔥"
        : `Test: ${atRiskCount} Streaks at risk! 🔥`;

      bodyText = atRiskCount === 1
        ? `Don't break your streak for "${habitNames}"!`
        : `Don't break your streaks for: ${habitNames}!`;
    } else {
      bodyText = "All habits completed today! Great job! 🎉";
    }

    const trigger = new Date(Date.now() + 2000); // 2 seconds from now
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titleText,
        body: bodyText,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger
      } as Notifications.DateTriggerInput,
    });
  };

  const weekDaysDates = getWeekDays();
  const todayIndex = new Date().getDay();

  // Load habits on mount
  useEffect(() => {
    const loadHabits = async () => {
      try {
        const storedHabits = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
        if (storedHabits) {
          const parsed = JSON.parse(storedHabits);
          // Migrate old habits format to new one if needed
          const migrated = parsed.map((h: any) => ({
            ...h,
            completedDates: h.completedDates || (h.completedToday ? [formatDate(new Date())] : []),
          }));
          setHabits(migrated);
        }
      } catch (error) {
        console.error("Failed to load habits from AsyncStorage:", error);
      } finally {
        setIsReady(true);
      }
    };
    loadHabits();
  }, []);

  // Save habits on change & update notifications
  useEffect(() => {
    const saveHabits = async () => {
      // Don't save before the initial load is complete
      if (!isReady) return;

      try {
        await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
        // Update notifications when habits change
        await scheduleHabitNotifications(habits);
      } catch (error) {
        console.error("Failed to save habits to AsyncStorage:", error);
      }
    };
    saveHabits();
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

    // Scroll to the new item with a slight delay to ensure it's rendered
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleComplete = (id: string, dateStr: string) => {
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
          }

          return {
            ...habit,
            completedDates: newCompletedDates,
            streak: newStreak,
          };
        }
        return habit;
      })
    );
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
  };

  const renderHabit = ({ item }: { item: Habit }) => (
    <View style={styles.habitCard}>
      <View style={styles.habitHeader}>
        <View style={styles.habitInfoContainer}>
          <Text style={styles.habitTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.streakText}>🔥 {item.streak}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButtonContainer}
          onPress={() => deleteHabit(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6347" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekContainer}>
        {weekDaysDates.map((date, index) => {
          const isToday = index === todayIndex;
          const isPast = index < todayIndex;
          const isFuture = index > todayIndex;
          const dateStr = formatDate(date);
          const isCompleted = item.completedDates?.includes(dateStr);
          const dayLetter = WEEK_DAYS[index];

          return (
            <View key={index} style={styles.dayWrapper}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {dayLetter}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dayCircle,
                  isCompleted && styles.dayCompleted,
                  !isCompleted && isToday && styles.dayToday,
                  !isCompleted && isPast && styles.dayPast,
                  !isCompleted && isFuture && styles.dayFuture,
                ]}
                disabled={!isToday}
                onPress={() => toggleComplete(item.id, dateStr)}
                activeOpacity={0.7}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                ) : isToday ? (
                  <View style={styles.todayInnerCircle} />
                ) : null}
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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Habits</Text>
            <Text style={styles.subtitle}>Track your daily habits</Text>
          </View>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        {/* Heatmap Section */}
        <HabitHeatmap habits={habits} />

        {/* Input Section */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter a new habit..."
            placeholderTextColor="#A0A0A0"
            value={newHabitTitle}
            onChangeText={setNewHabitTitle}
            onSubmitEditing={addHabit}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={addHabit}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Habit List Section */}
        <FlatList
          ref={flatListRef}
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderHabit}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="stats-chart-outline" size={48} color="#D3D3D3" />
              <Text style={styles.emptyText}>
                No habits yet. Add your first habit.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginTop: 4,
  },
  heatmapCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heatmapTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  heatmapCell: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  heatmapCellBlank: {
    width: 28,
    height: 28,
  },
  heatmapCellToday: {
    borderWidth: 2,
    borderColor: "#1A1A1A",
  },
  heatmapCellText: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
  },
  heatmapCellTextToday: {
    fontWeight: "800",
    color: "#1A1A1A",
  },
  heatmapCellTextCompleted: {
    color: "#105436",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF8C00",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  testButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1A1A1A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginRight: 12,
  },
  addButton: {
    width: 54,
    height: 54,
    backgroundColor: "#6C63FF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listContainer: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  habitCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  habitInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  habitTitle: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "600",
    marginRight: 8,
    maxWidth: "75%",
  },
  streakText: {
    fontSize: 14,
    color: "#FF8C00",
    fontWeight: "600",
  },
  deleteButtonContainer: {
    paddingLeft: 12,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  dayWrapper: {
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 12,
    color: "#A0A0A0",
    marginBottom: 8,
    fontWeight: "500",
  },
  dayLabelToday: {
    color: "#6C63FF",
    fontWeight: "700",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCompleted: {
    backgroundColor: "#6C63FF",
    borderWidth: 0,
  },
  dayToday: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#6C63FF",
  },
  dayPast: {
    backgroundColor: "#E0E0E0",
    borderWidth: 0,
  },
  dayFuture: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  todayInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#6C63FF",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#A0A0A0",
    textAlign: "center",
  },
});