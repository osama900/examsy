let questions = [];
let encryptedCorrectAnswers = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let studentName = "";
let studentClass = "";
const encryptionKey = "res123dd75";

let totalTimeSeconds = 0;
let timeLeftSeconds = 0;
let timerInterval = null;

// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAiJVhRbPOR0ty2Zaoyu4FQj9U4_rpnCf8",
  authDomain: "examsy-21dc3.firebaseapp.com",
  projectId: "examsy-21dc3",
  storageBucket: "examsy-21dc3.firebasestorage.app",
  messagingSenderId: "357464025229",
  appId: "1:357464025229:web:b920c8290f985f54339ac4",
  measurementId: "G-CWZ7MR4V26",
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

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchQuestionsFromGoogleSheet() {
  try {
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvVdN_lBHHITLxPdjVMhbv4idCn56TNvRbeUjjrL_p-LaljPhzXEFojJ6eX-yVASpi2cMhkoD53hi7/pub?output=csv"
    );

    if (!response.ok) {
      throw new Error("فشل في جلب الأسئلة من Google Sheet.");
    }
    const csv = await response.text();
    const rows = csv.split("\n").slice(1);

    let title = document.title;
    let testName = title.split(" - ")[0].trim();

    const filteredRows = rows
      .map((row) => row.split(","))
      .filter((columns) => columns[0].trim() === testName);

    if (filteredRows.length === 0) {
      document.getElementById(
        "questionContainer"
      ).innerHTML = `<div class="error">لم يتم العثور على أسئلة لهذا الاختبار.</div>`;
      return;
    }

    const allData = filteredRows
      .map((columns) => {
        const question = columns[1].trim();
        const options = columns
          .slice(2, 6)
          .map((option) => option.trim())
          .filter((option) => option !== "")
          .sort(() => Math.random() - 0.5);
        const correctAnswer = columns[6].trim();
        const score = parseFloat(columns[7].trim() || 1);
        const type = parseInt(columns[9]?.trim() || 1);

        // قراءة الوقت: فقط إذا كان رقمًا موجبًا، وإلا 0
        let timeInMinutes = 0;
        const timeStr = columns[8]?.trim();
        if (timeStr !== "" && !isNaN(timeStr)) {
          const parsed = parseFloat(timeStr);
          if (parsed > 0) timeInMinutes = parsed;
        }

        return { question, options, correctAnswer, score, timeInMinutes, type };
      })
      .sort(() => Math.random() - 0.5);

    questions = allData.map((q) => ({
      question: q.question,
      options: q.options,
      score: q.score,
      type: q.type
    }));
    encryptedCorrectAnswers = allData.map((q) => encryptData(q.correctAnswer));

    // حساب الوقت الكلي بالثواني (قد يكون 0)
    totalTimeSeconds = 0; // Timer disabled by user request
    timeLeftSeconds = 0;

    currentQuestionIndex = 0;
    loadQuestion();

    // بدء المؤقّت فقط إذا كان هناك وقت محدد
    if (totalTimeSeconds > 0) {
      startTimer();
    }
  } catch (error) {
    console.error("Error:", error);
    document.getElementById(
      "questionContainer"
    ).innerHTML = `<div class="error">حدث خطأ أثناء جلب الأسئلة: ${error.message}</div>`;
  }
}

function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeftSeconds--;
    updateTimerDisplay();

    if (timeLeftSeconds <= 0) {
      clearInterval(timerInterval);
      alert("انتهى الوقت المخصص للاختبار!");
      submitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (totalTimeSeconds <= 0) {
    const existingTimer = document.getElementById("exam-timer");
    if (existingTimer) existingTimer.style.display = 'none';
    return;
  }

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  let timerElement = document.getElementById("exam-timer");
  if (!timerElement) {
    const examSection = document.getElementById("examSection");
    if (examSection) {
      timerElement = document.createElement("div");
      timerElement.id = "exam-timer";
      timerElement.style.cssText = `
        text-align: center;
        margin: 10px 0;
        padding: 8px;
        background-color: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-weight: bold;
        color: #e74c3c;
        font-size: 18px;
      `;
      examSection.insertBefore(
        timerElement,
        examSection.firstChild.nextSibling
      );
    }
  }
  if (timerElement) {
    timerElement.innerHTML = `الوقت المتبقي: <span>${display}</span>`;
  }
}

