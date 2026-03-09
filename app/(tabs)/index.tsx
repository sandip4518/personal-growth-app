import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.header}>Good Morning Sandy 👋</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Motivation</Text>
          <Text style={styles.quote}>
            &quot;Small daily improvements are the key to long-term success.&quot;
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&apos;s Tasks</Text>
          <Text style={styles.item}>• Review project proposal</Text>
          <Text style={styles.item}>• Gym workout</Text>
          <Text style={styles.item}>• Study MERN stack</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Habit Progress</Text>
          <Text style={styles.item}>Workout 🔥 6 days</Text>
          <Text style={styles.item}>Reading 🔥 4 days</Text>
          <Text style={styles.item}>Meditation 🔥 3 days</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Finance Summary</Text>
          <Text style={styles.item}>Income: ₹40,000</Text>
          <Text style={styles.item}>Expenses: ₹18,000</Text>
          <Text style={styles.item}>Savings: ₹22,000</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB"
  },

  container: {
    padding: 20
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    paddingTop: 50
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8
  },

  quote: {
    fontStyle: "italic",
    fontSize: 14
  },

  item: {
    fontSize: 14,
    marginBottom: 4
  }
});