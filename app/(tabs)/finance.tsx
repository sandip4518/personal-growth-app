import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
}

const STORAGE_KEY = 'FINANCE_STORAGE';
const screenWidth = Dimensions.get('window').width;

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'];

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  // Initialize category to the first relevant option based on default type
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const saveTransactions = async (newTransactions: Transaction[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTransactions));
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  };

  const handleAddTransaction = () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      amount: parsedAmount,
      category: category.trim(),
      type,
      date: new Date().toISOString(),
    };

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);

    // Reset form
    setAmount('');
    setCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const handleDeleteTransaction = (id: string) => {
    const updatedTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);
  };

  const calculateTotals = () => {
    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    return { income, expense, savings: income - expense };
  };

  const totals = calculateTotals();

  const chartData = useMemo(() => {
    const expenseCategories: { [key: string]: number } = {};

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
      }
    });

    const colors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#8AC926',
      '#1982C4',
      '#6A4C93'
    ];

    return Object.keys(expenseCategories)
      .map((category, index) => ({
        name: category,
        amount: expenseCategories[category],
        color: colors[index % colors.length],
        legendFontColor: '#555',
        legendFontSize: 13,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCategory}>{item.category}</Text>
        <Text style={styles.transactionTypeHint}>
          {item.type === 'income' ? 'Income' : 'Expense'}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'income' ? '#2ecc71' : '#e74c3c' },
          ]}
        >
          {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTransaction(item.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Finance</Text>
              <Text style={styles.subtitle}>Track your income and expenses</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, styles.incomeCard]}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={styles.summaryValue}>₹{totals.income.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.summaryCard, styles.expenseCard]}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>₹{totals.expense.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.summaryCard, styles.savingsCard]}>
                <Text style={styles.summaryLabel}>Savings</Text>
                <Text style={styles.summaryValue}>₹{totals.savings.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Chart Section */}
            {chartData.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                <PieChart
                  data={chartData}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[0, 0]}
                  absolute={false}
                />
              </View>
            )}

            {/* Add Transaction Section */}
            <View style={styles.addSection}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'expense' && styles.typeOptionActiveError,
                  ]}
                  onPress={() => {
                    setType('expense');
                    setCategory(EXPENSE_CATEGORIES[0]);
                  }}
                >
                  <Text
                    style={[
                      styles.typeText,
                      type === 'expense' && styles.typeTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'income' && styles.typeOptionActiveSuccess,
                  ]}
                  onPress={() => {
                    setType('income');
                    setCategory(INCOME_CATEGORIES[0]);
                  }}
                >
                  <Text
                    style={[
                      styles.typeText,
                      type === 'income' && styles.typeTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Amount"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} color="#333" />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}>
                <Text style={styles.addButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.listSectionTitle}>Transactions</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No transactions yet. Add one above.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingVertical: 20,
    backgroundColor: '#F5F7FB',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCard: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  expenseCard: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  savingsCard: {
    backgroundColor: '#f3e5f5',
    borderWidth: 1,
    borderColor: '#e1bee7',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chartSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  addSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F5F7FB',
    borderRadius: 8,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeOptionActiveError: {
    backgroundColor: '#e74c3c',
  },
  typeOptionActiveSuccess: {
    backgroundColor: '#2ecc71',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#F5F7FB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#F5F7FB',
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  addButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionTypeHint: {
    fontSize: 12,
    color: '#888',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});
