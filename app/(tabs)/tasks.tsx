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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STORAGE_KEYS, Task, THEME } from "../../constants/types";
import { useGrowthData } from "../../hooks/useGrowthData";

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const flatListRef = useRef<FlatList>(null);
  const [isReady, setIsReady] = useState(false);
  const { metrics, data: growthData } = useGrowthData();

  // Focus Timer State
  const FOCUS_DURATION = 25 * 60;
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [focusSessionsToday, setFocusSessionsToday] = useState(0);

  // Load Focus Sessions
  useEffect(() => {
    const loadFocusData = async () => {
      try {
        const storedDate = await AsyncStorage.getItem("focus_date_storage");
        const today = new Date().toDateString();

        if (storedDate === today) {
          const storedSessions = await AsyncStorage.getItem("focus_sessions_storage");
          if (storedSessions) {
            setFocusSessionsToday(parseInt(storedSessions, 10));
          }
        } else {
          await AsyncStorage.setItem("focus_date_storage", today);
          await AsyncStorage.setItem("focus_sessions_storage", "0");
        }
      } catch (error) {
        console.error("Failed to load focus data:", error);
      }
    };
    loadFocusData();
  }, []);

  // Focus Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      setTimeLeft(FOCUS_DURATION);
      handleFocusComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const handleFocusComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Focus session complete!");
    try {
      const newCount = focusSessionsToday + 1;
      setFocusSessionsToday(newCount);
      await AsyncStorage.setItem("focus_sessions_storage", newCount.toString());
      const today = new Date().toDateString();
      await AsyncStorage.setItem("focus_date_storage", today);
    } catch (error) {
      console.error("Failed to save focus data:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Load tasks on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
        if (storedTasks) {
          const parsed = JSON.parse(storedTasks);
          if (parsed) setTasks(parsed);
        }
      } catch (error) {
        console.error("Failed to load tasks from AsyncStorage:", error);
      } finally {
        setIsReady(true);
      }
    };
    loadTasks();
  }, []);

  // Save tasks on change
  useEffect(() => {
    const saveTasks = async () => {
      if (!isReady) return;
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      } catch (error) {
        console.error("Failed to save tasks to AsyncStorage:", error);
      }
    };
    saveTasks();
  }, [tasks, isReady]);

  const addTask = () => {
    if (newTaskTitle.trim() === "") return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
    };

    setTasks((prevTasks) => [...prevTasks, newTask]);
    setNewTaskTitle("");
    setNewTaskPriority("medium");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleComplete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id
          ? {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : undefined
          }
          : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity
        style={styles.taskStatusContainer}
        onPress={() => toggleComplete(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.completed ? "checkmark-circle" : "ellipse-outline"}
          size={26}
          color={item.completed ? THEME.colors.primary : "#C0C0C0"}
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text
          style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <View style={styles.taskFooter}>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: item.priority === "high" ? "#FFE5E5" : item.priority === "medium" ? "#FFF4E5" : "#E5F4FF" }
          ]}>
            <Text style={[
              styles.priorityText,
              { color: item.priority === "high" ? "#FF5252" : item.priority === "medium" ? "#FF8C00" : "#2196F3" }
            ]}>
              {item.priority?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButtonContainer}
        onPress={() => deleteTask(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={22} color={THEME.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        {/* Standardized Tasks Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.greeting}>Tasks 📝</Text>
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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter a new task..."
              placeholderTextColor="#A0A0A0"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={addTask}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={addTask}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.prioritySelector}>
            <Text style={styles.selectorLabel}>Priority:</Text>
            {(["low", "medium", "high"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityOption,
                  newTaskPriority === p && styles.priorityOptionSelected,
                  newTaskPriority === p && { borderColor: p === "high" ? "#FF5252" : p === "medium" ? "#FF8C00" : "#2196F3" }
                ]}
                onPress={() => setNewTaskPriority(p)}
              >
                <Text style={[
                  styles.priorityOptionText,
                  newTaskPriority === p && { color: p === "high" ? "#FF5252" : p === "medium" ? "#FF8C00" : "#2196F3", fontWeight: "bold" }
                ]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Focus Mode Section — Compact */}
        <View style={styles.focusContainer}>
          <View style={styles.focusLeft}>
            <View style={styles.focusTitleRow}>
              <Ionicons name="flame" size={16} color="#FF9F43" />
              <Text style={styles.focusTitle}>Focus Mode</Text>
            </View>
            <View style={styles.focusTimerRow}>
              <View style={[styles.focusTimerRing, isActive && styles.focusTimerRingActive]}>
                <Text style={styles.focusTimer}>{formatTime(timeLeft)}</Text>
              </View>
              <View style={styles.focusControls}>
                <TouchableOpacity
                  style={[styles.focusIconBtn, isActive ? styles.focusIconBtnPause : styles.focusIconBtnStart]}
                  onPress={() => setIsActive(!isActive)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isActive ? "pause" : "play"} size={18} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.focusIconBtn, styles.focusIconBtnReset]}
                  onPress={() => {
                    setIsActive(false);
                    setTimeLeft(FOCUS_DURATION);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.focusRight}>
            <View style={styles.focusSessionBadge}>
              <Ionicons name="checkmark-circle" size={14} color={THEME.colors.secondary} />
              <Text style={styles.focusSessionCount}>{focusSessionsToday}</Text>
            </View>
            <Text style={styles.focusSessionLabel}>sessions</Text>
          </View>
        </View>

        {/* Task List Section */}
        <FlatList
          ref={flatListRef}
          data={[...tasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pMap = { high: 0, medium: 1, low: 2 };
            return pMap[a.priority || "medium"] - pMap[b.priority || "medium"];
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color="#D3D3D3" />
              <Text style={styles.emptyText}>No tasks yet. Add one above!</Text>
            </View>
          }
        />
      </View>
    </View>
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
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
  addButton: {
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
  prioritySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textLight,
    marginRight: 10,
  },
  priorityOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  priorityOptionSelected: { backgroundColor: "#FFF", borderWidth: 2 },
  priorityOptionText: {
    fontSize: 12,
    color: THEME.colors.textLight,
    fontWeight: "600",
  },
  focusContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 14,
    paddingHorizontal: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  focusLeft: { flex: 1 },
  focusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  focusTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D1D5DB",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  focusTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  focusTimerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  focusTimerRingActive: {
    borderColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  focusTimer: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    fontVariant: ["tabular-nums"],
  },
  focusControls: { flexDirection: "row", gap: 8 },
  focusIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  focusIconBtnStart: { backgroundColor: THEME.colors.primary },
  focusIconBtnPause: { backgroundColor: "#FF9F43" },
  focusIconBtnReset: { backgroundColor: "#374151" },
  focusRight: {
    alignItems: "center",
    marginLeft: 14,
  },
  focusSessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,201,167,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  focusSessionCount: {
    fontSize: 16,
    fontWeight: "900",
    color: THEME.colors.secondary,
  },
  focusSessionLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 3,
  },
  listContainer: { paddingBottom: 40 },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    padding: 20,
    borderRadius: 28,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  taskStatusContainer: { marginRight: 16 },
  taskTitle: { fontSize: 17, color: THEME.colors.text, fontWeight: "700" },
  taskTitleCompleted: { color: "#A0A0A0", textDecorationLine: "line-through" },
  taskFooter: { marginTop: 8, flexDirection: "row" },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: "900" },
  deleteButtonContainer: { paddingLeft: 16 },
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
    fontWeight: "600",
  },
});
