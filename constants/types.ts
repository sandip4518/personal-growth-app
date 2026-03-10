export interface Task {
    id: string;
    title: string;
    completed: boolean;
    priority?: "high" | "medium" | "low";
    completedAt?: string;
    createdAt: string;
}

export interface Habit {
    id: string;
    title: string;
    streak: number;
    completedDates: string[];
}

export interface Transaction {
    id: string;
    amount: number;
    category: string;
    type: "income" | "expense";
    date: string;
}

export interface Goal {
    id: string;
    title: string;
    description?: string;
    type: "habit" | "task" | "finance" | "custom";
    targetValue: number;
    currentValue: number;
    deadline: string;
    completed: boolean;
    subgoals?: { id: string; title: string; completed: boolean }[];
    createdAt: string;
}

export interface JournalEntry {
    id: string;
    date: string;
    mood: string;
    reflection: string;
}

export const STORAGE_KEYS = {
    TASKS: "tasks_storage",
    HABITS: "HABITS_STORAGE",
    FINANCE: "FINANCE_STORAGE",
    GOALS: "GOALS_STORAGE",
    JOURNAL: "JOURNAL_STORAGE",
    USER_DATA: "USER_DATA",
    LOGGED_IN: "USER_LOGGED_IN",
};

export const THEME = {
    colors: {
        primary: "#6C63FF",
        secondary: "#00C9A7",
        accent: "#FF8C00",
        error: "#FF6347",
        background: "#F5F7FB",
        white: "#FFFFFF",
        text: "#1A1A1A",
        textLight: "#666666",
        border: "#EEEEEE",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        round: 50,
    }
};
