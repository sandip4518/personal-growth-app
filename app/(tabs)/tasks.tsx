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

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const flatListRef = useRef<FlatList>(null);
  const [isReady, setIsReady] = useState(false);

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
          setTasks(JSON.parse(storedTasks));
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
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>Manage your daily tasks</Text>
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

        {/* Focus Mode Section */}
        <View style={styles.focusContainer}>
          <Text style={styles.focusTitle}>Focus Mode</Text>
          <Text style={styles.focusTimer}>{formatTime(timeLeft)}</Text>
          <View style={styles.focusButtons}>
            <TouchableOpacity
              style={[styles.focusButton, isActive ? styles.focusButtonPause : styles.focusButtonStart]}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.focusButtonText}>{isActive ? "Pause" : "Start"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.focusButton, styles.focusButtonReset]}
              onPress={() => {
                setIsActive(false);
                setTimeLeft(FOCUS_DURATION);
              }}
            >
              <Text style={[styles.focusButtonText, { color: "#1A1A1A" }]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.focusSessionsText}>Focus Sessions Today: {focusSessionsToday}</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textLight,
    marginTop: 4,
  },
  inputCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#F9FAFC",
    height: 50,
    borderRadius: 12,
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
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
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
    fontWeight: "600",
    color: THEME.colors.textLight,
    marginRight: 10,
  },
  priorityOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "#F5F7FB",
  },
  priorityOptionSelected: {
    backgroundColor: "#FFFFFF",
  },
  priorityOptionText: {
    fontSize: 12,
    color: THEME.colors.textLight,
  },
  focusContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: 12,
  },
  focusTimer: {
    fontSize: 48,
    fontWeight: "800",
    color: THEME.colors.primary,
    marginBottom: 20,
    fontVariant: ["tabular-nums"],
  },
  focusButtons: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  focusButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  focusButtonStart: {
    backgroundColor: THEME.colors.primary,
  },
  focusButtonPause: {
    backgroundColor: "#FF9F43",
  },
  focusButtonReset: {
    backgroundColor: "#F5F7FB",
  },
  focusButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  focusSessionsText: {
    fontSize: 14,
    color: THEME.colors.textLight,
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  taskStatusContainer: {
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    color: THEME.colors.text,
    fontWeight: "600",
  },
  taskTitleCompleted: {
    color: "#A0A0A0",
    textDecorationLine: "line-through",
  },
  taskFooter: {
    marginTop: 6,
    flexDirection: "row",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800",
  },
  deleteButtonContainer: {
    paddingLeft: 12,
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