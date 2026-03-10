import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
                ListHeaderComponent={
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Daily Journal</Text>
                        <Text style={styles.subtitle}>Reflect on your day and track your mood</Text>

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
                                placeholderTextColor="#999"
                                multiline
                                textAlignVertical="top"
                                value={reflection}
                                onChangeText={setReflection}
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, !reflection.trim() && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={!reflection.trim()}
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
        backgroundColor: '#F5F7FB',
    },
    container: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerContainer: {
        paddingTop: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        marginTop: 4,
        marginBottom: 24,
    },
    inputCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 12,
    },
    moodSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    moodOption: {
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    moodOptionSelected: {
        backgroundColor: '#E8E6FF',
        borderColor: '#6C63FF',
    },
    moodEmoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    moodLabel: {
        fontSize: 12,
        color: '#888888',
    },
    moodLabelSelected: {
        color: '#6C63FF',
        fontWeight: 'bold',
    },
    textInput: {
        backgroundColor: '#F9FAFC',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333333',
        minHeight: 120,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#6C63FF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#A5A1FF',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    entryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    entryDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
    },
    entryMood: {
        fontSize: 20,
    },
    entryReflection: {
        fontSize: 15,
        color: '#333333',
        lineHeight: 22,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#A0A0A0',
    },
});
