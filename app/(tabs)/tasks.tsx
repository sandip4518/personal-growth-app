import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
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

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isReady, setIsReady] = useState(false);

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