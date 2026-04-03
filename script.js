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

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

let allQuestions = [];
let quizData = [];
let currentIdx = 0;
let score = 0;
let currentUser = null;
let wrongQuestions = JSON.parse(localStorage.getItem('upsc_wrong_pool')) || [];

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
            <div class="user-pill">
                <img src="${user.photoURL}" class="user-img">
                <span>Officer ${user.displayName.split(' ')[0]}</span>
                <button onclick="handleLogout()" class="logout-btn">Logout</button>
            </div>`;
    }
}

// --- DATA SYNC ---
async function syncCloudData(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (doc.exists) {
        const data = doc.data();
        localStorage.setItem('upsc_streak', data.streak || 0);
        localStorage.setItem('upsc_last_date', data.last_date || "");
        localStorage.setItem('upsc_tasks', JSON.stringify(data.tasks || []));
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
        const snapshot = await db.collection('users').orderBy('streak', 'desc').limit(5).get();
        let html = '<table class="leaderboard-table">';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMe = currentUser && doc.id === currentUser.uid;
            html += `
                <tr class="${isMe ? 'highlight-me' : ''}">
                    <td>${rank}</td>
                    <td>${data.name || "Officer"}</td>
                    <td style="text-align:right">🔥 ${data.streak || 0}</td>
                </tr>`;
            rank++;
        });
        leaderboardList.innerHTML = html + '</table>';
    } catch (e) { console.error(e); }
}

// --- CORE APP LOGIC ---
async function init() {
    updateStreakDisplay();
    renderTasks();
    try {
        const response = await fetch('./questions.json');
        allQuestions = await response.json();
    } catch (e) { console.error("JSON Error", e); }
}

function initGuestMode() { init(); }

function updateStreakDisplay() {
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.innerText = localStorage.getItem('upsc_streak') || 0;
}

// --- LEETCODE-STYLE QUIZ LOGIC ---
window.startFilteredQuiz = (subject) => {
    currentIdx = 0; score = 0;
    let filtered = [];

    if (subject === 'Review') {
        filtered = allQuestions.filter(q => wrongQuestions.includes(q.id));
        if (filtered.length === 0) return alert("No wrong answers to review yet! Practice more first.");
    } else if (subject === 'All') {
        filtered = allQuestions;
    } else {
        filtered = allQuestions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    quizData = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
    document.getElementById('quiz-section').scrollIntoView({ behavior: 'smooth' });
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    
    // Determine Difficulty Tag (LeetCode Style)
    let difficulty = q.id % 3 === 0 ? 'Hard' : (q.id % 2 === 0 ? 'Medium' : 'Easy');
    let diffColor = difficulty === 'Easy' ? '#00b8a3' : (difficulty === 'Medium' ? '#ffb800' : '#ff2d55');

    container.innerHTML = `
        <div class="quiz-card animate-in">
            <div class="quiz-meta">
                <span class="subject-tag">${q.subject}</span>
                <span style="color:${diffColor}; font-weight:bold; font-size:0.8rem;">${difficulty}</span>
                <span class="q-count">${currentIdx + 1} / ${quizData.length}</span>
            </div>
            <h2 class="question-text">${q.q}</h2>
            <div class="options-container">
                ${q.opts.map((opt, i) => `
                    <button class="option-row" onclick="handleSelect(${i})">
                        <span class="opt-letter">${String.fromCharCode(65+i)}</span>
                        <span class="opt-text">${opt}</span>
                    </button>
                `).join('')}
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.option-row');
    buttons.forEach(btn => btn.disabled = true);

    if (idx === q.ans) {
        score += 1;
        buttons[idx].classList.add('correct');
        // If they got it right, remove from wrong pool
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
    } else {
        score -= 0.33; // UPSC Negative Marking
        buttons[idx].classList.add('wrong');
        buttons[q.ans].classList.add('correct');
        // Add to wrong pool for later review
        if (!wrongQuestions.includes(q.id)) wrongQuestions.push(q.id);
    }
    
    localStorage.setItem('upsc_wrong_pool', JSON.stringify(wrongQuestions));

    setTimeout(() => {
        currentIdx++;
        if (currentIdx < quizData.length) showQuestion();
        else showResults();
    }, 1200);
};

function showResults() {
    const container = document.getElementById('quiz-container');
    const finalScore = score.toFixed(2);
    
    // Streak Logic
    const today = new Date().toDateString();
    if (localStorage.getItem('upsc_last_date') !== today) {
        let streak = parseInt(localStorage.getItem('upsc_streak') || 0) + 1;
        saveData(streak, today, null);
        updateStreakDisplay();
    }

    container.innerHTML = `
        <div class="results-card">
            <div class="status-icon">${score >= 6 ? '🏆' : '📚'}</div>
            <h2>Session Result</h2>
            <div class="score-display">
                <span class="score-num">${finalScore}</span>
                <span class="score-total">/ ${quizData.length}</span>
            </div>
            <p class="penalty-note">Includes -0.33 negative marking</p>
            <div class="result-actions">
                <button class="btn-primary" onclick="startFilteredQuiz('All')">Next Drill</button>
                <button class="btn-outline" onclick="startFilteredQuiz('Review')">Review Mistakes (${wrongQuestions.length})</button>
            </div>
        </div>`;
}

// --- TASKS ---
window.renderTasks = () => {
    const taskList = document.getElementById('todo-list');
    if (!taskList) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    taskList.innerHTML = tasks.map((task, i) => `
        <li class="task-item">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${i})">
            <span class="${task.completed ? 'done' : ''}">${task.text}</span>
        </li>`).join('');
};

window.addTask = () => {
    const input = document.getElementById('todo-input');
    if (!input.value.trim()) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks.push({ text: input.value, completed: false });
    saveData(null, null, tasks);
    input.value = '';
    renderTasks();
};

window.toggleTask = (i) => {
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks[i].completed = !tasks[i].completed;
    saveData(null, null, tasks);
    renderTasks();
};

async function saveData(s, d, t) {
    if (s !== null) localStorage.setItem('upsc_streak', s);
    if (d !== null) localStorage.setItem('upsc_last_date', d);
    if (t !== null) localStorage.setItem('upsc_tasks', JSON.stringify(t));
    if (currentUser) {
        const obj = {};
        if (s !== null) obj.streak = s;
        if (d !== null) obj.last_date = d;
        if (t !== null) obj.tasks = t;
        await db.collection('users').doc(currentUser.uid).update(obj);
        updateLeaderboard();
    }
}

init();