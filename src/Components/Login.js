import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

function Login({ isAuthenticated, authReady, authError }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (authReady && isAuthenticated) {
        return <Navigate to="/home" replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!email.trim() || !password.trim()) {
            setError("Please enter both email and password.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (loginError) {
            if (
                loginError.code === "auth/invalid-credential" ||
                loginError.code === "auth/wrong-password" ||
                loginError.code === "auth/user-not-found"
            ) {
                setError("Invalid email or password.");
            } else {
                setError(loginError.message || "Login failed.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <img
                        src="images/logo.png"
                        alt="CebuLingo logo"
                        className="login-logo"
                    />
                    <div>
                        <h1>CebuLingo Admin</h1>
                        <p>Sign in with an approved admin account.</p>
                    </div>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <label className="login-field">
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="admin@example.com"
                            autoComplete="email"
                        />
                    </label>

                    <label className="login-field">
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                    </label>

                    {(error || authError) && (
                        <div className="login-error">{error || authError}</div>
                    )}

                    <button type="submit" className="login-button" disabled={isSubmitting}>
                        {isSubmitting ? "Signing In..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
