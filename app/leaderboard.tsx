import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "../constants/types";
import { useGrowthData } from "../hooks/useGrowthData";

export default function LeaderboardScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { metrics, data } = useGrowthData();

    const fullLeaderboard = [
        { name: data.userName, score: metrics?.personalGrowthScore || 0, avatar: "🌟", isUser: true, level: metrics?.level || 1 },
    ].sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));

    const renderItem = ({ item }: { item: typeof fullLeaderboard[0] }) => (
        <View style={styles.leaderboardItem}>
            <View style={styles.leftSection}>
                <Text style={[styles.rankText, item.rank <= 3 && styles.topRankText]}>
                    {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `#${item.rank}`}
                </Text>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarEmoji}>{item.avatar}</Text>
                </View>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.nameText}>
                            {item.isUser ? "You" : item.name}
                        </Text>
                        <View style={styles.levelBadgeMini}>
                            <Text style={styles.levelBadgeTextMini}>Lvl {item.level}</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.rightSection}>
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{item.score}%</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={THEME.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerGreeting}>Leaderboard 🏆</Text>
                        <View style={styles.titleBadgeContainer}>
                            <Text style={styles.titleBadgeText}>{metrics?.userTitle || "Growth Seeker"}</Text>
                        </View>
                    </View>
                    <View style={styles.lvlBadge}>
                        <Text style={styles.lvlText}>LVL {metrics?.level || 1}</Text>
                    </View>
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.summaryLabel}>Your Rank</Text>
                        <Text style={styles.summaryValue}>#{fullLeaderboard.find(i => i.isUser)?.rank}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRight}>
                        <Text style={styles.summaryLabel}>Growth Score</Text>
                        <Text style={styles.summaryValue}>{metrics?.personalGrowthScore || 0}%</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={fullLeaderboard}
                keyExtractor={(item) => item.name}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 15,
        marginBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: THEME.colors.white,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    headerInfo: { flex: 1, marginLeft: 16 },
    headerGreeting: { fontSize: 24, fontWeight: "800", color: THEME.colors.text },
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
    lvlBadge: {
        backgroundColor: THEME.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    lvlText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
    summaryCard: {
        flexDirection: "row",
        backgroundColor: THEME.colors.white,
        borderRadius: 28,
        padding: 24,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    summaryLeft: { flex: 1, alignItems: "center" },
    summaryRight: { flex: 1, alignItems: "center" },
    divider: { width: 1, height: "100%", backgroundColor: "#F3F4F6" },
    summaryLabel: { color: THEME.colors.textLight, fontSize: 13, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
    summaryValue: { color: THEME.colors.text, fontSize: 28, fontWeight: "900" },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    leaderboardItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: THEME.colors.white,
        padding: 20,
        borderRadius: 28,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
    rankText: { fontSize: 16, fontWeight: "800", color: THEME.colors.textLight, width: 35 },
    topRankText: { fontSize: 22 },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarEmoji: { fontSize: 20 },
    nameText: { fontSize: 16, fontWeight: "700", color: THEME.colors.text },
    levelBadgeMini: {
        backgroundColor: THEME.colors.primary + "15",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    levelBadgeTextMini: {
        fontSize: 10,
        fontWeight: "800",
        color: THEME.colors.primary,
    },
    rightSection: { alignItems: "flex-end" },
    scoreBadge: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    scoreText: { fontSize: 14, fontWeight: "800", color: THEME.colors.text },
});
