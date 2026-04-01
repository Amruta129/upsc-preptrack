const dailyQuestions = [
    {
        question: "Which ancient town is known for its water management system?",
        options: ["Dholavira", "Rakhi-garhi", "Ropar", "Lothal"],
        correct: 0
    },
    {
        question: "The 'Rakhmabai case of 1884' revolved around:",
        options: ["Women's education", "Age of consent", "Restitution of conjugal rights", "Both 2 and 3"],
        correct: 3
    }
];

let currentQuestion = 0;

function renderQuiz() {
    const container = document.getElementById('quiz-container');
    
    // Safety check: stops the code from breaking if the HTML ID is missing
    if (!container) return;

    const q = dailyQuestions[currentQuestion];
    
    container.innerHTML = `
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
            <p style="font-weight: bold; margin-bottom: 15px;">${q.question}</p>
            ${q.options.map((opt, i) => `
                <button onclick="checkAnswer(${i})" style="display: block; width: 100%; margin: 8px 0; padding: 10px; cursor: pointer; border: 1px solid #6366f1; border-radius: 5px; background: white;">
                    ${opt}
                </button>
            `).join('')}
        </div>
    `;
}

window.checkAnswer = (index) => {
    if (index === dailyQuestions[currentQuestion].correct) {
        alert("✅ Correct! Moving to next question.");
        currentQuestion++;
        if (currentQuestion < dailyQuestions.length) {
            renderQuiz();
        } else {
            document.getElementById('quiz-container').innerHTML = "<h3>🎉 Quiz Completed! Great job.</h3>";
        }
    } else {
        alert("❌ Incorrect. Try again!");
    }
};

// Start the quiz as soon as the page loads
document.addEventListener('DOMContentLoaded', renderQuiz);