import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STORAGE_KEYS, THEME, Transaction } from "../../constants/types";
import { useGrowthData } from "../../hooks/useGrowthData";

const screenWidth = Dimensions.get("window").width;
const EXPENSE_CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investments", "Gift", "Other"];

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const { metrics } = useGrowthData();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.FINANCE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) setTransactions(parsed);
    }
  };

  const handleAddTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Invalid Amount");
    const newTx: Transaction = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      type,
      date: new Date().toISOString(),
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(updated));
    setAmount("");
  };

  const totals = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else acc.expense += t.amount;
      acc.savings = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, savings: 0 });
  }, [transactions]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    const colors = ["#6C63FF", "#FF8C00", "#00C9A7", "#FF5252", "#4A90E2"];
    return Object.keys(categories).map((cat, i) => ({
      name: cat,
      amount: categories[cat],
      color: colors[i % colors.length],
      legendFontColor: THEME.colors.textLight,
      legendFontSize: 12,
    }));
  }, [transactions]);

  return (
    <View style={[styles.mainSafeArea, { paddingTop: insets.top }]}>
      <FlatList
        data={transactions}
        keyExtractor={t => t.id}
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={[styles.txIcon, { backgroundColor: item.type === "income" ? "#DCFCE7" : "#FEE2E2" }]}>
              <Ionicons name={item.type === "income" ? "arrow-down" : "arrow-up"} size={20} color={item.type === "income" ? "#16A34A" : "#EF4444"} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.txTitle}>{item.category}</Text>
              <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, { color: item.type === "income" ? "#16A34A" : "#EF4444" }]}>
              {item.type === "income" ? "+" : "-"}₹{item.amount.toLocaleString()}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          <>
            {/* Standardized Header */}
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.greeting}>Finance 💰</Text>
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

            <View style={styles.summaryRow}>
              <SummaryItem label="Income" value={totals.income} color="#16A34A" />
              <SummaryItem label="Expense" value={totals.expense} color="#EF4444" />
              <SummaryItem label="Savings" value={totals.savings} color={THEME.colors.primary} />
            </View>

            {chartData.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.cardTitle}>Expense Breakdown</Text>
                <PieChart
                  data={chartData}
                  width={screenWidth - 80}
                  height={200}
                  chartConfig={{ color: (o = 1) => `rgba(108, 99, 255, ${o})` }}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                  absolute
                />
              </View>
            )}

            <View style={styles.addCard}>
              <Text style={styles.cardTitle}>Add Transaction</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity onPress={() => { setType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }} style={[styles.toggleBtn, type === "expense" && styles.toggleActiveExp]}>
                  <Text style={[styles.toggleText, type === "expense" && styles.textWhite]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setType("income"); setCategory(INCOME_CATEGORIES[0]); }} style={[styles.toggleBtn, type === "income" && styles.toggleActiveInc]}>
                  <Text style={[styles.toggleText, type === "income" && styles.textWhite]}>Income</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" placeholderTextColor="#A0A0A0" value={amount} onChangeText={setAmount} />
              <View style={styles.pickerWrap}>
                <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
                  {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddTransaction} activeOpacity={0.8}>
                <Text style={styles.addBtnText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </>
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryVal, { color }]}>₹{Math.abs(value).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainSafeArea: { flex: 1, backgroundColor: THEME.colors.background },
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryItem: {
    backgroundColor: THEME.colors.white,
    width: "31%",
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.colors.textLight,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  summaryVal: { fontSize: 15, fontWeight: "900" },
  chartCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.text,
    marginBottom: 16,
  },
  addCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  toggleActiveExp: { backgroundColor: "#EF4444" },
  toggleActiveInc: { backgroundColor: "#16A34A" },
  toggleText: { fontWeight: "800", color: THEME.colors.textLight, fontSize: 13 },
  textWhite: { color: "#FFF" },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    color: THEME.colors.text,
  },
  pickerWrap: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
  },
  picker: { height: 50 },
  addBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  txCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  txTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text },
  txDate: { fontSize: 12, color: THEME.colors.textLight, marginTop: 2 },
  txAmount: { fontSize: 17, fontWeight: "900" },
});