function startExam() {
  studentName = document.getElementById("studentName").value;
  studentClass = document.getElementById("studentClass").value;

  if (!studentName) {
    alert("من فضلك أدخل اسمك الرباعي!");
    return;
  }
  if (!studentClass) {
    alert("من فضلك اختر الشعبة!");
    return;
  }

  document.getElementById("startSection").style.display = "none";
  document.getElementById("examSection").style.display = "block";
  document.getElementById("questionContainer").innerHTML =
    '<div id="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetchQuestionsFromGoogleSheet();
}

function loadQuestion() {
  if (currentQuestionIndex < 0) currentQuestionIndex = 0;
  if (currentQuestionIndex >= questions.length)
    currentQuestionIndex = questions.length - 1;

  const questionContainer = document.getElementById("questionContainer");
  const question = questions[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex] || null;

  questionContainer.innerHTML = `
        <div class="question">
            <h3>سؤال ${currentQuestionIndex + 1} من ${questions.length}: ${question.question}</h3>
            
            ${question.type === 2 ? renderDragDrop(question, currentQuestionIndex) : renderMultipleChoice(question, currentQuestionIndex, selectedAnswer)}
            
        </div>
        <div class="navigation">
            <div>
                <button onclick="previousQuestion()" ${currentQuestionIndex === 0 ? "disabled" : ""}>السابق</button>
            </div>
            <div>
                <span>سؤال ${currentQuestionIndex + 1} من ${questions.length}</span>
            </div>
            <div>
                ${currentQuestionIndex < questions.length - 1
      ? `<button onclick="nextQuestion()">التالي</button>`
      : `<button class="submit-btn" onclick="submitExam()">إنهاء الامتحان</button>`
    }
            </div>
        </div>
        <div class="question-indicators">
            ${questions
      .map(
        (_, index) => `
                <div class="indicator ${userAnswers[index] && (Array.isArray(userAnswers[index]) ? userAnswers[index].length > 0 : true) ? "answered" : "unanswered"} ${index === currentQuestionIndex ? "current" : ""}" onclick="goToQuestion(${index})">
                    ${index + 1}
                </div>
            `
      )
      .join("")}
        </div>
    `;
}

function renderMultipleChoice(question, qIndex, selectedAnswer) {
  return question.options
    .map(
      (option, index) => `
                <div class="option ${selectedAnswer === option ? "selected" : ""}" onclick="selectAnswer('${option.replace(/'/g, "\\'")}', ${qIndex})">
                    ${String.fromCharCode(65 + index)}. ${option}
                </div>
            `
    )
    .join("");
}

