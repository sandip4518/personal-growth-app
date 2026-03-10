import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "../../constants/types";
import { useGrowthData } from "../../hooks/useGrowthData";

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
    const { metrics } = useGrowthData();
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
        if (percentage >= 50) return "Great consistency.";
        if (percentage >= 25) return "You're building momentum.";
        return "Let's begin!";
    };

    const calculatePlanningBreakdown = (targetValue: number, deadline: string) => {
        if (!targetValue || isNaN(targetValue)) return null;

        const deadlineMatch = deadline.toLowerCase().match(/(\d+)\s*(month|week|day)s?/);
        let totalDays = 0;

        if (deadlineMatch) {
            const val = parseInt(deadlineMatch[1]);
            const unit = deadlineMatch[2];
            if (unit === "month") totalDays = val * 30;
            else if (unit === "week") totalDays = val * 7;
            else if (unit === "day") totalDays = val;
        } else {
            // Try to parse as a date or relative time? 
            // For now, if it's just a number, assume days.
            const val = parseInt(deadline);
            if (!isNaN(val)) totalDays = val;
            else return null; // Can't parse
        }

        if (totalDays <= 0) return null;

        const monthly = totalDays >= 30 ? Math.ceil((targetValue / (totalDays / 30)) / 50) * 50 : null;
        const weekly = totalDays >= 7 ? Math.ceil((targetValue / (totalDays / 7)) / 10) * 10 : null;
        const daily = Math.ceil((targetValue / totalDays) / 5) * 5;

        return { monthly, weekly, daily };
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
                        <View style={[
                            styles.progressBarFill,
                            { width: `${progress}%`, backgroundColor: progress >= 100 ? "#2ECC71" : "#6C63FF" },
                        ]}
                        />
                    </View>
                    <Text style={styles.motivationalText}>{motivationalMessage}</Text>
                </View>

                {item.targetValue > 0 && !item.completed && (
                    <View style={styles.planningBreakdown}>
                        <Text style={styles.planningTitle}>Smart Planning Breakdown</Text>
                        {(() => {
                            const breakdown = calculatePlanningBreakdown(item.targetValue, item.deadline);
                            if (!breakdown) return <Text style={styles.planningHint}>Set a deadline like "6 months" for a breakdown.</Text>;
                            return (
                                <View style={styles.planningContent}>
                                    {breakdown.monthly && (
                                        <View style={styles.planningRow}>
                                            <Text style={styles.planningLabel}>Monthly Target:</Text>
                                            <Text style={styles.planningValue}>{formatValue(breakdown.monthly, item.type)}</Text>
                                        </View>
                                    )}
                                    {breakdown.weekly && (
                                        <View style={styles.planningRow}>
                                            <Text style={styles.planningLabel}>Weekly Target:</Text>
                                            <Text style={styles.planningValue}>{formatValue(breakdown.weekly, item.type)}</Text>
                                        </View>
                                    )}
                                    <View style={styles.planningRow}>
                                        <Text style={styles.planningLabel}>Daily Target:</Text>
                                        <Text style={styles.planningValue}>{formatValue(breakdown.daily, item.type)}</Text>
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
                )}

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
        <View style={[styles.mainSafeArea, { paddingTop: insets.top }]}>
            <FlatList
                data={goals}
                keyExtractor={(item) => item.id}
                renderItem={renderGoal}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.headerContainer}>
                        {/* Standardized Header */}
                        <View style={styles.dashboardHeader}>
                            <View>
                                <Text style={styles.greeting}>Goals 🎯</Text>
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

                        <TouchableOpacity
                            style={styles.floatingAddBtn}
                            onPress={openCreateModal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                            <Text style={styles.floatingAddText}>Set New Goal</Text>
                        </TouchableOpacity>
                    </View>
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
    mainSafeArea: {
        flex: 1,
        backgroundColor: THEME.colors.background,
    },
    container: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    headerContainer: {
        marginBottom: 8,
    },
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
    floatingAddBtn: {
        backgroundColor: THEME.colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: THEME.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    floatingAddText: {
        color: "#FFF",
        fontWeight: "800",
        fontSize: 16,
        marginLeft: 8,
    },
    goalCard: {
        backgroundColor: THEME.colors.white,
        padding: 24,
        borderRadius: 28,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    goalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    titleRow: {
        flex: 1,
    },
    goalTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: THEME.colors.text,
        marginBottom: 6,
    },
    typeBadge: {
        backgroundColor: "#E8E6FF",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    typeBadgeText: {
        color: THEME.colors.primary,
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionIcon: {
        marginLeft: 16,
    },
    goalDesc: {
        fontSize: 15,
        color: THEME.colors.textLight,
        marginBottom: 16,
        lineHeight: 22,
    },
    progressContainer: {
        marginVertical: 16,
    },
    barTextMode: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 13,
        color: THEME.colors.primary,
        marginBottom: 8,
        letterSpacing: 2,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: "#F3F4F6",
        borderRadius: 5,
        overflow: "hidden",
        marginBottom: 10,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 5,
    },
    motivationalText: {
        fontSize: 14,
        color: THEME.colors.primary,
        fontWeight: "700",
        fontStyle: "italic",
    },
    planningBreakdown: {
        backgroundColor: "#F9FAFC",
        padding: 16,
        borderRadius: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    planningTitle: {
        fontSize: 12,
        fontWeight: "900",
        color: THEME.colors.primary,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 12,
    },
    planningContent: {
        gap: 8,
    },
    planningRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    planningLabel: {
        fontSize: 14,
        color: THEME.colors.textLight,
        fontWeight: '600',
    },
    planningValue: {
        fontSize: 15,
        fontWeight: "800",
        color: THEME.colors.text,
    },
    planningHint: {
        fontSize: 12,
        color: "#BBB",
        fontStyle: "italic",
    },
    goalFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    progressText: {
        fontSize: 16,
        fontWeight: "900",
        color: THEME.colors.text,
    },
    deadlineText: {
        fontSize: 13,
        color: THEME.colors.textLight,
        fontWeight: "700",
    },
    emptyContainer: {
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: THEME.colors.textLight,
        fontWeight: "600",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "900",
        color: THEME.colors.text,
        marginBottom: 8,
    },
    modalSub: {
        fontSize: 16,
        color: THEME.colors.textLight,
        marginBottom: 24,
    },
    input: {
        backgroundColor: "#F9FAFC",
        height: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        color: THEME.colors.text,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    inputHint: {
        fontSize: 12,
        color: "#888",
        marginLeft: 4,
        marginBottom: 8,
        marginTop: -10,
    },
    pickerContainer: {
        backgroundColor: "#F9FAFC",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    picker: {
        height: 54,
        width: "100%",
    },
    subgoalToggleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F9FAFC",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    subgoalToggleLabel: {
        fontSize: 16,
        color: THEME.colors.text,
        fontWeight: "700",
    },
    toggleSwitch: {
        width: 48,
        height: 26,
        backgroundColor: "#D1D5DB",
        borderRadius: 13,
        padding: 2,
    },
    toggleSwitchActive: {
        backgroundColor: THEME.colors.primary,
    },
    toggleKnob: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#FFF",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleKnobActive: {
        transform: [{ translateX: 22 }],
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
        backgroundColor: THEME.colors.primary,
        height: 56,
        paddingHorizontal: 18,
        justifyContent: "center",
        alignItems: "center",
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
    },
    subgoalsListForm: {
        marginTop: 12,
        backgroundColor: "#F9FAFC",
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    subgoalItemForm: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E5E7EB",
    },
    subgoalItemTextForm: {
        fontSize: 14,
        color: THEME.colors.text,
        flex: 1,
        fontWeight: '600',
    },
    subgoalsCardContainer: {
        marginTop: 4,
        marginBottom: 16,
        backgroundColor: "#F9FAFC",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    subgoalRowCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    subgoalTitleCard: {
        fontSize: 16,
        color: THEME.colors.text,
        marginLeft: 12,
        flex: 1,
        fontWeight: '600',
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
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelBtn: {
        backgroundColor: "#F3F4F6",
        marginRight: 8,
    },
    cancelBtnText: {
        color: THEME.colors.textLight,
        fontSize: 16,
        fontWeight: "800",
    },
    submitBtn: {
        backgroundColor: THEME.colors.primary,
        marginLeft: 8,
    },
    submitBtnText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "900",
    },
});

