import { StyleSheet, Text, View } from "react-native";

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tasks Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FB", // Matching the HomeScreen background
  },
  text: {
    fontSize: 18,
    color: "#333", // Ensure text is visible
  },
});