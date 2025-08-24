import React, { useState, useEffect } from "react";
import axios from "axios";
import Loader from "../components/Loader";
import Error from "../components/Error";
import { Link } from "react-router-dom";
import { auth, provider } from "../utils/firebase"; // import firebase setup
import { signInWithPopup } from "firebase/auth";

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [captcha, setCaptcha] = useState(""); // State for generated captcha
  const [captchaInput, setCaptchaInput] = useState(""); // State for user's captcha input

  // Function to generate a random alphanumeric captcha
  const generateCaptcha = () => {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setCaptchaInput(""); // Clear previous input
  };

  // Generate captcha on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Existing Email+Password login
  async function login() {
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter email and password");
      return;
    }

    // Validate captcha
    if (captchaInput.toLowerCase() !== captcha.toLowerCase()) {
      setErrorMsg("Incorrect captcha. Please try again.");
      generateCaptcha(); // Generate new captcha on error
      return;
    }

    const user = { email: email.trim(), password };

    try {
      setLoading(true);
      const result = await axios.post("/api/users/login", user);
      setLoading(false);

      localStorage.setItem("currentUser", JSON.stringify(result.data.user));
      localStorage.setItem("token", result.data.token);
      window.location.href = "/home";
    } catch (error) {
      setLoading(false);
      const msg = error?.response?.data?.message || "Invalid Credentials";
      setErrorMsg(msg);
      generateCaptcha(); // Generate new captcha on login failure
    }
  }

  // Google Login with Firebase -> send to backend to upsert/login and get app token + user
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user; // Firebase user

      // Call backend to upsert/login google user and return our app user with _id
      const { data } = await axios.post('/api/users/google-login', {
        email: fbUser.email,
        name: fbUser.displayName,
        uid: fbUser.uid,
      });

      // Persist app user and app JWT (needed for booking flow expecting _id)
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      setLoading(false);
      window.location.href = '/home';
    } catch (error) {
      setLoading(false);
      const msg = error?.response?.data?.message || 'Google login failed';
      setErrorMsg(msg);
      console.error(error);
    }
  };

  return (
    <div>
      {loading && <Loader />}
      <div className="row justify-content-center mt-5">
        <div className="col-md-5 mt-5">
          {errorMsg && <Error message={errorMsg} />}
          <div className="bs text-center ">
            <h2>Login</h2>

            {/* Email & Password Login */}
            <input
              type="email"
              className="form-control"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Custom Captcha */}
            <div className="d-flex align-items-center mt-3 mb-3 justify-content-between">
              <div
                className="flex-grow-1 me-2"
                style={{
                  padding: "7px",
                  backgroundColor: "#f0f0f0",
                  borderRadius: "4px",
                  marginRight: "10px",
                  marginLeft: "10px",
                  // marginRight: "10px", // Replaced by me-2 class
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  fontSize: "1.2em",
                  // width: "100%", // Removed to allow proper flex behavior
                }}
              >
                {captcha}
              </div>
              <button
                className="btn btn-secondary w-20 p-2"
                onClick={generateCaptcha}
                style={{ flexShrink: 0 }}
              >
                Refresh
              </button>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Enter Captcha"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
            />

            <button className="btn btn-primary mt-3 w-50" onClick={login}>
              Login
            </button>
            {/* Google Login Button */}
            <button
              className="btn btn-danger mt-3 w-50 ml-5"
              onClick={handleGoogleLogin}
            >
              <i className="fab fa-google me-2"></i> Sign in with Google
            </button>
            <div className="text-center mt-2">
              <Link to="/forgotpassword">Forgot Password?</Link>
            </div>

            <div className="text-center mt-3">
              <small className="text-muted">Don’t have an account? </small>
              <Link to="/register">Register</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
