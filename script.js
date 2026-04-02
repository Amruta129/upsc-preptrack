// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyC12rmt0WxdDVUfyLw4lHK94uU1kbL47L8",
    authDomain: "preptrack---upsc.firebaseapp.com",
    projectId: "preptrack---upsc",
    storageBucket: "preptrack---upsc.firebasestorage.app",
    messagingSenderId: "426094667263",
    appId: "1:426094667263:web:517556eaf8581c648a33ca",
    measurementId: "G-6EXX7XY7T2"
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let allQuestions = [];
let quizData = [];
let currentIdx = 0;
let score = 0;
let currentUser = null;

// --- AUTH LOGIC ---
window.handleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => console.log("Logged in:", result.user.displayName))
        .catch((e) => alert("Login Error: " + e.message));
};

window.handleLogout = () => {
    auth.signOut().then(() => {
        localStorage.clear(); 
        window.location.reload();
    });
};

auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        updateUI(user);
        syncCloudData(user);
    } else {
        initGuestMode();
        updateLeaderboard(); 
    }
});

function updateUI(user) {
    const authArea = document.getElementById('auth-area');
    if (authArea) {
        authArea.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; background:#f1f5f9; padding:5px 12px; border-radius:20px;">
                <img src="${user.photoURL}" style="width:28px; border-radius:50%;">
                <span style="font-weight:600; font-size:0.85rem; color:#1e293b;">Officer ${user.displayName.split(' ')[0]}</span>
                <button onclick="handleLogout()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.75rem; margin-left:5px;">Logout</button>
            </div>
        `;
    }
}

// --- DATA SYNC & LEADERBOARD ---
async function syncCloudData(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists) {
        const data = doc.data();
        localStorage.setItem('upsc_streak', data.streak || 0);
        localStorage.setItem('upsc_last_date', data.last_date || "");
        localStorage.setItem('upsc_tasks', JSON.stringify(data.tasks || []));
        await userRef.update({ name: user.displayName });
    } else {
        await userRef.set({
            name: user.displayName,
            streak: parseInt(localStorage.getItem('upsc_streak')) || 0,
            last_date: localStorage.getItem('upsc_last_date') || "",
            tasks: JSON.parse(localStorage.getItem('upsc_tasks')) || []
        });
    }
    updateStreakDisplay();
    renderTasks();
    updateLeaderboard();
}

async function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;

    try {
        const snapshot = await db.collection('users')
            .orderBy('streak', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            leaderboardList.innerHTML = "<p style='font-size:0.8rem; color:gray; text-align:center;'>No rankings yet.</p>";
            return;
        }

        let html = '<table style="width:100%; border-collapse: collapse;">';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMe = currentUser && doc.id === currentUser.uid;
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; height: 45px; ${isMe ? 'background:#eef2ff;' : ''}">
                    <td style="padding-left:10px; font-weight:bold; color:#6366f1; width:30px;">${rank}</td>
                    <td style="font-size:0.9rem;">${data.name || "Officer"} ${isMe ? '(You)' : ''}</td>
                    <td style="text-align:right; padding-right:10px; font-weight:600; color:#f59e0b;">🔥 ${data.streak || 0}</td>
                </tr>`;
            rank++;
        });
        html += '</table>';
        leaderboardList.innerHTML = html;
    } catch (e) {
        console.error("Leaderboard Error:", e);
    }
}

// --- APP CORE LOGIC ---
async function init() {
    updateStreakDisplay();
    renderTasks();

    try {
        const response = await fetch('./questions.json');
        allQuestions = await response.json();
        console.log("Questions loaded:", allQuestions.length);
    } catch (e) { 
        console.error("JSON Load Error", e); 
    }
}

function initGuestMode() {
    init();
}

function updateStreakDisplay() {
    const streakEl = document.getElementById('streak-count');
    const savedStreak = parseInt(localStorage.getItem('upsc_streak')) || 0;
    if (streakEl) streakEl.innerText = savedStreak;
}

