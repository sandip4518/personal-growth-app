import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Subgoal {
    id: string;
    title: string;
    completed: boolean;
}

interface Goal {
    id: string;
    title: string;
    description: string;
    type: "habit" | "task" | "finance" | "custom";
    targetValue: number;
    currentValue: number;
    deadline: string;
    createdAt: string;
    completed: boolean;
    subgoals?: Subgoal[];
}

const GOALS_STORAGE = "GOALS_STORAGE";
const TASK_STORAGE_KEY = "tasks_storage";
const HABITS_STORAGE_KEY = "HABITS_STORAGE";
const FINANCE_STORAGE_KEY = "FINANCE_STORAGE";

export default function GoalsScreen() {
    const insets = useSafeAreaInsets();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [progressModalVisible, setProgressModalVisible] = useState(false);
    const [selectedCustomGoal, setSelectedCustomGoal] = useState<Goal | null>(null);
    const [customProgressInput, setCustomProgressInput] = useState("");
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<"habit" | "task" | "finance" | "custom">("habit");
    const [targetValue, setTargetValue] = useState("");
    const [deadline, setDeadline] = useState("");
    const [useSubgoals, setUseSubgoals] = useState(false);
    const [subgoals, setSubgoals] = useState<Subgoal[]>([]);
    const [newSubgoalTitle, setNewSubgoalTitle] = useState("");

    const loadData = async () => {
        try {
            const [storedGoals, storedTasks, storedHabits, storedFinance] =
                await Promise.all([
                    AsyncStorage.getItem(GOALS_STORAGE),
                    AsyncStorage.getItem(TASK_STORAGE_KEY),
                    AsyncStorage.getItem(HABITS_STORAGE_KEY),
                    AsyncStorage.getItem(FINANCE_STORAGE_KEY),
                ]);

            let currentGoals: Goal[] = storedGoals ? JSON.parse(storedGoals) : [];

            const tasks = storedTasks ? JSON.parse(storedTasks) : [];
            const habits = storedHabits ? JSON.parse(storedHabits) : [];
            const finance = storedFinance ? JSON.parse(storedFinance) : [];

            // Calculate totals
            const completedTasksCount = tasks.filter((t: any) => t.completed).length;
            let completedHabitsCount = 0;
            habits.forEach((h: any) => {
                if (h.completedDates) {
                    completedHabitsCount += h.completedDates.length;
                }
            });
            let income = 0;
            let expense = 0;
            finance.forEach((t: any) => {
                if (t.type === "income") income += t.amount;
                if (t.type === "expense") expense += t.amount;
            });
            const savings = Math.max(0, income - expense);

            let updated = false;

            // Update progress dynamically
            const newGoals = currentGoals.map((goal) => {
                if (goal.completed) return goal; // Already completed

                let newCurrentValue = goal.currentValue;

                if (goal.type === "habit") {
                    newCurrentValue = completedHabitsCount;
                } else if (goal.type === "task") {
                    newCurrentValue = completedTasksCount;
                } else if (goal.type === "finance") {
                    newCurrentValue = savings;
                } else if (goal.type === "custom" && goal.subgoals && goal.subgoals.length > 0) {
                    newCurrentValue = goal.subgoals.filter(sg => sg.completed).length;
                }

                if (newCurrentValue !== goal.currentValue) {
                    updated = true;
                    let completed = false;

                    if (newCurrentValue >= goal.targetValue) {
                        completed = true;
                        // Only alert if it's newly completing right now to avoid spam
                        if (!goal.completed) {
                            Alert.alert(
                                "🎉 Goal Completed!",
                                `Congratulations! You have completed your goal: ${goal.title}`
                            );
                        }
                    }
                    return { ...goal, currentValue: newCurrentValue, completed };
                }
                return goal;
            });

            setGoals(newGoals);
            if (updated) {
                await AsyncStorage.setItem(GOALS_STORAGE, JSON.stringify(newGoals));
            }
        } catch (error) {
            console.error("Failed to load goals data:", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const saveGoals = async (newGoals: Goal[]) => {
        try {
            await AsyncStorage.setItem(GOALS_STORAGE, JSON.stringify(newGoals));
            setGoals(newGoals);
        } catch (error) {
            console.error("Failed to save goals:", error);
        }
    };

    const openCreateModal = () => {
        setEditingGoalId(null);
        setTitle("");
        setDescription("");
        setType("habit");
        setTargetValue("");
        setDeadline("");
        setUseSubgoals(false);
        setSubgoals([]);
        setNewSubgoalTitle("");
        setModalVisible(true);
    };

    const openEditModal = (goal: Goal) => {
        setEditingGoalId(goal.id);
        setTitle(goal.title);
        setDescription(goal.description || "");
        setType(goal.type);
        setTargetValue(goal.targetValue.toString());
        setDeadline(goal.deadline);
        setUseSubgoals(!!goal.subgoals && goal.subgoals.length > 0);
        setSubgoals(goal.subgoals || []);
        setNewSubgoalTitle("");
        setModalVisible(true);
    };

    const handleAddSubgoalForm = () => {
        if (!newSubgoalTitle.trim()) return;
        setSubgoals([...subgoals, { id: Date.now().toString(), title: newSubgoalTitle.trim(), completed: false }]);
        setNewSubgoalTitle("");
    };

    const handleRemoveSubgoalForm = (id: string) => {
        setSubgoals(subgoals.filter(sg => sg.id !== id));
    };

    const handleSaveGoal = () => {
        if (!title.trim() || !deadline.trim()) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        let tVal = 0;

        if (type === "custom" && useSubgoals) {
            if (subgoals.length === 0) {
                Alert.alert("Error", "Please add at least one subgoal.");
                return;
            }
            tVal = subgoals.length;
        } else {
            tVal = parseFloat(targetValue);
            if (isNaN(tVal) || tVal <= 0) {
                Alert.alert("Error", "Target value must be a valid number greater than 0.");
                return;
            }
        }

        let updatedGoals = [...goals];

        if (editingGoalId) {
            updatedGoals = updatedGoals.map(g => {
                if (g.id === editingGoalId) {
                    return {
                        ...g,
                        title: title.trim(),
                        description: description.trim(),
                        type: type,
                        targetValue: tVal,
                        deadline: deadline.trim(),
                        subgoals: type === "custom" && useSubgoals ? subgoals : undefined
                    };
                }
                return g;
            });
        } else {
            const newGoal: Goal = {
                id: Date.now().toString(),
                title: title.trim(),
                description: description.trim(),
                type: type,
                targetValue: tVal,
                currentValue: type === "custom" && useSubgoals ? subgoals.filter(sg => sg.completed).length : 0,
                deadline: deadline.trim(),
                createdAt: new Date().toISOString(),
                completed: false,
                subgoals: type === "custom" && useSubgoals ? subgoals : undefined
            };
            updatedGoals = [newGoal, ...goals];
        }

        saveGoals(updatedGoals);
        setModalVisible(false);
        setEditingGoalId(null);

        // Recalculate based on current state
        loadData();
    };

    const handleDeleteGoal = (id: string) => {
        Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    const updatedGoals = goals.filter((g) => g.id !== id);
                    saveGoals(updatedGoals);
                },
            },
        ]);
    };

    const handleUpdateCustomProgress = () => {
        if (!selectedCustomGoal) return;

        const increment = parseFloat(customProgressInput);
        if (isNaN(increment) || increment <= 0) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }

        const newCurrentValue = selectedCustomGoal.currentValue + increment;
        let completed = false;

        if (newCurrentValue >= selectedCustomGoal.targetValue) {
            completed = true;
            Alert.alert(
                "🎉 Goal Completed!",
                `Congratulations! You have completed your goal: ${selectedCustomGoal.title}`
            );
        }

        const updatedGoals = goals.map((g) => {
            if (g.id === selectedCustomGoal.id) {
                return { ...g, currentValue: newCurrentValue, completed };
            }
            return g;
        });

        saveGoals(updatedGoals);
        setProgressModalVisible(false);
        setSelectedCustomGoal(null);
        setCustomProgressInput("");
    };

    const openCustomProgressModal = (goal: Goal) => {
        setSelectedCustomGoal(goal);
        setProgressModalVisible(true);
    };

    const toggleSubgoalCompleted = (goalId: string, subgoalId: string) => {
        let updated = false;

        const updatedGoals = goals.map(goal => {
            if (goal.id === goalId && goal.subgoals) {
                const subgoals = goal.subgoals.map(sg => {
                    if (sg.id === subgoalId) {
                        return { ...sg, completed: !sg.completed };
                    }
                    return sg;
                });

                const newCurrentValue = subgoals.filter(sg => sg.completed).length;
                let completed = false;

                if (newCurrentValue >= goal.targetValue) {
                    completed = true;
                }

                updated = true;
                return { ...goal, subgoals, currentValue: newCurrentValue, completed };
            }
            return goal;
        });

        if (updated) {
            const modifiedGoal = updatedGoals.find(g => g.id === goalId);
            if (modifiedGoal && modifiedGoal.completed) {
                Alert.alert(
                    "🎉 Goal Completed!",
                    `Congratulations! You have completed your goal: ${modifiedGoal.title}`
                );
            }
            saveGoals(updatedGoals);
            // Recalculate
            loadData();
        }
    };

    const getMotivationalMessage = (percentage: number) => {
        if (percentage >= 100) return "🎉 Goal Completed!";
        if (percentage >= 75) return "Almost there!";
        if (percentage >= 50) return "Great consistency!";
        if (percentage >= 25) return "You're making progress!";
        return "Let's get started!";
    };

    const renderGoal = ({ item }: { item: Goal }) => {
        const rawProgress = (item.currentValue / item.targetValue) * 100;
        const progress = Math.min(100, Math.max(0, rawProgress));
        const motivationalMessage = getMotivationalMessage(progress);

        // Using blocks to simulate terminal-like bar for text display
        const filledBlocks = Math.round(progress / 10);
        const emptyBlocks = 10 - filledBlocks;
        const barText = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

        const formatValue = (val: number, type: string) => {
            if (type === "finance") return `₹${val.toLocaleString("en-IN")}`;
            return val.toString();
        };

        return (
            <View style={styles.goalCard}>
                <View style={styles.goalHeader}>
                    <View style={styles.titleRow}>
                        <Text style={styles.goalTitle}>{item.title}</Text>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{item.type}</Text>
                        </View>
                    </View>
                    <View style={styles.actionRow}>
                        {item.type === "custom" && (!item.subgoals || item.subgoals.length === 0) && !item.completed && (
                            <TouchableOpacity
                                style={styles.actionIcon}
                                onPress={() => openCustomProgressModal(item)}
                            >
                                <Ionicons name="add-circle-outline" size={24} color="#6C63FF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={() => openEditModal(item)}
                        >
                            <Ionicons name="pencil-outline" size={22} color="#6C63FF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={() => handleDeleteGoal(item.id)}
                        >
                            <Ionicons name="trash-outline" size={22} color="#FF6347" />
                        </TouchableOpacity>
                    </View>
                </View>

                {item.description ? (
                    <Text style={styles.goalDesc}>{item.description}</Text>
                ) : null}

                {item.subgoals && item.subgoals.length > 0 && (
                    <View style={styles.subgoalsCardContainer}>
                        {item.subgoals.map(sg => (
                            <TouchableOpacity
                                key={sg.id}
                                style={styles.subgoalRowCard}
                                onPress={() => toggleSubgoalCompleted(item.id, sg.id)}
                            >
                                <Ionicons
                                    name={sg.completed ? "checkmark-circle" : "ellipse-outline"}
                                    size={22}
                                    color={sg.completed ? "#2ECC71" : "#C0C0C0"}
                                />
                                <Text style={[styles.subgoalTitleCard, sg.completed && styles.subgoalCompletedCard]}>
                                    {sg.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.progressContainer}>
                    <Text style={styles.barTextMode}>
                        {barText} {progress.toFixed(0)}%
                    </Text>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress}%`, backgroundColor: progress >= 100 ? "#2ECC71" : "#6C63FF" },
                            ]}
                        />
                    </View>
                    <Text style={styles.motivationalText}>{motivationalMessage}</Text>
                </View>

                <View style={styles.goalFooter}>
                    <Text style={styles.progressText}>
                        {formatValue(item.currentValue, item.type)} / {formatValue(item.targetValue, item.type)}
                    </Text>
                    <Text style={styles.deadlineText}>Deadline: {item.deadline}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <FlatList
                data={goals}
                keyExtractor={(item) => item.id}
                renderItem={renderGoal}
                contentContainerStyle={styles.container}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Goals</Text>
                                <Text style={styles.subtitle}>Track your long-term achievements</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.addButtonCircle}
                                onPress={openCreateModal}
                            >
                                <Ionicons name="add" size={28} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="flag-outline" size={48} color="#D3D3D3" />
                        <Text style={styles.emptyText}>No goals yet. Set a new goal!</Text>
                    </View>
                }
            />

            {/* Add Goal Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingGoalId ? "Edit Goal" : "Create New Goal"}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Goal Title"
                            placeholderTextColor="#999"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Description (Optional)"
                            placeholderTextColor="#999"
                            value={description}
                            onChangeText={setDescription}
                        />

                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={type}
                                onValueChange={(itemValue) => setType(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Habit Tracker" value="habit" />
                                <Picker.Item label="Task Master" value="task" />
                                <Picker.Item label="Finance Savings" value="finance" />
                                <Picker.Item label="Custom Goal" value="custom" />
                            </Picker>
                        </View>

                        {type === "custom" && (
                            <View style={styles.subgoalToggleContainer}>
                                <Text style={styles.subgoalToggleLabel}>Use Subgoals (Checklist)</Text>
                                <TouchableOpacity
                                    style={[styles.toggleSwitch, useSubgoals && styles.toggleSwitchActive]}
                                    onPress={() => setUseSubgoals(!useSubgoals)}
                                >
                                    <View style={[styles.toggleKnob, useSubgoals && styles.toggleKnobActive]} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {type === "custom" && useSubgoals ? (
                            <View style={styles.subgoalsFormContainer}>
                                <View style={styles.subgoalInputRow}>
                                    <TextInput
                                        style={[styles.input, styles.subgoalInput]}
                                        placeholder="Add a step..."
                                        placeholderTextColor="#999"
                                        value={newSubgoalTitle}
                                        onChangeText={setNewSubgoalTitle}
                                        onSubmitEditing={handleAddSubgoalForm}
                                    />
                                    <TouchableOpacity style={styles.addSubgoalBtn} onPress={handleAddSubgoalForm}>
                                        <Ionicons name="add" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                {subgoals.length > 0 && (
                                    <View style={styles.subgoalsListForm}>
                                        {subgoals.map((sg, idx) => (
                                            <View key={sg.id} style={styles.subgoalItemForm}>
                                                <Text style={styles.subgoalItemTextForm}>{idx + 1}. {sg.title}</Text>
                                                <TouchableOpacity onPress={() => handleRemoveSubgoalForm(sg.id)}>
                                                    <Ionicons name="close-circle" size={20} color="#FF6347" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <>
                                {type === "custom" && (
                                    <Text style={styles.inputHint}>
                                        E.g., 100 (hours), 150 (problems), or 1 (done/not done).
                                    </Text>
                                )}
                                <TextInput
                                    style={styles.input}
                                    placeholder={type === "custom" ? "Target Metric (e.g. 100)" : "Target Value (e.g. 100000)"}
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    value={targetValue}
                                    onChangeText={setTargetValue}
                                />
                            </>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="Deadline (e.g. Dec 2025)"
                            placeholderTextColor="#999"
                            value={deadline}
                            onChangeText={setDeadline}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.submitBtn]}
                                onPress={handleSaveGoal}
                            >
                                <Text style={styles.submitBtnText}>{editingGoalId ? "Save Changes" : "Create Goal"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Update Custom Progress Modal */}
            <Modal visible={progressModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Progress</Text>
                        <Text style={styles.modalSub}>
                            {selectedCustomGoal?.title}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Amount to add (e.g. 5)"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={customProgressInput}
                            onChangeText={setCustomProgressInput}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setProgressModalVisible(false);
                                    setCustomProgressInput("");
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.submitBtn]}
                                onPress={handleUpdateCustomProgress}
                            >
                                <Text style={styles.submitBtnText}>Add Progress</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F5F7FB",
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    addButtonCircle: {
        width: 50,
        height: 50,
        backgroundColor: "#6C63FF",
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#6C63FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    goalCard: {
        backgroundColor: "#FFFFFF",
        padding: 18,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    goalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    titleRow: {
        flex: 1,
    },
    goalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    typeBadge: {
        backgroundColor: "#E8E6FF",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeBadgeText: {
        color: "#6C63FF",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionIcon: {
        marginLeft: 12,
    },
    goalDesc: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
    },
    progressContainer: {
        marginVertical: 12,
    },
    barTextMode: {
        fontFamily: "monospace",
        fontSize: 14,
        color: "#6C63FF",
        marginBottom: 6,
        letterSpacing: 2,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: "#F0F0F0",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 6,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    motivationalText: {
        fontSize: 13,
        color: "#FF8C00",
        fontWeight: "600",
        fontStyle: "italic",
    },
    goalFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F5F7FB",
    },
    progressText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#333",
    },
    deadlineText: {
        fontSize: 13,
        color: "#888",
        fontWeight: "500",
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#1A1A1A",
        marginBottom: 8,
    },
    modalSub: {
        fontSize: 16,
        color: "#666",
        marginBottom: 20,
    },
    input: {
        backgroundColor: "#F5F7FB",
        height: 54,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: "#333",
        marginBottom: 16,
    },
    inputHint: {
        fontSize: 12,
        color: "#888",
        marginLeft: 4,
        marginBottom: 8,
        marginTop: -10,
    },
    pickerContainer: {
        backgroundColor: "#F5F7FB",
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
    },
    picker: {
        height: 54,
        width: "100%",
    },
    subgoalToggleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F5F7FB",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    subgoalToggleLabel: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
    },
    toggleSwitch: {
        width: 44,
        height: 24,
        backgroundColor: "#D3D3D3",
        borderRadius: 12,
        padding: 2,
    },
    toggleSwitchActive: {
        backgroundColor: "#6C63FF",
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#FFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleKnobActive: {
        transform: [{ translateX: 20 }],
    },
    subgoalsFormContainer: {
        marginBottom: 16,
    },
    subgoalInputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    subgoalInput: {
        flex: 1,
        marginBottom: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    addSubgoalBtn: {
        backgroundColor: "#6C63FF",
        height: 54,
        paddingHorizontal: 16,
        justifyContent: "center",
        alignItems: "center",
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    subgoalsListForm: {
        marginTop: 12,
        backgroundColor: "#F5F7FB",
        borderRadius: 12,
        padding: 12,
    },
    subgoalItemForm: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E0E0E0",
    },
    subgoalItemTextForm: {
        fontSize: 14,
        color: "#333",
        flex: 1,
    },
    subgoalsCardContainer: {
        marginTop: 4,
        marginBottom: 12,
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        padding: 12,
    },
    subgoalRowCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
    },
    subgoalTitleCard: {
        fontSize: 15,
        color: "#333",
        marginLeft: 12,
        flex: 1,
    },
    subgoalCompletedCard: {
        color: "#A0A0A0",
        textDecorationLine: "line-through",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    modalBtn: {
        flex: 1,
        height: 54,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelBtn: {
        backgroundColor: "#F5F7FB",
        marginRight: 8,
    },
    cancelBtnText: {
        color: "#666",
        fontSize: 16,
        fontWeight: "600",
    },
    submitBtn: {
        backgroundColor: "#6C63FF",
        marginLeft: 8,
    },
    submitBtnText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
