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

const screenWidth = Dimensions.get("window").width;
const EXPENSE_CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investments", "Gift", "Other"];

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.FINANCE);
    if (saved) setTransactions(JSON.parse(saved));
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
            <Text style={styles.title}>Finance</Text>

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
                  width={screenWidth - 72}
                  height={180}
                  chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 0]}
                />
              </View>
            )}

            <View style={styles.addCard}>
              <View style={styles.typeToggle}>
                <TouchableOpacity onPress={() => { setType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }} style={[styles.toggleBtn, type === "expense" && styles.toggleActiveExp]}>
                  <Text style={[styles.toggleText, type === "expense" && styles.textWhite]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setType("income"); setCategory(INCOME_CATEGORIES[0]); }} style={[styles.toggleBtn, type === "income" && styles.toggleActiveInc]}>
                  <Text style={[styles.toggleText, type === "income" && styles.textWhite]}>Income</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <View style={styles.pickerWrap}>
                <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
                  {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddTransaction}>
                <Text style={styles.addBtnText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
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
  container: { flex: 1, backgroundColor: THEME.colors.background },
  title: { fontSize: 32, fontWeight: "800", color: THEME.colors.text, marginBottom: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  summaryItem: { backgroundColor: "#FFF", width: "31%", padding: 12, borderRadius: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  summaryLabel: { fontSize: 11, fontWeight: "700", color: THEME.colors.textLight, textTransform: "uppercase", marginBottom: 4 },
  summaryVal: { fontSize: 14, fontWeight: "900" },
  chartCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 16, marginBottom: 24, alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: THEME.colors.text, alignSelf: "flex-start", marginLeft: 8, marginBottom: 8 },
  addCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 20, marginBottom: 24 },
  typeToggle: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  toggleActiveExp: { backgroundColor: "#EF4444" },
  toggleActiveInc: { backgroundColor: "#16A34A" },
  toggleText: { fontWeight: "700", color: THEME.colors.textLight },
  textWhite: { color: "#FFF" },
  input: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: "#F3F4F6" },
  pickerWrap: { backgroundColor: "#F9FAFB", borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" },
  picker: { height: 50 },
  addBtn: { backgroundColor: THEME.colors.primary, borderRadius: 12, padding: 16, alignItems: "center" },
  addBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.colors.text, marginBottom: 16 },
  txCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  txTitle: { fontSize: 15, fontWeight: "700", color: THEME.colors.text },
  txDate: { fontSize: 12, color: THEME.colors.textLight },
  txAmount: { fontSize: 16, fontWeight: "800" },
});
