// Test script to verify quiz data format conversion
// This simulates the data flow from Gemini API to Frontend

// Simulated Gemini API response format
const geminiQuestions = [
    {
        question: "What is photosynthesis?",
        options: [
            { option: "Process of eating food", is_correct: false },
            { option: "Process of converting light to chemical energy", is_correct: true },
            { option: "Process of breathing", is_correct: false },
            { option: "Process of reproduction", is_correct: false }
        ],
        explanation: "Photosynthesis is the process by which plants convert light energy into chemical energy."
    },
    {
        question: "Where does photosynthesis occur?",
        options: [
            { option: "In the roots", is_correct: false },
            { option: "In the stem", is_correct: false },
            { option: "In the chloroplasts", is_correct: true },
            { option: "In the flowers", is_correct: false }
        ],
        explanation: "Photosynthesis occurs in the chloroplasts of plant cells."
    }
];

// Frontend conversion function
function convertToFrontendFormat(questions) {
    return questions.map(q => {
        const options = q.options.map(opt => opt.option || opt);
        const correct = q.options.findIndex(opt => opt.is_correct === true);
        return {
            question: q.question,
            options: options,
            correct: correct,
            explanation: q.explanation || ''
        };
    });
}

// Test the conversion
const frontendQuiz = convertToFrontendFormat(geminiQuestions);

console.log("🔍 Original Gemini Format:");
console.log(JSON.stringify(geminiQuestions[0], null, 2));

console.log("\n✅ Converted Frontend Format:");
console.log(JSON.stringify(frontendQuiz[0], null, 2));

console.log("\n📊 Quiz Summary:");
console.log(`Questions: ${frontendQuiz.length}`);
frontendQuiz.forEach((q, index) => {
    console.log(`Q${index + 1}: ${q.question}`);
    console.log(`   Correct answer: ${q.options[q.correct]} (index: ${q.correct})`);
    console.log(`   Explanation: ${q.explanation.substring(0, 50)}...`);
});

// Verify the structure
console.log("\n🔍 Structure Validation:");
const isValid = frontendQuiz.every(q => 
    q.question && 
    Array.isArray(q.options) && 
    q.options.length === 4 &&
    typeof q.correct === 'number' &&
    q.correct >= 0 && q.correct < 4
);

console.log(`Valid format: ${isValid ? '✅ YES' : '❌ NO'}`);

module.exports = { convertToFrontendFormat };
