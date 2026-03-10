import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../constants/types';
import { useGrowthData } from '../../hooks/useGrowthData';

interface JournalEntry {
    id: string;
    date: string;
    mood: string;
    reflection: string;
}

const JOURNAL_STORAGE = 'JOURNAL_STORAGE';

const MOODS = [
    { emoji: '😀', label: 'Great' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '😐', label: 'Neutral' },
    { emoji: '😞', label: 'Bad' },
    { emoji: '😫', label: 'Stressed' },
];

export default function JournalScreen() {
    const insets = useSafeAreaInsets();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [selectedMood, setSelectedMood] = useState<string>('🙂');
    const [reflection, setReflection] = useState<string>('');
    const { metrics } = useGrowthData();

    const loadEntries = async () => {
        try {
            const data = await AsyncStorage.getItem(JOURNAL_STORAGE);
            if (data) {
                setEntries(JSON.parse(data));
            }
        } catch (error) {
            console.error('Failed to load journal entries', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadEntries();
        }, [])
    );

    const handleSave = async () => {
        if (!reflection.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
            mood: selectedMood,
            reflection: reflection.trim()
        };

        const updatedEntries = [newEntry, ...entries];
        setEntries(updatedEntries);
        setReflection('');
        setSelectedMood('🙂');

        try {
            await AsyncStorage.setItem(JOURNAL_STORAGE, JSON.stringify(updatedEntries));
        } catch (error) {
            console.error('Failed to save journal entry', error);
        }
    };

    const renderEntry = ({ item }: { item: JournalEntry }) => (
        <View style={styles.entryCard}>
            <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{item.date}</Text>
                <Text style={styles.entryMood}>{item.mood}</Text>
            </View>
            <Text style={styles.entryReflection} numberOfLines={2}>
                {item.reflection}
            </Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.safeArea, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                renderItem={renderEntry}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.headerContainer}>
                        {/* Standardized Header */}
                        <View style={styles.dashboardHeader}>
                            <View>
                                <Text style={styles.greeting}>Journal 📓</Text>
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

                        <View style={styles.inputCard}>
                            <Text style={styles.label}>How are you feeling?</Text>
                            <View style={styles.moodSelector}>
                                {MOODS.map((m) => (
                                    <TouchableOpacity
                                        key={m.label}
                                        style={[styles.moodOption, selectedMood === m.emoji && styles.moodOptionSelected]}
                                        onPress={() => setSelectedMood(m.emoji)}
                                    >
                                        <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                        <Text style={[styles.moodLabel, selectedMood === m.emoji && styles.moodLabelSelected]}>{m.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Reflection</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="What went well today?"
                                placeholderTextColor="#A0A0A0"
                                multiline
                                textAlignVertical="top"
                                value={reflection}
                                onChangeText={setReflection}
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, !reflection.trim() && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={!reflection.trim()}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveButtonText}>Save Entry</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Past Entries</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No journal entries yet. Start writing!</Text>
                    </View>
                }
            />
        </KeyboardAvoidingView>
    );

}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: THEME.colors.background,
    },
    container: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 16,
    },
    headerContainer: {
        // paddingTop removed as container handles it
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
    inputCard: {
        backgroundColor: THEME.colors.white,
        borderRadius: 28,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    label: {
        fontSize: 18,
        fontWeight: '800',
        color: THEME.colors.text,
        marginBottom: 16,
    },
    moodSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 30,
        backgroundColor: '#F9FAFC',
        padding: 12,
        borderRadius: 24,
    },
    moodOption: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'transparent',
        minWidth: 60,
    },
    moodOptionSelected: {
        backgroundColor: '#FFFFFF',
        borderColor: THEME.colors.primary,
        shadowColor: THEME.colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    moodEmoji: {
        fontSize: 32,
        marginBottom: 4,
    },
    moodLabel: {
        fontSize: 11,
        color: THEME.colors.textLight,
        fontWeight: '700',
    },
    moodLabelSelected: {
        color: THEME.colors.primary,
    },
    textInput: {
        backgroundColor: '#F9FAFC',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 20,
        padding: 16,
        fontSize: 16,
        color: THEME.colors.text,
        minHeight: 140,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: THEME.colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: THEME.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#B8B3FF',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.colors.text,
        marginBottom: 16,
        marginLeft: 4,
    },
    entryCard: {
        backgroundColor: THEME.colors.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    entryDate: {
        fontSize: 15,
        fontWeight: '700',
        color: THEME.colors.textLight,
    },
    entryMood: {
        fontSize: 24,
    },
    entryReflection: {
        fontSize: 16,
        color: THEME.colors.text,
        lineHeight: 24,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 16,
        color: THEME.colors.textLight,
        fontWeight: '600',
    },
});

