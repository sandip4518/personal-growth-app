import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const TASK_STORAGE_KEY = "tasks_storage";
const FOCUS_SESSIONS_STORAGE_KEY = "focus_sessions_storage";
const FOCUS_DATE_STORAGE_KEY = "focus_date_storage";

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
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
        const storedDate = await AsyncStorage.getItem(FOCUS_DATE_STORAGE_KEY);
        const today = new Date().toDateString();

        if (storedDate === today) {
          const storedSessions = await AsyncStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY);
          if (storedSessions) {
            setFocusSessionsToday(parseInt(storedSessions, 10));
          }
        } else {
          await AsyncStorage.setItem(FOCUS_DATE_STORAGE_KEY, today);
          await AsyncStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, "0");
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
    Alert.alert("Focus session complete!");
    try {
      const newCount = focusSessionsToday + 1;
      setFocusSessionsToday(newCount);
      await AsyncStorage.setItem(FOCUS_SESSIONS_STORAGE_KEY, newCount.toString());
      const today = new Date().toDateString();
      await AsyncStorage.setItem(FOCUS_DATE_STORAGE_KEY, today);
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
        const storedTasks = await AsyncStorage.getItem(TASK_STORAGE_KEY);
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
      // Don't save before the initial load is complete
      if (!isReady) return;

      try {
        await AsyncStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
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
    };

    setTasks((prevTasks) => [...prevTasks, newTask]);
    setNewTaskTitle("");

    // Scroll to the new item with a slight delay to ensure it's rendered
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleComplete = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
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
          color={item.completed ? "#6C63FF" : "#C0C0C0"}
        />
      </TouchableOpacity>

      <Text
        style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}
        numberOfLines={2}
      >
        {item.title}
      </Text>

      <TouchableOpacity
        style={styles.deleteButtonContainer}
        onPress={() => deleteTask(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={22} color="#FF6347" />
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
          data={tasks}
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
    backgroundColor: "#F5F7FB",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
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
  focusContainer: {
    backgroundColor: "#FFFFFF",
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
    color: "#1A1A1A",
    marginBottom: 12,
  },
  focusTimer: {
    fontSize: 48,
    fontWeight: "800",
    color: "#6C63FF",
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
    backgroundColor: "#6C63FF",
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
    color: "#666666",
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  taskTitleCompleted: {
    color: "#A0A0A0",
    textDecorationLine: "line-through",
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