// login.js

const USERS_KEY = "taskflow_users";

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const forgotBtn = document.getElementById("forgot-password");

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to parse users", e);
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// If already logged in, go straight to dashboard
const existingUserRaw = localStorage.getItem("taskflow_current_user");
if (existingUserRaw) {
  try {
    const existingUser = JSON.parse(existingUserRaw);
    if (existingUser && existingUser.email) {
      window.location.href = "dashboard.html";
    }
  } catch (e) {
    console.error("Failed to parse current user", e);
  }
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    alert("Please enter your email.");
    emailInput.focus();
    return;
  }

  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address (proper format).");
    emailInput.focus();
    return;
  }

  if (!password) {
    alert("Please enter your password.");
    passwordInput.focus();
    return;
  }

  if (password.length < 4) {
    alert("Password should be at least 4 characters.");
    return;
  }

  const users = loadUsers();

  // Existing user -> check password
  if (users[email]) {
    if (password === users[email].password) {
      const user = users[email];
      localStorage.setItem("taskflow_current_user", JSON.stringify(user));
      window.location.href = "dashboard.html";
    } else {
      alert("Incorrect password. Please try again or use 'Forgot password?'.");
    }
  } else {
    // New user -> create account
    const nameFromEmail = email.split("@")[0] || "User";

    const user = {
      name: nameFromEmail,
      email,
      password,
    };

    users[email] = user;
    saveUsers(users);

    localStorage.setItem("taskflow_current_user", JSON.stringify(user));
    window.location.href = "dashboard.html";
  }
});

// Forgot password flow from login page
forgotBtn.addEventListener("click", () => {
  let email = emailInput.value.trim();

  if (!email) {
    email = prompt("Enter your registered email:");
    if (!email) return;
    email = email.trim();
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  const users = loadUsers();
  if (!users[email]) {
    alert("No account found with this email.");
    return;
  }

  const newPass = prompt("Enter a new password (min 4 characters):");
  if (!newPass) return;
  const trimmed = newPass.trim();
  if (trimmed.length < 4) {
    alert("Password too short. Password not changed.");
    return;
  }

  users[email].password = trimmed;
  saveUsers(users);

  alert("Password reset successfully. Please login again with your new password.");
});
