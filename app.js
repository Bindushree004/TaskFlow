// app.js

// Selectors
const userNameSpan = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");

// Task form & list
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const dueInput = document.getElementById("task-due");   // date
const timeInput = document.getElementById("task-time"); // time
const prioritySelect = document.getElementById("task-priority");
const categorySelect = document.getElementById("task-category");
const taskList = document.getElementById("task-list");
const filterChips = document.querySelectorAll(".filter-chip");
const searchInput = document.getElementById("search-input");

const clearCompletedBtn = document.getElementById("clear-completed");
const deleteAllBtn = document.getElementById("delete-all");

// Stats elements
const statTotal = document.getElementById("stat-total");
const statCompleted = document.getElementById("stat-completed");
const statRemaining = document.getElementById("stat-remaining");
const progressFill = document.getElementById("progress-fill");
const progressPercentSpan = document.getElementById("progress-percent");
const moodText = document.getElementById("mood-text");

// Profile elements
const profileNameInput = document.getElementById("profile-name");
const profileEmailSpan = document.getElementById("profile-email");
const saveProfileBtn = document.getElementById("save-profile");

// Weekly / pie chart elements
const weekBarsContainer = document.getElementById("week-bars");
const pieChart = document.getElementById("pie-chart");

// Reminder sound + toast elements (may be null if not in HTML)
const reminderAudio = document.getElementById("reminder-audio");
const toastContainer = document.getElementById("toast-container");

const STORAGE_PREFIX = "taskflow_tasks_";
const USERS_KEY = "taskflow_users";

let currentUser = null;
let tasks = [];
let currentFilter = "all";
let searchTerm = "";

// ===== User handling =====
function loadCurrentUser() {
  const raw = localStorage.getItem("taskflow_current_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
    return null;
  }
}

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

// Redirect to login if no user
currentUser = loadCurrentUser();
if (!currentUser) {
  window.location.href = "index.html";
} else {
  userNameSpan.textContent = currentUser.name || "User";
  profileNameInput.value = currentUser.name || "";
  profileEmailSpan.textContent = currentUser.email || "";
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("taskflow_current_user");
  window.location.href = "index.html";
});

// Save profile
saveProfileBtn.addEventListener("click", () => {
  const newName = profileNameInput.value.trim();
  if (!newName) {
    alert("Name cannot be empty.");
    return;
  }

  currentUser.name = newName;
  localStorage.setItem("taskflow_current_user", JSON.stringify(currentUser));

  // Update in users list
  const users = loadUsers();
  if (users[currentUser.email]) {
    users[currentUser.email].name = newName;
    saveUsers(users);
  }

  userNameSpan.textContent = newName;
  alert("Profile updated successfully.");
});

// ===== Task storage helpers =====
function loadTasks() {
  if (!currentUser) return;
  const key = STORAGE_PREFIX + currentUser.email;
  const raw = localStorage.getItem(key);
  try {
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse tasks", e);
    tasks = [];
  }
}

function saveTasks() {
  if (!currentUser) return;
  const key = STORAGE_PREFIX + currentUser.email;
  localStorage.setItem(key, JSON.stringify(tasks));
}

