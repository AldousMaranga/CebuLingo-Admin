import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FiActivity,
    FiAlertTriangle,
    FiAward,
    FiBarChart2,
    FiBookOpen,
    FiRefreshCw,
    FiTarget,
    FiTrendingUp,
    FiUsers,
    FiZap
} from "react-icons/fi";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const DAY_MS = 24 * 60 * 60 * 1000;

function Home() {
    const [dashboardData, setDashboardData] = useState({
        users: [],
        lessons: [],
        lessonResults: [],
        questionAttempts: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const getTimestampValue = useCallback((value) => {
        if (!value) return 0;
        if (typeof value === "number") return value;
        if (value instanceof Date) return value.getTime();
        if (typeof value.toMillis === "function") return value.toMillis();
        if (typeof value.seconds === "number") return value.seconds * 1000;
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            const [accountsSnapshot, profilesSnapshot, leaderboardSnapshot, lessonsSnapshot] = await Promise.all([
                getDocs(collection(db, "user_accounts")),
                getDocs(collection(db, "users")),
                getDocs(collection(db, "leaderboard")),
                getDocs(collection(db, "lessons"))
            ]);

            const accountsMap = new Map(accountsSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]));
            const profilesMap = new Map(profilesSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]));
            const leaderboardMap = new Map(leaderboardSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]));
            const allUserIds = new Set([...accountsMap.keys(), ...profilesMap.keys(), ...leaderboardMap.keys()]);

            const users = [...allUserIds].map((userId) => {
                const account = accountsMap.get(userId) || {};
                const profile = profilesMap.get(userId) || {};
                const leaderboard = leaderboardMap.get(userId) || {};
                const lessonResults = profile.lessonResults || {};
                const completedLessons = Array.isArray(profile.completedLessons) ? profile.completedLessons : [];
                const lastActive =
                    profile.lastActiveAt ||
                    profile.lastActiveDate ||
                    account.lastLogin ||
                    profile.lastLogin ||
                    profile.updatedAt ||
                    account.updatedAt ||
                    leaderboard.updatedAt ||
                    null;

                return {
                    id: userId,
                    name: profile.name || account.displayName || leaderboard.name || "Language Learner",
                    email: account.email || profile.email || "No email",
                    provider: account.provider || "unknown",
                    streak: Number(profile.streak ?? leaderboard.streak ?? 0) || 0,
                    totalXP: Number(leaderboard.totalXP ?? profile.totalXP ?? 0) || 0,
                    currentLevel: Number(leaderboard.currentLevel ?? profile.currentLevel ?? 1) || 1,
                    createdAt: account.createdAt || profile.createdAt || null,
                    lastActive,
                    completedLessons,
                    lessonResults
                };
            });

            const lessons = lessonsSnapshot.docs.map((snapshot) => ({
                id: snapshot.id,
                ...snapshot.data()
            }));

            const lessonResults = users.flatMap((user) => {
                const resultEntries = Object.entries(user.lessonResults || {});

                return resultEntries.map(([lessonKey, result]) => ({
                    userId: user.id,
                    userName: user.name,
                    lessonKey,
                    lessonId: result?.lessonId || lessonKey,
                    lessonTitle: result?.lessonTitle || result?.title || lessonKey,
                    percentage: Number(result?.percentage ?? result?.percentageScore ?? result?.score ?? 0) || 0,
                    correctAnswers: Number(result?.correctAnswers ?? 0) || 0,
                    totalQuestions: Number(result?.totalQuestions ?? 0) || 0,
                    xpAwarded: Number(result?.xpAwarded ?? 0) || 0,
                    passed: result?.passed !== false,
                    completedAt: result?.completedAt || result?.createdAt || result?.updatedAt || null
                }));
            });

            const questionAttempts = users.flatMap((user) => {
                const wrongQuestions = Array.isArray(user.lessonData?.wrongQuestions)
                    ? user.lessonData.wrongQuestions
                    : [];

                return wrongQuestions.map((attempt) => ({
                    userId: user.id,
                    userName: user.name,
                    ...attempt
                }));
            });

            setDashboardData({
                users,
                lessons,
                lessonResults,
                questionAttempts
            });
        } catch (fetchError) {
            console.error("Error fetching dashboard data:", fetchError);
            setError(fetchError.message || "Failed to load analytics.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const analytics = useMemo(() => {
        const { users, lessons, lessonResults, questionAttempts } = dashboardData;
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const weekAgo = now - (7 * DAY_MS);
        const inactiveCutoff = now - (7 * DAY_MS);

        const activeToday = users.filter((user) => getTimestampValue(user.lastActive) >= todayStart.getTime()).length;
        const activeThisWeek = users.filter((user) => getTimestampValue(user.lastActive) >= weekAgo).length;
        const inactiveUsers = users.filter((user) => {
            const lastActive = getTimestampValue(user.lastActive);
            return !lastActive || lastActive < inactiveCutoff;
        });
        const usersWithLesson = users.filter((user) => user.completedLessons.length > 0 || Object.keys(user.lessonResults || {}).length > 0).length;
        const totalCompletedLessons = users.reduce((sum, user) => sum + user.completedLessons.length, 0);
        const averageScore = average(lessonResults.map((result) => result.percentage));
        const totalXp = users.reduce((sum, user) => sum + user.totalXP, 0);
        const averageStreak = average(users.map((user) => user.streak));
        const completionRate = users.length ? Math.round((usersWithLesson / users.length) * 100) : 0;
        const aiHintsShown = questionAttempts.length;

        const difficultyMap = new Map();
        lessons.forEach((lesson) => {
            const difficulty = normalizeLabel(lesson.difficulty || "Unlabeled");
            const current = difficultyMap.get(difficulty) || {
                label: difficulty,
                lessonCount: 0,
                completedCount: 0,
                scoreTotal: 0,
                scoreCount: 0
            };
            current.lessonCount += 1;
            difficultyMap.set(difficulty, current);
        });

        lessonResults.forEach((result) => {
            const lesson = lessons.find((item) => item.id === result.lessonId || item.title === result.lessonTitle);
            const difficulty = normalizeLabel(lesson?.difficulty || "Unlabeled");
            const current = difficultyMap.get(difficulty) || {
                label: difficulty,
                lessonCount: 0,
                completedCount: 0,
                scoreTotal: 0,
                scoreCount: 0
            };
            current.completedCount += 1;
            current.scoreTotal += result.percentage;
            current.scoreCount += 1;
            difficultyMap.set(difficulty, current);
        });

        const difficultyStats = [...difficultyMap.values()].map((item) => ({
            ...item,
            averageScore: item.scoreCount ? Math.round(item.scoreTotal / item.scoreCount) : 0
        }));

        const lessonPerformanceMap = new Map();
        lessonResults.forEach((result) => {
            const key = result.lessonTitle || result.lessonId || result.lessonKey;
            const current = lessonPerformanceMap.get(key) || {
                title: key,
                attempts: 0,
                scoreTotal: 0,
                lowScores: 0
            };
            current.attempts += 1;
            current.scoreTotal += result.percentage;
            if (result.percentage < 50) {
                current.lowScores += 1;
            }
            lessonPerformanceMap.set(key, current);
        });

        const hardestLessons = [...lessonPerformanceMap.values()]
            .map((lesson) => ({
                ...lesson,
                averageScore: lesson.attempts ? Math.round(lesson.scoreTotal / lesson.attempts) : 0,
                lowScoreRate: lesson.attempts ? Math.round((lesson.lowScores / lesson.attempts) * 100) : 0
            }))
            .filter((lesson) => lesson.attempts > 0)
            .sort((left, right) => left.averageScore - right.averageScore)
            .slice(0, 5);

        const topLearners = [...users]
            .sort((left, right) => right.totalXP - left.totalXP)
            .slice(0, 5);

        const activityTrend = buildActivityTrend(users, getTimestampValue);

        return {
            activeToday,
            activeThisWeek,
            inactiveUsers: inactiveUsers.slice(0, 5),
            totalUsers: users.length,
            totalLessons: lessons.length,
            totalCompletedLessons,
            averageScore: Math.round(averageScore),
            totalXp,
            averageStreak: Math.round(averageStreak * 10) / 10,
            completionRate,
            aiHintsShown,
            difficultyStats,
            hardestLessons,
            topLearners,
            activityTrend
        };
    }, [dashboardData, getTimestampValue]);

    return (
        <div className="home-cont">
            <div className="home-hero">
                <div>
                    <span className="home-eyebrow">Learning Analytics</span>
                    <h1>CebuLingo Command Center</h1>
                    <p>Track user growth, lesson performance, quiz outcomes, and where learners need support.</p>
                </div>

                <button className="home-refresh-button" onClick={fetchDashboardData} disabled={isLoading}>
                    <FiRefreshCw />
                    <span>{isLoading ? "Refreshing..." : "Refresh data"}</span>
                </button>
            </div>

            {error && <div className="home-error">{error}</div>}

            <div className="home-kpi-grid">
                <KpiCard icon={<FiUsers />} label="Total Users" value={formatNumber(analytics.totalUsers)} detail={`${analytics.activeThisWeek} active this week`} color="#38BDF8" />
                <KpiCard icon={<FiActivity />} label="Active Today" value={formatNumber(analytics.activeToday)} detail={`${analytics.activeThisWeek} weekly active learners`} color="#34D399" />
                <KpiCard icon={<FiTarget />} label="Average Score" value={`${analytics.averageScore}%`} detail={`${analytics.completionRate}% users completed a lesson`} color="#FBBF24" />
                <KpiCard icon={<FiBookOpen />} label="Lessons Done" value={formatNumber(analytics.totalCompletedLessons)} detail={`${analytics.totalLessons} lessons available`} color="#A78BFA" />
                <KpiCard icon={<FiZap />} label="Total XP" value={formatNumber(analytics.totalXp)} detail={`${analytics.averageStreak} day average streak`} color="#FB7185" />
                <KpiCard icon={<FiAward />} label="AI Hint Signals" value={formatNumber(analytics.aiHintsShown)} detail="Tracked from missed-question data when available" color="#22D3EE" />
            </div>

            <div className="home-dashboard-grid">
                <section className="home-panel wide">
                    <PanelHeader icon={<FiTrendingUp />} title="User Activity Trend" subtitle="Active learners over the last 7 days" />
                    <div className="home-bar-chart">
                        {analytics.activityTrend.map((item) => (
                            <div className="home-bar-item" key={item.label}>
                                <div className="home-bar-track">
                                    <div className="home-bar-fill" style={{ height: `${item.percent}%` }} />
                                </div>
                                <span>{item.label}</span>
                                <strong>{item.count}</strong>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="home-panel">
                    <PanelHeader icon={<FiBarChart2 />} title="Difficulty Health" subtitle="Completions and average score by difficulty" />
                    <div className="difficulty-list">
                        {analytics.difficultyStats.length === 0 ? (
                            <EmptyAnalytics text="No lesson difficulty data yet." />
                        ) : analytics.difficultyStats.map((difficulty) => (
                            <div className="difficulty-row" key={difficulty.label}>
                                <div>
                                    <strong>{difficulty.label}</strong>
                                    <span>{difficulty.completedCount} completions · {difficulty.lessonCount} lessons</span>
                                </div>
                                <ProgressRing value={difficulty.averageScore} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="home-panel">
                    <PanelHeader icon={<FiAlertTriangle />} title="Hardest Lessons" subtitle="Lowest average scores from completed lessons" />
                    <RankedList
                        items={analytics.hardestLessons}
                        emptyText="No completed lesson results yet."
                        renderItem={(lesson) => (
                            <>
                                <div>
                                    <strong>{lesson.title}</strong>
                                    <span>{lesson.attempts} attempts · {lesson.lowScoreRate}% below 50</span>
                                </div>
                                <b>{lesson.averageScore}%</b>
                            </>
                        )}
                    />
                </section>

                <section className="home-panel">
                    <PanelHeader icon={<FiAward />} title="Top Learners" subtitle="Highest XP earners" />
                    <RankedList
                        items={analytics.topLearners}
                        emptyText="No users found yet."
                        renderItem={(user) => (
                            <>
                                <div>
                                    <strong>{user.name}</strong>
                                    <span>Level {user.currentLevel} · {user.streak} day streak</span>
                                </div>
                                <b>{formatNumber(user.totalXP)} XP</b>
                            </>
                        )}
                    />
                </section>

                <section className="home-panel">
                    <PanelHeader icon={<FiAlertTriangle />} title="At-Risk Users" subtitle="No recent activity in 7+ days" />
                    <RankedList
                        items={analytics.inactiveUsers}
                        emptyText="No at-risk users detected."
                        renderItem={(user) => (
                            <>
                                <div>
                                    <strong>{user.name}</strong>
                                    <span>{user.email}</span>
                                </div>
                                <b>{formatRelativeActivity(user.lastActive, getTimestampValue)}</b>
                            </>
                        )}
                    />
                </section>
            </div>

            {isLoading && <div className="home-loading-overlay">Loading analytics...</div>}
        </div>
    );
}

function KpiCard({ icon, label, value, detail, color }) {
    return (
        <div className="home-kpi-card" style={{ "--accent": color }}>
            <div className="home-kpi-icon">{icon}</div>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{detail}</p>
        </div>
    );
}

function PanelHeader({ icon, title, subtitle }) {
    return (
        <div className="home-panel-header">
            <div className="home-panel-icon">{icon}</div>
            <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
        </div>
    );
}

function RankedList({ items, emptyText, renderItem }) {
    if (!items.length) {
        return <EmptyAnalytics text={emptyText} />;
    }

    return (
        <div className="home-ranked-list">
            {items.map((item, index) => (
                <div className="home-ranked-row" key={`${item.id || item.title || item.name}-${index}`}>
                    <span className="home-rank">{index + 1}</span>
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}

function EmptyAnalytics({ text }) {
    return <div className="home-empty-state">{text}</div>;
}

function ProgressRing({ value }) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    return (
        <div className="progress-ring" style={{ "--value": `${safeValue * 3.6}deg` }}>
            <span>{safeValue}%</span>
        </div>
    );
}

function average(values) {
    const filtered = values.filter((value) => Number.isFinite(Number(value)));
    if (!filtered.length) return 0;
    return filtered.reduce((sum, value) => sum + Number(value), 0) / filtered.length;
}

function normalizeLabel(value) {
    const text = (value || "").toString().trim();
    if (!text) return "Unlabeled";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function formatRelativeActivity(value, getTimestampValue) {
    const timestamp = getTimestampValue(value);
    if (!timestamp) return "No activity";
    const daysAgo = Math.max(0, Math.floor((Date.now() - timestamp) / DAY_MS));
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "1 day ago";
    return `${daysAgo} days ago`;
}

function buildActivityTrend(users, getTimestampValue) {
    const today = new Date();

    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const count = users.filter((user) => {
            const timestamp = getTimestampValue(user.lastActive);
            return timestamp >= date.getTime() && timestamp < nextDate.getTime();
        }).length;

        return {
            label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
            count
        };
    });

    const maxCount = Math.max(1, ...days.map((day) => day.count));

    return days.map((day) => ({
        ...day,
        percent: Math.max(8, Math.round((day.count / maxCount) * 100))
    }));
}

export default Home;