function renderDragDrop(question, qIndex) {
  const currentAnswer = userAnswers[qIndex] || [];

  // Split each option into words and flatten the list to create individual word chips
  // Shuffle all words to randomize their appearance in the pool
  const allWordOptions = question.options
    .flatMap(option => option.split(/\s+/).filter(word => word.length > 0))
    .sort(() => Math.random() - 0.5);

  // The pool should only contain words not already in the current answer sequence
  const pool = allWordOptions.filter(word => {
    const countInPool = allWordOptions.filter(w => w === word).length;
    const countInAnswer = currentAnswer.filter(w => w === word).length;
    return countInAnswer < countInPool;
  });

  return `
    <div class="drag-drop-container">
      <span class="drop-label">رتب الإجابة هنا (اسحب لإعادة الترتيب):</span>
      <div class="drop-zone" id="drop-zone" 
           ondragover="event.preventDefault(); this.classList.add('drag-over')" 
           ondragleave="this.classList.remove('drag-over')"
           ondrop="this.classList.remove('drag-over'); handleDrop(event, -1)">
        ${currentAnswer.map((word, i) => `
          <div class="draggable-word" draggable="true" 
               ondragstart="handleDragStart(event, '${word.replace(/'/g, "\\'")}', ${i})"
               ondrop="handleDrop(event, ${i}); event.stopPropagation();"
               onclick="removeWordFromAnswer(${i})">${word}</div>
        `).join("")}
      </div>
      
      <span class="pool-label">اختر الكلمات:</span>
      <div class="word-pool" id="word-pool">
        ${pool.map((word) => `
          <div class="draggable-word" draggable="true" 
               ondragstart="handleDragStart(event, '${word.replace(/'/g, "\\'")}', -1)" 
               onclick="addWordToAnswer('${word.replace(/'/g, "\\'")}')">
            ${word}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function handleDragStart(e, word, index) {
  e.dataTransfer.setData("text/plain", word);
  e.dataTransfer.setData("sourceIndex", index);
}

function handleDrop(e, toIndex) {
  e.preventDefault();
  const word = e.dataTransfer.getData("text/plain");
  const fromIndex = parseInt(e.dataTransfer.getData("sourceIndex"));

  if (fromIndex === -1) {
    // Adding from pool
    addWordToAnswer(word, toIndex);
  } else {
    // Reordering within drop zone
    moveWordInAnswer(fromIndex, toIndex);
  }
}

function addWordToAnswer(word, toIndex = -1) {
  if (!userAnswers[currentQuestionIndex]) userAnswers[currentQuestionIndex] = [];
  if (!userAnswers[currentQuestionIndex].includes(word)) {
    if (toIndex === -1) {
      userAnswers[currentQuestionIndex].push(word);
    } else {
      userAnswers[currentQuestionIndex].splice(toIndex, 0, word);
    }
    loadQuestion();
  }
}

function moveWordInAnswer(fromIndex, toIndex) {
  const answer = userAnswers[currentQuestionIndex];
  if (!answer) return;

  // If dropped on the general zone (toIndex -1), move to end
  const targetIndex = toIndex === -1 ? answer.length - 1 : toIndex;

  const [movedWord] = answer.splice(fromIndex, 1);
  answer.splice(targetIndex, 0, movedWord);
  loadQuestion();
}

function removeWordFromAnswer(index) {
  if (userAnswers[currentQuestionIndex]) {
    userAnswers[currentQuestionIndex].splice(index, 1);
    loadQuestion();
  }
}