// ===== Utils =====
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${date} · ${time}`;
}

// Combine date (yyyy-mm-dd) and time (HH:MM) into one string
function combineDateTime(dateValue, timeValue) {
  if (!dateValue) return null;        // no date => no reminder
  if (!timeValue) return dateValue;   // date only
  return `${dateValue}T${timeValue}`; // example: 2025-11-28T22:30
}

// Show date + time nicely
function formatDueDate(dueDate) {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return "No due date";

  // Example: "Nov 28, 10:30 PM"
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===== Rendering =====
function renderTasks() {
  taskList.innerHTML = "";

  const filtered = tasks.filter((task) => {
    // Filter by active/completed
    if (currentFilter === "active" && task.completed) return false;
    if (currentFilter === "completed" && !task.completed) return false;

    // Filter by search
    if (searchTerm) {
      const text = (task.text || "").toLowerCase();
      const cat = (task.category || "").toLowerCase();
      if (!text.includes(searchTerm) && !cat.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      tasks.length === 0
        ? "No tasks yet. Add your first one 🌱"
        : "No tasks match this filter / search.";
    taskList.appendChild(empty);
  } else {
    filtered.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.dataset.id = task.id;

      const dueLabel = formatDueDate(task.dueDate);
      const priorityLabel = task.priority || "medium";
      const categoryLabel = task.category || "Other";

      li.innerHTML = `
        <div class="task-left" data-action="toggle">
          <div class="checkbox" data-action="toggle">
            <div class="checkbox-inner" data-action="toggle" style="
              background: ${task.completed ? "#6c5ce7" : "transparent"};
            "></div>
          </div>
          <div data-action="toggle">
            <span class="task-text ${
              task.completed ? "completed" : ""
            }" data-action="toggle">${escapeHtml(task.text)}</span>
            <span class="task-meta">
              ${dueLabel} · ${priorityLabel.toUpperCase()} · ${escapeHtml(
        categoryLabel
      )}
            </span>
            <span class="task-meta">${formatDateTime(task.createdAt)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit" title="Edit task">✏️</button>
          <button class="icon-btn delete" data-action="delete" title="Delete task">🗑</button>
        </div>
      `;

      taskList.appendChild(li);
    });
  }

  updateStats();
}

// ===== Weekly stats and pie chart =====
function updateWeekAndPieStats() {
  // Weekly bars
  if (!weekBarsContainer || !pieChart) return;

  weekBarsContainer.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build last 7 days (oldest -> newest)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

  const completedCounts = days.map((day) => {
    const start = new Date(day);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    return tasks.filter((t) => {
      if (!t.completed || !t.completedAt) return false;
      const ct = new Date(t.completedAt);
      return ct >= start && ct <= end;
    }).length;
  });

  const maxCompleted = Math.max(0, ...completedCounts);

  days.forEach((day, idx) => {
    const bar = document.createElement("div");
    bar.className = "week-bar";

    const fill = document.createElement("div");
    fill.className = "week-bar-fill";

    const label = document.createElement("div");
    label.className = "week-bar-label";

    const weekday = day.toLocaleDateString([], { weekday: "short" });
    label.textContent = weekday[0]; // first letter (M, T, W...)

    let heightPercent = 0;
    if (maxCompleted > 0) {
      heightPercent = Math.round((completedCounts[idx] / maxCompleted) * 100);
    }
    fill.style.height = heightPercent + "%";

    bar.appendChild(fill);
    bar.appendChild(label);
    weekBarsContainer.appendChild(bar);
  });

  // Pie chart: completed vs remaining
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const remaining = total - completed;

  let angle = 0;
  if (total > 0) {
    angle = Math.round((completed / total) * 360);
  }

  // Completed in purple, remaining in yellow
  pieChart.style.background = `conic-gradient(#6c5ce7 0deg ${angle}deg, #ffeaa7 ${angle}deg 360deg)`;
}

// ===== Reminder toast + checking =====
function showReminderToast(taskText) {
  if (!toastContainer) {
    // Fallback if container not in HTML
    alert("Reminder: " + taskText);
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";

  toast.innerHTML = `
    <span class="toast-title">⏰ Task Reminder</span>
    <span class="toast-message">${taskText}</span>
  `;

  toastContainer.appendChild(toast);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.add("fade-out");
  }, 3000);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function checkReminders() {
  const now = Date.now();
  let changed = false;

  tasks.forEach((t) => {
    // Only remind if:
    // - not completed
    // - has dueDate
    // - not already reminded
    if (!t.completed && t.dueDate && !t.reminded) {
      const dueTime = new Date(t.dueDate).getTime();
      if (!isNaN(dueTime) && now >= dueTime) {
        t.reminded = true;
        changed = true;

        // Show on-screen notification
        showReminderToast(t.text);

        // Play sound if audio element exists
        if (reminderAudio) {
          try {
            reminderAudio.currentTime = 0;
            reminderAudio.play();
          } catch (err) {
            console.warn("Audio play might be blocked by browser:", err);
          }
        }
      }
    }
  });

  if (changed) {
    saveTasks();
  }
}

// ===== Stats =====
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const remaining = total - completed;

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statRemaining.textContent = remaining;

  let percent = 0;
  if (total > 0) {
    percent = Math.round((completed / total) * 100);
  }
  progressFill.style.width = percent + "%";
  progressPercentSpan.textContent = percent + "%";

  // Mood text
  if (total === 0) {
    moodText.textContent = "Start by adding a few tasks for today ✨";
  } else if (completed === 0) {
    moodText.textContent = "You’ve got this. Finish your first task 💪";
  } else if (remaining === 0) {
    moodText.textContent = "All tasks done – awesome job 🎉";
  } else if (percent < 50) {
    moodText.textContent = "Nice progress. Keep ticking off tasks 🌈";
  } else {
    moodText.textContent = "More than halfway there. Don't stop now 🚀";
  }

  updateWeekAndPieStats();
}

// ===== Actions =====
function addTask(text, dueDateTime, priority, category) {
  const trimmed = text.trim();
  if (!trimmed) {
    alert("Task title cannot be empty.");
    return;
  }

  const newTask = {
    id: Date.now().toString(),
    text: trimmed,
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
    dueDate: dueDateTime || null, // combined date + time
    priority: priority || "medium",
    category: category || "Other",
    reminded: false, // so we don't notify multiple times
  };

  tasks.unshift(newTask); // newest on top
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function editTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const updatedText = prompt("Edit task title:", task.text);
  if (updatedText === null) return; // cancelled
  const trimmed = updatedText.trim();
  if (!trimmed) {
    alert("Task cannot be empty.");
    return;
  }
  task.text = trimmed;
  saveTasks();
  renderTasks();
}

function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  renderTasks();
}

function deleteAll() {
  if (!tasks.length) return;
  const sure = confirm("Delete all tasks? This cannot be undone.");
  if (!sure) return;
  tasks = [];
  saveTasks();
  renderTasks();
}

// ===== Event listeners =====

// Add task
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const combinedDue = combineDateTime(dueInput.value, timeInput.value);

  addTask(
    taskInput.value,
    combinedDue,
    prioritySelect.value,
    categorySelect.value
  );

  taskInput.value = "";
  dueInput.value = "";
  timeInput.value = "";
  prioritySelect.value = "medium";
  categorySelect.value = "Study";
  taskInput.focus();
});

// Task list actions (toggle / edit / delete)
taskList.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const item = actionEl.closest(".task-item");
  if (!item) return;
  const id = item.dataset.id;

  if (action === "toggle") {
    toggleTask(id);
  } else if (action === "delete") {
    deleteTask(id);
  } else if (action === "edit") {
    editTask(id);
  }
});

// Filters
filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    filterChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    renderTasks();
  });
});

// Search
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  renderTasks();
});

// Clear buttons
clearCompletedBtn.addEventListener("click", () => {
  clearCompleted();
});

deleteAllBtn.addEventListener("click", () => {
  deleteAll();
});

// ===== Init =====
loadTasks();
renderTasks();

// Check reminders every 30 seconds
setInterval(checkReminders, 30000);
// Also run once at start
checkReminders();
