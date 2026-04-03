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
                <img src="${user.photoURL}" class="user-img" style="width:25px; border-radius:50%; margin-right:8px; vertical-align:middle;">
                <span style="font-size:0.85rem; font-weight:600;">Officer ${user.displayName.split(' ')[0]}</span>
                <button onclick="handleLogout()" class="logout-btn" style="margin-left:8px; background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.75rem;">Logout</button>
            </div>`;
    }
}

// --- DATA SYNC & ANALYTICS ---
async function syncCloudData(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (doc.exists) {
        const data = doc.data();
        localStorage.setItem('upsc_streak', data.streak || 0);
        localStorage.setItem('upsc_points', data.points || 0);
        localStorage.setItem('upsc_history', JSON.stringify(data.history || {}));
        localStorage.setItem('upsc_tasks', JSON.stringify(data.tasks || []));
    } else {
        await userRef.set({
            name: user.displayName,
            streak: parseInt(localStorage.getItem('upsc_streak')) || 0,
            points: parseInt(localStorage.getItem('upsc_points')) || 0,
            history: JSON.parse(localStorage.getItem('upsc_history')) || {},
            tasks: JSON.parse(localStorage.getItem('upsc_tasks')) || []
        }, { merge: true });
    }
    renderAllStats();
}

function renderAllStats() {
    updateStreakDisplay();
    renderTasks();
    renderHeatmap();
    updateLeaderboard();
    updateAnalytics();
}

function updateAnalytics() {
    const pts = localStorage.getItem('upsc_points') || 0;
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const totalSolved = Object.values(history).reduce((a, b) => a + b, 0);
    
    if(document.getElementById('points-val')) document.getElementById('points-val').innerText = pts;
    if(document.getElementById('solved-count')) document.getElementById('solved-count').innerText = totalSolved;
    
    // Simple accuracy fill logic (Total Solved vs 160 Target)
    const fill = document.getElementById('accuracy-fill');
    if(fill) {
        let percent = (totalSolved / 160) * 100;
        fill.style.width = Math.min(100, percent) + '%';
    }
}

// --- GITHUB-STYLE HEATMAP ---
function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('upsc_history')) || {};
    
    container.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const day = new Date();
        day.setDate(day.getDate() - (27 - i));
        const dateStr = day.toDateString();
        
        const square = document.createElement('div');
        square.className = 'heat-sq';
        if (history[dateStr]) {
            square.classList.add(history[dateStr] > 10 ? 'active-high' : 'active');
        }
        square.title = `${dateStr}: ${history[dateStr] || 0} MCQs`;
        container.appendChild(square);
    }
}

async function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    try {
        const snapshot = await db.collection('users').orderBy('points', 'desc').limit(5).get();
        let html = '<table class="leaderboard-table">';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMe = currentUser && doc.id === currentUser.uid;
            html += `
                <tr class="${isMe ? 'highlight-me' : ''}">
                    <td style="font-weight:700; color:#6366f1;">#${rank}</td>
                    <td style="font-size:0.85rem;">${data.name || "Officer"}</td>
                    <td style="text-align:right; font-weight:600;">⭐ ${data.points || 0}</td>
                </tr>`;
            rank++;
        });
        leaderboardList.innerHTML = html + '</table>';
    } catch (e) { console.error(e); }
}

// --- CORE QUIZ LOGIC ---
async function init() {
    renderAllStats();
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

window.startFilteredQuiz = (subject) => {
    currentIdx = 0; score = 0;
    let filtered = [];

    if (subject === 'Review') {
        filtered = allQuestions.filter(q => wrongQuestions.includes(q.id));
        if (filtered.length === 0) return alert("No mistakes found! Start a new drill.");
    } else if (subject === 'All') {
        filtered = allQuestions;
    } else {
        filtered = allQuestions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    if (filtered.length === 0) return alert("No questions found for this category.");
    quizData = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    
    let difficulty = q.id % 3 === 0 ? 'Hard' : (q.id % 2 === 0 ? 'Medium' : 'Easy');
    let diffColor = difficulty === 'Easy' ? '#00b8a3' : (difficulty === 'Medium' ? '#ffb800' : '#ff2d55');

    container.innerHTML = `
        <div class="quiz-card animate-in">
            <div class="quiz-meta" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
                <span class="subject-tag" style="background:#f1f5f9; padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">${q.subject}</span>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="color:${diffColor}; font-weight:bold; font-size:0.75rem;">${difficulty}</span>
                    <span style="font-size:0.75rem; color:#94a3b8;">${currentIdx + 1}/10</span>
                </div>
            </div>
            <h2 class="question-text" style="font-size:1.15rem; margin-bottom:20px; line-height:1.4;">${q.q}</h2>
            
            <div class="options-container">
                ${q.opts.map((opt, i) => `
                    <button class="option-row" onclick="handleSelect(${i})">
                        <span class="opt-letter">${String.fromCharCode(65+i)}</span>
                        <span class="opt-text">${opt}</span>
                    </button>
                `).join('')}
            </div>

            <div id="feedback-area" style="display:none; margin-top:20px; border-top:1px solid #e2e8f0; padding-top:15px;">
                <div style="background:#f8fafc; padding:12px; border-radius:8px; border-left:4px solid #4f46e5;">
                    <p style="font-size:0.7rem; color:#64748b; text-transform:uppercase; margin-bottom:5px; font-weight:700;">
                        Source: ${q.source || 'Official UPSC Archives'}
                    </p>
                    <p style="font-size:0.85rem; color:#1e293b; line-height:1.5;">
                        <strong>💡 Insight:</strong> ${q.explanation || 'This question tests your conceptual clarity on the topic. Refer to NCERT for deeper context.'}
                    </p>
                </div>
                <button onclick="nextStep()" class="btn-primary" style="width:100%; margin-top:15px; padding:12px; border-radius:8px;">Next Question →</button>
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.option-row');
    buttons.forEach(btn => btn.disabled = true);

    let pointsEarned = 0;
    if (idx === q.ans) {
        score += 1;
        pointsEarned = 10;
        buttons[idx].classList.add('correct');
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
    } else {
        score -= 0.33;
        pointsEarned = -2;
        buttons[idx].classList.add('wrong');
        buttons[q.ans].classList.add('correct');
        if (!wrongQuestions.includes(q.id)) wrongQuestions.push(q.id);
    }
    
    updatePoints(pointsEarned);
    localStorage.setItem('upsc_wrong_pool', JSON.stringify(wrongQuestions));
    
    // Reveal professional feedback
    document.getElementById('feedback-area').style.display = 'block';
};