function selectAnswer(answer, qIndex) {
  userAnswers[qIndex] = answer;
  loadQuestion();
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    loadQuestion();
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function goToQuestion(index) {
  currentQuestionIndex = index;
  loadQuestion();
}

function returnToStart() {
  clearInterval(timerInterval);
  location.reload();
}

function showMessage(message, type = "success") {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.classList.add("show");
  setTimeout(() => {
    messageDiv.classList.remove("show");
  }, 3000);
}

function submitExam() {
  clearInterval(timerInterval);

  const unansweredQuestions = questions
    .map((_, index) => (!userAnswers[index] ? index + 1 : null))
    .filter((index) => index !== null);

  if (unansweredQuestions.length > 0) {
    const confirmation = confirm(
      `لديك ${unansweredQuestions.length
      } أسئلة غير محلولة: ${unansweredQuestions.join(
        ", "
      )}. هل تريد إنهاء الامتحان؟`
    );
    if (!confirmation) {
      if (totalTimeSeconds > 0) {
        startTimer(); // أعد تشغيل المؤقّت فقط إذا كان موجودًا
      }
      return;
    }
  }

  let totalScore = 0;
  let resultsHtml = `<h2 class="result-title">نتيجة ${escapeHTML(studentName)} - الشعبة ${escapeHTML(studentClass)}</h2><ul class="result-list">`;

  questions.forEach((q, index) => {
    const encryptedCorrect = encryptedCorrectAnswers[index];
    const correctAnswer = decryptData(encryptedCorrect);
    const userAnswer = Array.isArray(userAnswers[index]) ? userAnswers[index].join(" ") : userAnswers[index];
    const isCorrect = userAnswer === correctAnswer;
    totalScore += isCorrect ? q.score : 0;
    const answerClass = isCorrect ? "correct-answer" : "wrong-answer";
    resultsHtml += `<li class="result-item">سؤال ${index + 1}: ${escapeHTML(q.question)}<br>إجابتك: <span class="${answerClass}">${escapeHTML(userAnswer) || "لم تجب"}</span><br>الإجابة الصحيحة: <span class="correct-answer">${escapeHTML(correctAnswer)}</span><br>نقاط: <span class="score">${isCorrect ? q.score : 0}</span></li>`;
  });

  resultsHtml += `</ul>`;

  const previousResult = JSON.parse(
    localStorage.getItem("examResults_" + studentName + "_" + studentClass) ||
    "{}"
  );
  let comparisonHtml = "";
  if (previousResult && previousResult.score) {
    const scoreDifference = totalScore - previousResult.score;
    comparisonHtml = `<h3 class="comparison-title">المقارنة مع العلامة السابقة:</h3>`;
    comparisonHtml += `<p class="comparison-text">العلامة السابقة: <span class="previous-score">${previousResult.score}</span> في تاريخ ${previousResult.date} الساعة ${previousResult.time}<br>`;
    comparisonHtml += `العلامة الحالية: <span class="current-score">${totalScore}</span><br>`;
    comparisonHtml += `الفرق: <span class="${scoreDifference > 0
      ? "improved"
      : scoreDifference < 0
        ? "declined"
        : "no-change"
      }">${scoreDifference > 0 ? "+" : ""}${scoreDifference}</span> علامة</p>`;
    if (scoreDifference > 0) {
      comparisonHtml += `<p class="feedback improved">أحسنــت ! لقد تحسنت علامتك!</p>`;
    } else if (scoreDifference < 0) {
      comparisonHtml += `<p class="feedback declined">للأسف، انخفضت علامتك.</p>`;
    } else {
      comparisonHtml += `<p class="feedback no-change">لم يتغير مستواك.</p>`;
    }
  } else {
    comparisonHtml = `<p class="no-previous">هذه هي المرة الأولى التي تقوم فيها بالاختبار.</p>`;
  }

  resultsHtml += `<h3 class="total-score">العلامة الإجمالية: ${totalScore} من ${questions.reduce(
    (sum, q) => sum + q.score,
    0
  )}</h3>`;
  resultsHtml += comparisonHtml;
  resultsHtml += `<button onclick="returnToStart()" class="return-button">رجوع إلى البداية</button>`;
  resultsHtml += `<a href="../../../index.html" class="home-button">العودة إلى الصفحة الرئيسية</a>`;

  document.getElementById("questionContainer").style.display = "none";
  document.getElementById("resultSection").innerHTML = resultsHtml;
  document.getElementById("resultSection").style.display = "block";

  const now = new Date();
  let title = document.title;
  let testName = title.split(" - ")[0].trim();

  localStorage.setItem(
    "examResults_" + studentName + "_" + studentClass,
    JSON.stringify({
      name: studentName,
      class: studentClass,
      testName: testName,
      score: totalScore,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    })
  );
  const maxScore = questions.reduce((sum, q) => sum + q.score, 0);

  const storedStudent = JSON.parse(localStorage.getItem('loggedInStudent') || '{}');
  const studentEmail = storedStudent.email || localStorage.getItem('std_email') || "guest@examsy.com";

  const examData = {
    name: studentName,
    class: studentClass,
    testName: testName,
    score: totalScore,
    maxScore: maxScore,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: firebase.firestore.Timestamp.fromDate(now),
    studentEmail: studentEmail // Required for Firestore Rules
  };



  const saveToFirebase = (data) => {
    db.collection("examResults")
      .add(data)
      .then((docRef) => {

        alert("تم حفظ النتائج بنجاح في قاعدة البيانات!");
      })
      .catch((error) => {
        console.error("Firestore Error:", error);
        alert("حدث خطأ أثناء حفظ النتائج! " + (error.message || ""));
      });
  };

  // Ensure we are authenticated before writing
  const user = firebase.auth().currentUser;
  if (user) {
    saveToFirebase(examData);
  } else {

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        saveToFirebase(examData);
      } else {
        console.error("Unauthorized: No user logged in.");
        alert("فشل حفظ النتائج: يرجى تسجيل الدخول أولاً.");
      }
    }, { once: true });
  }

  // Award Coins logic
  if (window.coinsManager) {
    if (totalScore === maxScore && maxScore > 0) {
      window.coinsManager.addCoins(50, "علامة كاملة في الاختبار");
    } else if (totalScore > 0) {
      window.coinsManager.addCoins(10, "إكمال الاختبار");
    }
  }
}

