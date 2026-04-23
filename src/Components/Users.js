import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import {
    collection,
    doc,
    getDocs,
    writeBatch
} from "firebase/firestore";
import { db } from "../firebase";

function Users() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const getTimestampValue = (value) => {
        if (!value) return 0;
        if (typeof value === "number") return value;
        if (value instanceof Date) return value.getTime();
        if (typeof value.toMillis === "function") return value.toMillis();
        if (typeof value.seconds === "number") return value.seconds * 1000;
        return 0;
    };

    const formatDate = (value) => {
        const timestamp = getTimestampValue(value);

        if (!timestamp) {
            return "No activity yet";
        }

        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }).format(new Date(timestamp));
    };

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            const [accountsSnapshot, profilesSnapshot, leaderboardSnapshot] = await Promise.all([
                getDocs(collection(db, "user_accounts")),
                getDocs(collection(db, "users")),
                getDocs(collection(db, "leaderboard"))
            ]);

            const accountsMap = new Map(
                accountsSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()])
            );
            const profilesMap = new Map(
                profilesSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()])
            );
            const leaderboardMap = new Map(
                leaderboardSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()])
            );

            const allUserIds = new Set([
                ...accountsMap.keys(),
                ...profilesMap.keys(),
                ...leaderboardMap.keys()
            ]);

            const combinedUsers = [...allUserIds].map((userId) => {
                const account = accountsMap.get(userId) || {};
                const profile = profilesMap.get(userId) || {};
                const leaderboard = leaderboardMap.get(userId) || {};

                const lastLogin =
                    account.lastLogin ||
                    profile.lastLogin ||
                    profile.updatedAt ||
                    account.updatedAt ||
                    leaderboard.updatedAt ||
                    null;

                return {
                    id: userId,
                    name:
                        profile.name ||
                        account.displayName ||
                        leaderboard.name ||
                        "Language Learner",
                    email: account.email || profile.email || "No email",
                    provider: account.provider || "unknown",
                    streak: profile.streak ?? 0,
                    totalXP: leaderboard.totalXP ?? profile.totalXP ?? 0,
                    currentLevel: leaderboard.currentLevel ?? profile.currentLevel ?? 1,
                    lastLogin,
                    hasProfile: profilesMap.has(userId),
                    hasAccount: accountsMap.has(userId),
                    hasLeaderboard: leaderboardMap.has(userId)
                };
            });

            combinedUsers.sort(
                (left, right) => getTimestampValue(right.lastLogin) - getTimestampValue(left.lastLogin)
            );

            setUsers(combinedUsers);
        } catch (fetchError) {
            console.error("Error fetching users:", fetchError);
            setError(fetchError.message || "Failed to fetch users.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return users;
        }

        return users.filter((user) => {
            const searchableText = [
                user.name,
                user.email,
                user.currentLevel,
                `level ${user.currentLevel}`
            ]
                .filter((value) => value !== undefined && value !== null)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(normalizedSearch);
        });
    }, [searchTerm, users]);

    const handleDeleteUser = async (user) => {
        const confirmDelete = window.confirm(
            `Delete ${user.name}'s saved app data from users, user_accounts, and leaderboard?`
        );

        if (!confirmDelete) {
            return;
        }

        setDeletingId(user.id);
        setError("");

        try {
            const batch = writeBatch(db);

            batch.delete(doc(db, "users", user.id));
            batch.delete(doc(db, "user_accounts", user.id));
            batch.delete(doc(db, "leaderboard", user.id));

            await batch.commit();

            setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
        } catch (deleteError) {
            console.error("Error deleting user data:", deleteError);
            setError(deleteError.message || "Failed to delete the user data.");
        } finally {
            setDeletingId("");
        }
    };

    return (
        <div className="user-cont">
            <div className="user-header">
                <div>
                    <h1>User Management</h1>
                    <p>View mobile-app users and remove their saved Firestore data.</p>
                </div>

                <div className="user-buttons-cont">
                    <label className="user-search">
                        <FiSearch />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search email, username, level..."
                            aria-label="Search users"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                className="user-search-clear"
                                onClick={() => setSearchTerm("")}
                                aria-label="Clear user search"
                            >
                                <FiX />
                            </button>
                        )}
                    </label>

                    <button
                        className="user-refresh-button"
                        onClick={fetchUsers}
                        disabled={isLoading}
                    >
                        <FiRefreshCw />
                        <span>{isLoading ? "Loading..." : "Refresh"}</span>
                    </button>
                </div>
            </div>

            <div className="user-list-cont">
                <div className="user-note">
                    This page deletes Firestore documents from <code>users</code>,{" "}
                    <code>user_accounts</code>, and <code>leaderboard</code>. It does not
                    delete the Firebase Authentication account itself.
                </div>

                {error && <div className="user-error">{error}</div>}

                <div className="user-table-head">
                    <span>User</span>
                    <span>Provider</span>
                    <span>Progress</span>
                    <span>Last Login</span>
                    <span>Records</span>
                    <span>Actions</span>
                </div>

                {isLoading ? (
                    <div className="user-empty-state">Loading users...</div>
                ) : users.length === 0 ? (
                    <div className="user-empty-state">No users found.</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="user-empty-state">No users match "{searchTerm}".</div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.id} className="user-row">
                            <div className="user-identity">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email">{user.email}</span>
                                <span className="user-id">UID: {user.id}</span>
                            </div>

                            <span className="user-provider">{user.provider}</span>

                            <div className="user-progress">
                                <span>Level {user.currentLevel}</span>
                                <span>{user.totalXP} XP</span>
                                <span>{user.streak} day streak</span>
                            </div>

                            <span className="user-last-login">{formatDate(user.lastLogin)}</span>

                            <div className="user-records">
                                <span className={user.hasProfile ? "record-active" : "record-missing"}>
                                    users
                                </span>
                                <span className={user.hasAccount ? "record-active" : "record-missing"}>
                                    user_accounts
                                </span>
                                <span className={user.hasLeaderboard ? "record-active" : "record-missing"}>
                                    leaderboard
                                </span>
                            </div>

                            <div className="user-actions">
                                <button
                                    className="icon-button delete"
                                    onClick={() => handleDeleteUser(user)}
                                    disabled={deletingId === user.id}
                                    title="Delete saved user data"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Users;
