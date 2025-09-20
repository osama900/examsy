let questions = [];
let encryptedCorrectAnswers = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let studentName = "";
let studentClass = "";
const encryptionKey = "res123dd75";

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

async function fetchQuestionsFromGoogleSheet() {
  try {
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLkPkWlvmFY-fBMPdLBtkJCRTxEKfq0WY4JFAWsTpUpGbGUYJfqItgW1DWUk2SWerDiM2bJ-oLnXsm/pub?output=csv"
    );

    if (!response.ok) {
      throw new Error("فشل في جلب الأسئلة من Google Sheet.");
    }
    const csv = await response.text();
    const rows = csv.split("\n").slice(1); // تخطي الصف الأول (الرأس)

    // استخراج اسم الاختبار من عنوان الصفحة
    let title = document.title;
    let testName = title.split(" - ")[0].trim(); // افتراض أن العنوان هو "اسم الاختبار - نص آخر"

    // تصفية الصفوف بناءً على تطابق test_name (العمود الأول الآن)
    const filteredRows = rows
      .map((row) => row.split(","))
      .filter((columns) => columns[0].trim() === testName);

    // التحقق مما إذا كانت هناك أسئلة مطابقة
    if (filteredRows.length === 0) {
      document.getElementById(
        "questionContainer"
      ).innerHTML = `<div class="error">لم يتم العثور على أسئلة لهذا الاختبار.</div>`;
      return;
    }

    // تحليل الصفوف المصفاة مع تعديل فهارس الأعمدة بسبب إضافة test_name
    const allData = filteredRows
      .map((columns) => {
        const question = columns[1].trim(); // السؤال الآن في العمود 1
        const options = columns
          .slice(2, 6) // الخيارات من العمود 2 إلى 5
          .map((option) => option.trim())
          .filter((option) => option !== "")
          .sort(() => Math.random() - 0.5); // خلط الخيارات عشوائيًا
        const correctAnswer = columns[6].trim(); // الإجابة الصحيحة في العمود 6
        const score = parseFloat(columns[7].trim() || 1); // الدرجة في العمود 7، افتراضيًا 1 إذا فارغ
        return { question, options, correctAnswer, score };
      })
      .sort(() => Math.random() - 0.5); // خلط الأسئلة عشوائيًا

    // تحضير الأسئلة والإجابات المشفرة
    questions = allData.map((q) => ({
      question: q.question,
      options: q.options,
      score: q.score,
    }));
    encryptedCorrectAnswers = allData.map((q) => encryptData(q.correctAnswer));

    // تحميل السؤال الأول
    currentQuestionIndex = 0;
    loadQuestion();
  } catch (error) {
    console.error("Error:", error);
    document.getElementById(
      "questionContainer"
    ).innerHTML = `<div class="error">حدث خطأ أثناء جلب الأسئلة: ${error.message}</div>`;
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
            <h3>سؤال ${currentQuestionIndex + 1} من ${questions.length}: ${
    question.question
  }</h3>
            ${question.options
              .map(
                (option, index) => `
                <div class="option ${
                  selectedAnswer === option ? "selected" : ""
                }" onclick="selectAnswer('${option}', ${currentQuestionIndex})">
                    ${String.fromCharCode(65 + index)}. ${option}
                </div>
            `
              )
              .join("")}
        </div>
        <div class="navigation">
            <div>
                <button onclick="previousQuestion()" ${
                  currentQuestionIndex === 0 ? "disabled" : ""
                }>السابق</button>
            </div>
            <div>
                <span>سؤال ${currentQuestionIndex + 1} من ${
    questions.length
  }</span>
            </div>
            <div>
                ${
                  currentQuestionIndex < questions.length - 1
                    ? `<button onclick="nextQuestion()">التالي</button>`
                    : `<button class="submit-btn" onclick="submitExam()">إنهاء الامتحان</button>`
                }
            </div>
        </div>
        <div class="question-indicators">
            ${questions
              .map(
                (_, index) => `
                <div class="indicator ${
                  userAnswers[index] ? "answered" : "unanswered"
                } ${
                  index === currentQuestionIndex ? "current" : ""
                }" onclick="goToQuestion(${index})">
                    ${index + 1}
                </div>
            `
              )
              .join("")}
        </div>
    `;
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
  const unansweredQuestions = questions
    .map((_, index) => (!userAnswers[index] ? index + 1 : null))
    .filter((index) => index !== null);

  if (unansweredQuestions.length > 0) {
    const confirmation = confirm(
      `لديك ${
        unansweredQuestions.length
      } أسئلة غير محلولة: ${unansweredQuestions.join(
        ", "
      )}. هل تريد إنهاء الامتحان؟`
    );
    if (!confirmation) {
      return;
    }
  }

  let totalScore = 0;
  let resultsHtml = `<h2 class="result-title">نتيجة ${studentName} - الشعبة ${studentClass}</h2><ul class="result-list">`;

  questions.forEach((q, index) => {
    const encryptedCorrect = encryptedCorrectAnswers[index];
    const correctAnswer = decryptData(encryptedCorrect);
    const isCorrect = userAnswers[index] === correctAnswer;
    totalScore += isCorrect ? q.score : 0;
    const answerClass = isCorrect ? "correct-answer" : "wrong-answer";
    resultsHtml += `<li class="result-item">سؤال ${index + 1}: ${
      q.question
    }<br>إجابتك: <span class="${answerClass}">${
      userAnswers[index] || "لم تجب"
    }</span><br>الإجابة الصحيحة: <span class="correct-answer">${correctAnswer}</span><br>نقاط: <span class="score">${
      isCorrect ? q.score : 0
    }</span></li>`;
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
    comparisonHtml += `الفرق: <span class="${
      scoreDifference > 0
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
  // استخراج اسم الاختبار من عنوان الصفحة لتخزينه في Firebase
  let title = document.title;
  let testName = title.split(" - ")[0].trim();

  // حفظ اسم الاختبار في localStorage مع بقية البيانات
  localStorage.setItem(
    "examResults_" + studentName + "_" + studentClass,
    JSON.stringify({
      name: studentName,
      class: studentClass,
      testName: testName, // إضافة اسم الاختبار
      score: totalScore,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    })
  );
  const maxScore = questions.reduce((sum, q) => sum + q.score, 0);

  // إضافة اسم الاختبار إلى البيانات المرسلة إلى Firebase
  const examData = {
    name: studentName,
    class: studentClass,
    testName: testName, // إضافة اسم الاختبار
    score: totalScore,
    maxScore: maxScore,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: firebase.firestore.Timestamp.fromDate(now),
  };

  db.collection("examResults")
    .add(examData)
    .then((docRef) => {
      alert("تم حفظ النتائج بنجاح في قاعدة البيانات!");
    })
    .catch((error) => {
      alert("حدث خطأ أثناء حفظ النتائج!");
    });
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
    // remove from DOM after animation
    toast.addEventListener("animationend", () => toast.remove(), {
      once: true,
    });
  }

  closeBtn.addEventListener("click", () => {
    clearTimeout(hideTimer);
    dismiss();
  });

  // Optional: Pause progress on hover
  toast.addEventListener("mouseenter", () => {
    progress.style.animationPlayState = "paused";
    clearTimeout(hideTimer);
  });
  toast.addEventListener("mouseleave", () => {
    const computed = getComputedStyle(progress);
    const remaining =
      (1 -
        parseFloat(
          computed.transform.split(",")[0]?.replace("matrix(", "") || 1
        )) *
      duration;
    // Fallback if transform read fails
    hideTimer = setTimeout(() => dismiss(), Math.max(200, remaining || 2000));
    progress.style.animationPlayState = "running";
  });

  return toast;
}

// Demo: trigger on button click
document.getElementById("btn").addEventListener("click", () => {
  showToast("This is your orange notification. It will close in 4 seconds.");
});

// Also fire one automatically on load (you can remove this line in your app)
window.addEventListener("load", () => {
  setTimeout(() => showToast("Saved successfully! ✅"), 500);
});
////     done notification