// notification
function showToast(message, { duration = 4000 } = {}) {
  const stack = document.getElementById("toast-stack");

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "alert");
  toast.style.setProperty("--toast-duration", duration + "ms");

  const msg = document.createElement("div");
  msg.className = "toast__message";
  msg.textContent = "سيتم فتح الدرس لاحقا...";

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast__close";
  closeBtn.setAttribute("aria-label", "Close notification");
  closeBtn.innerHTML = "×";

  const progress = document.createElement("div");
  progress.className = "toast__progress";

  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  toast.appendChild(progress);
  stack.appendChild(toast);

  let hideTimer = setTimeout(() => dismiss(), duration);

  function dismiss() {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), {
      once: true,
    });
  }

  closeBtn.addEventListener("click", () => {
    clearTimeout(hideTimer);
    dismiss();
  });

  toast.addEventListener("mouseenter", () => {
    progress.style.animationPlayState = "paused";
    clearTimeout(hideTimer);
  });
  toast.addEventListener("mouseleave", () => {
    const computed = getComputedStyle(progress);
    const transformValue = computed.transform;
    let progressValue = 1;
    if (transformValue && transformValue !== "none") {
      const matrix = transformValue.split(",")[0]?.replace("matrix(", "");
      progressValue = parseFloat(matrix) || 1;
    }
    const remaining = (1 - progressValue) * duration;
    hideTimer = setTimeout(() => dismiss(), Math.max(200, remaining || 2000));
    progress.style.animationPlayState = "running";
  });

  return toast;
}

const btnElement = document.getElementById("btn");
if (btnElement) {
  btnElement.addEventListener("click", () => {
    showToast("This is your orange notification. It will close in 4 seconds.");
  });
}

window.addEventListener("load", () => {
  setTimeout(() => showToast("Saved successfully! ✅"), 500);
});

window.addEventListener("load", () => {
  const storedStudent = JSON.parse(
    localStorage.getItem("loggedInStudent") || "{}"
  );

  if (!storedStudent.name) {
    alert(
      "يرجى تسجيل الدخول قبل بدء الامتحان.\nإذا لم يكن معك معلومات تسجيل الدخول يرجى مراجعة الأستاذ أسامة."
    );
    window.location.href = "../../../index.html";
  } else {
    const studentNameInput = document.getElementById("studentName");
    studentNameInput.value = storedStudent.name;
    studentNameInput.setAttribute("readonly", true);

    if (storedStudent.class) {
      const studentClassInput = document.getElementById("studentClass");
      studentClassInput.value = storedStudent.class;
      studentClassInput.setAttribute("readonly", true);
    }
  }
});
