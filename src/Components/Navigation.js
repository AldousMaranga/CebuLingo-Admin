import { useEffect, useRef, useState } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    Navigate
} from "react-router-dom";
import { getIdTokenResult, onAuthStateChanged, signOut } from "firebase/auth";
import Home from './Home';
import Users from './Users';
import Lessons from './Lessons';
import Settings from './Settings';
import Login from "./Login";
import { auth } from "../firebase";

const ADMIN_SESSION_KEY = "cebulingo_admin_session_active";
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function AuthLoading() {
    return <div className="auth-loading">Checking admin access...</div>;
}

function ProtectedRoute({ authStatus, children }) {
    if (authStatus === "loading") {
        return <AuthLoading />;
    }

    if (authStatus !== "authenticated") {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function NavigationShell() {
    const [authState, setAuthState] = useState({
        status: "loading",
        error: ""
    });
    const authErrorRef = useRef("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setAuthState({
                    status: "unauthenticated",
                    error: authErrorRef.current
                });
                authErrorRef.current = "";
                return;
            }

            if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== "true") {
                authErrorRef.current = "Your admin session expired. Please sign in again.";
                await signOut(auth);
                return;
            }

            setAuthState({
                status: "loading",
                error: ""
            });

            try {
                const tokenResult = await getIdTokenResult(user);

                if (tokenResult.claims.admin === true) {
                    authErrorRef.current = "";
                    setAuthState({
                        status: "authenticated",
                        error: ""
                    });
                    return;
                }

                authErrorRef.current = "This account does not have admin access.";
                await signOut(auth);
            } catch (error) {
                authErrorRef.current = error.message || "Unable to verify admin access.";
                await signOut(auth);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (authState.status !== "authenticated") {
            return undefined;
        }

        let idleTimer = null;

        const signOutForInactivity = async () => {
            authErrorRef.current = "You were signed out after 5 minutes of inactivity.";
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
            await signOut(auth);
        };

        const resetIdleTimer = () => {
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(signOutForInactivity, IDLE_TIMEOUT_MS);
        };

        const activityEvents = [
            "click",
            "keydown",
            "mousemove",
            "scroll",
            "touchstart"
        ];

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, resetIdleTimer, { passive: true });
        });

        resetIdleTimer();

        return () => {
            window.clearTimeout(idleTimer);
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, resetIdleTimer);
            });
        };
    }, [authState.status]);

    const showNavigation = authState.status === "authenticated";
    const handleLogout = async () => {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        await signOut(auth);
    };

    return (
        <div>
            {showNavigation && (
                <div className="nav-cont">
                    <div className="logo-cont" >
                        <div className="logo-div">
                            <img src='images/logo.png' width="auto" height="80px"  alt="logo"/>
                        </div>
                        <div className="logo-div">
                            <div className="main-logo-text">CebuLingo Admin</div>
                            <div className="mini-logo-text">Management Dashboard</div>
                        </div>
                    </div>
                    {/* </Link> */}

                    <Link to="/home" className='Link'>Home</Link>
                    <Link to="/users" className='Link'>Users</Link>
                    <Link to="/lessons" className='Link'>Lessons</Link>
                    <Link to="/settings" className='Link'>Settings</Link>
                    <button type="button" className='Link nav-link-button' onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            )}

                <Routes>
                    <Route
                        path="/login"
                        element={
                            <Login
                                isAuthenticated={authState.status === "authenticated"}
                                authReady={authState.status !== "loading"}
                                authError={authState.error}
                            />
                        }
                    />
                    <Route
                        path="/"
                        element={
                            authState.status === "authenticated"
                                ? <Navigate to="/home" replace />
                                : <Navigate to="/login" replace />
                        }
                    />
                    <Route
                        path="/home"
                        element={
                            <ProtectedRoute authStatus={authState.status}>
                                <Home />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute authStatus={authState.status}>
                                <Users />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/lessons"
                        element={
                            <ProtectedRoute authStatus={authState.status}>
                                <Lessons />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute authStatus={authState.status}>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
        </div>
    );
}

function Navigation() {
    return (
        <BrowserRouter>
            <NavigationShell />
        </BrowserRouter>
    );
}

export default Navigation;
