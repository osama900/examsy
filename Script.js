let questions = [];
let encryptedCorrectAnswers = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let studentName = '';
const encryptionKey = 'secretkey123';

// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAiJVhRbPOR0ty2Zaoyu4FQj9U4_rpnCf8",
    authDomain: "examsy-21dc3.firebaseapp.com",
    projectId: "examsy-21dc3",
    storageBucket: "examsy-21dc3.firebasestorage.app",
    messagingSenderId: "357464025229",
    appId: "1:357464025229:web:b920c8290f985f54339ac4",
    measurementId: "G-CWZ7MR4V26"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function encryptData(data) {
    return CryptoJS.AES.encrypt(data, encryptionKey).toString();
}

function decryptData(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
}

function fetchQuestionsFromGoogleSheet() {
    fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQiTMJLS9OPOepY4aooD20SQJE0MS4sKA5O50AJpKKe7zgaEA9zC_Fwqf6MKEZy75iRT4Ax6jctXPF-/pub?output=csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في جلب الأسئلة من Google Sheet.');
            }
            return response.text();
        })
        .then(csv => {
            const rows = csv.split('\n').slice(1);
            const allData = rows.map(row => {
                const columns = row.split(',');
                return {
                    question: columns[0].trim(),
                    options: [columns[1].trim(), columns[2].trim(), columns[3].trim(), columns[4].trim()].sort(() => Math.random() - 0.5),
                    correctAnswer: columns[5].trim(),
                    score: parseFloat(columns[6].trim() || 1)
                };
            }).sort(() => Math.random() - 0.5);

            questions = allData.map(q => ({
                question: q.question,
                options: q.options,
                score: q.score
            }));
            encryptedCorrectAnswers = allData.map(q => encryptData(q.correctAnswer));
            loadQuestion();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('حدث خطأ: ' + error.message);
        });
}

function startExam() {
    studentName = document.getElementById('studentName').value;
    if (!studentName) {
        alert('من فضلك أدخل اسمك الرباعي!');
        return;
    }
    document.getElementById('startSection').style.display = 'none';
    document.getElementById('examSection').style.display = 'block';
    document.getElementById('submitBtn').style.display = 'none';
    fetchQuestionsFromGoogleSheet();
}

function loadQuestion() {
    if (currentQuestionIndex < questions.length) {
        const questionContainer = document.getElementById('questionContainer');
        const question = questions[currentQuestionIndex];
        questionContainer.innerHTML = `
            <div class="question">
                <h3>سؤال ${currentQuestionIndex + 1}: ${question.question}</h3>
                ${question.options.map((option, index) => `
                    <div class="option" onclick="selectAnswer('${option}', ${currentQuestionIndex})">
                        ${String.fromCharCode(65 + index)}. ${option}
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('submitBtn').style.display = (currentQuestionIndex === questions.length - 1) ? 'block' : 'none';
    } else {
        submitExam();
    }
}

function selectAnswer(answer, qIndex) {
    userAnswers[qIndex] = answer;
    currentQuestionIndex++;
    loadQuestion();
}

function returnToStart() {
    document.getElementById('startSection').style.display = 'block';
    document.getElementById('examSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('studentName').value = '';
    currentQuestionIndex = 0;
    userAnswers = [];
    questions = [];
    encryptedCorrectAnswers = [];
}

function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.add('show');
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}

function submitExam() {
    let totalScore = 0;
    let resultsHtml = `<h2 class="result-title">نتيجة ${studentName}</h2><ul class="result-list">`;

    questions.forEach((q, index) => {
        const encryptedCorrect = encryptedCorrectAnswers[index];
        const correctAnswer = decryptData(encryptedCorrect);
        const isCorrect = userAnswers[index] === correctAnswer;
        totalScore += isCorrect ? q.score : 0;
        const answerClass = isCorrect ? 'correct-answer' : 'wrong-answer';
        resultsHtml += `<li class="result-item">سؤال ${index + 1}: ${q.question}<br>إجابتك: <span class="${answerClass}">${userAnswers[index] || 'لم تجب'}</span><br>الإجابة الصحيحة: <span class="correct-answer">${correctAnswer}</span><br>نقاط: <span class="score">${isCorrect ? q.score : 0}</span></li>`;
    });

    resultsHtml += `</ul>`;

    const previousResult = JSON.parse(localStorage.getItem('examResults_' + studentName) || '{}');
    let comparisonHtml = '';
    if (previousResult && previousResult.score) {
        const scoreDifference = totalScore - previousResult.score;
        comparisonHtml = `<h3 class="comparison-title">المقارنة مع العلامة السابقة:</h3>`;
        comparisonHtml += `<p class="comparison-text">العلامة السابقة: <span class="previous-score">${previousResult.score}</span> في تاريخ ${previousResult.date} الساعة ${previousResult.time}<br>`;
        comparisonHtml += `العلامة الحالية: <span class="current-score">${totalScore}</span><br>`;
        comparisonHtml += `الفرق: <span class="${scoreDifference > 0 ? 'improved' : scoreDifference < 0 ? 'declined' : 'no-change'}">${scoreDifference > 0 ? '+' : ''}${scoreDifference}</span> علامة</p>`;
        if (scoreDifference > 0) {
            comparisonHtml += `<p class="feedback improved">تهنئة! لقد تحسنت علامتك!</p>`;
        } else if (scoreDifference < 0) {
            comparisonHtml += `<p class="feedback declined">للأسف، انخفضت علامتك.</p>`;
        } else {
            comparisonHtml += `<p class="feedback no-change">لم يتغير مستواك.</p>`;
        }
    } else {
        comparisonHtml = `<p class="no-previous">هذه هي المرة الأولى التي تقوم فيها بالاختبار.</p>`;
    }

    resultsHtml += `<h3 class="total-score">العلامة الإجمالية: ${totalScore} من ${questions.reduce((sum, q) => sum + q.score, 0)}</h3>`;
    resultsHtml += comparisonHtml;
    resultsHtml += `<button onclick="returnToStart()" class="return-button">رجوع إلى البداية</button>`;

    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('resultSection').innerHTML = resultsHtml;
    document.getElementById('resultSection').style.display = 'block';

    const now = new Date();
    localStorage.setItem('examResults_' + studentName, JSON.stringify({
        name: studentName,
        score: totalScore,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
    }));

    // حفظ البيانات في Firestore
    const examData = {
        name: studentName,
        score: totalScore,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        timestamp: firebase.firestore.Timestamp.fromDate(now)
    };

    db.collection("examResults").add(examData)
        .then((docRef) => {
            console.log("تم الحفظ في Firebase بمعرف:", docRef.id);
            // showMessage("تم حفظ النتائج بنجاح في قاعدة البيانات!", "success");
            alert('تم حفظ النتائج بنجاح في قاعدة البيانات!')
        })
        .catch((error) => {
            console.error("خطأ في الحفظ:", error);
            showMessage("حدث خطأ أثناء حفظ النتائج!", "error");
            alert('حدث خطأ أثناء حفظ النتائج!')

        });
}

fetchQuestionsFromGoogleSheet();