window.nextStep = () => {
    currentIdx++;
    if (currentIdx < quizData.length) showQuestion();
    else showResults();
};

function updatePoints(pts) {
    let p = parseInt(localStorage.getItem('upsc_points')) || 0;
    p = Math.max(0, p + pts);
    localStorage.setItem('upsc_points', p);
    updateAnalytics();
}

function showResults() {
    const container = document.getElementById('quiz-container');
    const today = new Date().toDateString();
    
    let history = JSON.parse(localStorage.getItem('upsc_history')) || {};
    history[today] = (history[today] || 0) + quizData.length;
    
    let streak = parseInt(localStorage.getItem('upsc_streak') || 0);
    if (localStorage.getItem('upsc_last_date') !== today) {
        streak++;
    }

    saveData(streak, today, null, history, localStorage.getItem('upsc_points'));
    renderAllStats();

    container.innerHTML = `
        <div class="results-card" style="text-align:center; padding:40px;">
            <div style="font-size:4rem; margin-bottom:10px;">${score >= 6 ? '🦁' : '📖'}</div>
            <h2 style="margin-bottom:5px;">Drill Complete</h2>
            <p style="color:#64748b; margin-bottom:20px;">Score: <span style="color:#1e293b; font-weight:800;">${score.toFixed(2)} / 10</span></p>
            
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button class="whatsapp-btn" onclick="shareResults()" style="width:100%; padding:12px; border-radius:8px; background:#25d366; color:white; border:none; font-weight:600; cursor:pointer;">Share to WhatsApp</button>
                <button onclick="location.reload()" style="background:none; border:none; color:#4f46e5; font-weight:600; cursor:pointer; margin-top:10px;">Back to Dashboard</button>
            </div>
        </div>`;
}

window.shareResults = () => {
    const streak = localStorage.getItem('upsc_streak');
    const text = `🔥 My UPSC Streak is ${streak} Days on PrepTrack! \nConsistency is the key to LBSNAA 🇮🇳\nStart your drill here: [YOUR_URL]`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
};

// --- TASKS ---
window.renderTasks = () => {
    const taskList = document.getElementById('todo-list');
    if (!taskList) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    taskList.innerHTML = tasks.map((task, i) => `
        <li class="task-item" style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #f1f5f9;">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${i})">
            <span style="${task.completed ? 'text-decoration:line-through; color:#94a3b8;' : ''}; font-size:0.9rem;">${task.text}</span>
        </li>`).join('');
};

window.addTask = () => {
    const input = document.getElementById('todo-input');
    if (!input || !input.value.trim()) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks.push({ text: input.value, completed: false });
    saveData(null, null, tasks, null, null);
    input.value = '';
    renderTasks();
};

window.toggleTask = (i) => {
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks[i].completed = !tasks[i].completed;
    saveData(null, null, tasks, null, null);
    renderTasks();
};

async function saveData(s, d, t, h, pts) {
    if (s !== null) localStorage.setItem('upsc_streak', s);
    if (d !== null) localStorage.setItem('upsc_last_date', d);
    if (t !== null) localStorage.setItem('upsc_tasks', JSON.stringify(t));
    if (h !== null) localStorage.setItem('upsc_history', JSON.stringify(h));
    
    if (currentUser) {
        const obj = {};
        if (s !== null) obj.streak = s;
        if (d !== null) obj.last_date = d;
        if (t !== null) obj.tasks = t;
        if (h !== null) obj.history = h;
        if (pts !== null) obj.points = parseInt(pts);
        await db.collection('users').doc(currentUser.uid).set(obj, { merge: true });
        updateLeaderboard();
    }
}

init();