async function saveData(newStreak, newDate, newTasks) {
    if (newStreak !== null) localStorage.setItem('upsc_streak', newStreak);
    if (newDate !== null) localStorage.setItem('upsc_last_date', newDate);
    if (newTasks !== null) localStorage.setItem('upsc_tasks', JSON.stringify(newTasks));

    if (currentUser) {
        const updateObj = {};
        if (newStreak !== null) updateObj.streak = newStreak;
        if (newDate !== null) updateObj.last_date = newDate;
        if (newTasks !== null) updateObj.tasks = newTasks;
        await db.collection('users').doc(currentUser.uid).update(updateObj);
        updateLeaderboard(); 
    }
}

// --- QUIZ FUNCTIONS ---
window.startFilteredQuiz = (subject) => {
    currentIdx = 0; score = 0;
    
    let filtered = [];
    if (subject === 'All') {
        filtered = allQuestions;
    } else if (subject === 'Review') {
        // Simple logic: Just shuffle all for now, or filter by a 'wrong' flag if you implement it
        filtered = allQuestions.slice().sort(() => 0.5 - Math.random());
    } else {
        filtered = allQuestions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    if (filtered.length === 0) return alert("No questions found for " + subject);
    
    quizData = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
    document.getElementById('quiz-section').scrollIntoView({ behavior: 'smooth' });
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    container.innerHTML = `
        <div class="quiz-box animate-in">
            <div class="quiz-header" style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <span>Subject: <b>${q.subject}</b></span>
                <span>${currentIdx + 1}/${quizData.length}</span>
            </div>
            <p class="question-text">${q.q}</p>
            <div class="options-grid" style="display:grid; gap:10px;">
                ${q.opts.map((opt, i) => `<button class="quiz-btn" onclick="handleSelect(${i})">${opt}</button>`).join('')}
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.quiz-btn');
    
    // Disable all buttons after selection
    buttons.forEach(btn => btn.disabled = true);

    if (idx === q.ans) {
        score++;
        buttons[idx].style.background = "#dcfce7"; // Green
        buttons[idx].style.borderColor = "#22c55e";
    } else {
        buttons[idx].style.background = "#fee2e2"; // Red
        buttons[idx].style.borderColor = "#ef4444";
        // Show correct answer in green
        buttons[q.ans].style.background = "#dcfce7";
    }

    setTimeout(() => {
        currentIdx++;
        if (currentIdx < quizData.length) showQuestion();
        else showResults();
    }, 1000);
};

function showResults() {
    const container = document.getElementById('quiz-container');
    
    // Only update streak if it's a new day and they finished a quiz
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('upsc_last_date');
    
    if (lastDate !== today) {
        let streak = parseInt(localStorage.getItem('upsc_streak') || 0);
        streak++;
        saveData(streak, today, null);
        updateStreakDisplay();
        document.getElementById('success-modal').style.display = 'flex';
    }

    container.innerHTML = `
        <div class="results-card" style="text-align:center; padding:20px;">
            <h2>${score >= 7 ? 'Excellent, Officer!' : 'Keep Grinding!'}</h2>
            <h1 class="big-score">${score} / ${quizData.length}</h1>
            <button class="btn-primary" onclick="startFilteredQuiz('All')">Try Another Quiz</button>
        </div>`;
}

// --- TASK FUNCTIONS ---
window.renderTasks = () => {
    const taskList = document.getElementById('todo-list');
    if (!taskList) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    taskList.innerHTML = tasks.map((task, index) => `
        <li style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span style="${task.completed ? 'text-decoration: line-through; opacity:0.6;' : ''}">${task.text}</span>
        </li>`).join('');
};

window.addTask = () => {
    const input = document.getElementById('todo-input');
    if (!input || !input.value.trim()) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks.push({ text: input.value, completed: false });
    saveData(null, null, tasks);
    input.value = '';
    renderTasks();
};

window.toggleTask = (index) => {
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks[index].completed = !tasks[index].completed;
    saveData(null, null, tasks);
    renderTasks();
};

// Start the app
init();