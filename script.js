const dailyQuestions = [
    {
        question: "1. Which ancient town is well-known for its elaborate system of water management?",
        options: ["Dholavira", "Rakhi-garhi", "Ropar", "Lothal"],
        correct: 0
    },
    {
        question: "2. The 'Rakhmabai case of 1884' revolved around which of the following?",
        options: ["Women's education", "Age of consent", "Restitution of conjugal rights", "Both 2 and 3"],
        correct: 3
    },
    {
        question: "3. In ancient India, the terms 'kulyavapa' and 'dronavapa' denote:",
        options: ["Measurement of land", "Coins", "Classification of urban land", "Religious rituals"],
        correct: 0
    }
];

let currentQuestion = 0;

function renderQuiz() {
    const quizDiv = document.getElementById('quiz');
    const q = dailyQuestions[currentQuestion];
    
    quizDiv.innerHTML = `
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <p style="font-weight: bold; color: #1e293b;">${q.question}</p>
            <div id="options-container">
                ${q.options.map((opt, i) => `
                    <button onclick="checkAnswer(${i})" style="display: block; width: 100%; text-align: left; padding: 10px; margin: 5px 0; border: 1px solid #cbd5e1; border-radius: 5px; cursor: pointer; background: white;">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

window.checkAnswer = (index) => {
    if (index === dailyQuestions[currentQuestion].correct) {
        alert("Correct! Jai Hind!");
        nextQuestion();
    } else {
        alert("Incorrect. Review the PYQ explanation.");
    }
};

function nextQuestion() {
    currentQuestion++;
    if (currentQuestion < dailyQuestions.length) {
        renderQuiz();
    } else {
        document.getElementById('quiz').innerHTML = "<h3>🎉 Daily Quiz Completed!</h3>";
    }
}

renderQuiz();