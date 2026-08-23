/**
 * Quiz Hub - Google Apps Script Backend
 *
 * Google Spreadsheet IDs:
 * User Spreadsheet ID: 1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw
 * Quiz Spreadsheet ID: 1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho
 */

var USER_SPREADSHEET_ID = '1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw';
var QUIZ_SPREADSHEET_ID = '1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho';

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || 'ping';
    var data = params.data ? JSON.parse(params.data) : params;

    var result = handleAction(action, data);
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    var contents = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var action = contents.action || (e ? e.parameter.action : '');
    var data = contents.data || contents;

    var result = handleAction(action, data);
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main Action Router
 */
function handleAction(action, data) {
  ensureSheetStructures();

  switch (action) {
    case 'ping':
      return { success: true, message: 'Quiz Hub Apps Script Backend Active' };

    // User Operations
    case 'createUser':
      return createUser(data);
    case 'loginUser':
      return loginUser(data);
    case 'getUser':
      return getUser(data);

    // Quiz Operations
    case 'createQuiz':
      return createQuiz(data);
    case 'getQuiz':
      return getQuiz(data);
    case 'getUserQuizzes':
      return getUserQuizzes(data);
    case 'updateQuiz':
      return updateQuiz(data);
    case 'deleteQuiz':
      return deleteQuiz(data);

    // Attempt & Submission Operations
    case 'submitQuiz':
      return submitQuiz(data);

    // Analytics Operations
    case 'getAnalytics':
      return getAnalytics(data);

    default:
      return { success: false, error: 'Invalid action: ' + action };
  }
}

// --- Spreadsheet Setup & Initialization ---

function ensureSheetStructures() {
  // Ensure User Spreadsheet tabs
  var userSs = SpreadsheetApp.openById(USER_SPREADSHEET_ID);
  ensureSheet(userSs, 'Users', ['userId', 'name', 'email', 'password', 'createdAt']);

  // Ensure Quiz Spreadsheet tabs
  var quizSs = SpreadsheetApp.openById(QUIZ_SPREADSHEET_ID);
  ensureSheet(quizSs, 'Quizzes', [
    'quizId', 'userId', 'title', 'description', 'timerType', 'timerDuration',
    'anonymous', 'participantFields', 'showScore', 'allowPreviousQuestions',
    'status', 'createdAt', 'updatedAt'
  ]);
  ensureSheet(quizSs, 'Questions', ['questionId', 'quizId', 'questionText', 'order']);
  ensureSheet(quizSs, 'Options', ['optionId', 'questionId', 'optionText', 'isCorrect']);
  ensureSheet(quizSs, 'Attempts', [
    'attemptId', 'quizId', 'userId', 'participantData', 'score',
    'totalQuestions', 'correctCount', 'incorrectCount', 'completionTimeSeconds', 'submittedAt'
  ]);
  ensureSheet(quizSs, 'Answers', ['attemptId', 'questionId', 'selectedOptionIds', 'isCorrect']);
}

function ensureSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}

function getSheetData(ssId, sheetName) {
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    rows.push(row);
  }
  return rows;
}

// --- User Operations ---

function createUser(data) {
  if (!data.name || !data.email || !data.password) {
    return { success: false, error: 'Name, email, and password are required' };
  }

  var users = getSheetData(USER_SPREADSHEET_ID, 'Users');
  var emailClean = data.email.toString().trim().toLowerCase();

  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toString().toLowerCase() === emailClean) {
      return { success: false, error: 'An account with this email already exists' };
    }
  }

  var userId = data.userId || ('usr_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24));
  var createdAt = new Date().toISOString();

  var ss = SpreadsheetApp.openById(USER_SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Users');
  sheet.appendRow([userId, data.name.trim(), emailClean, data.password, createdAt]);

  return {
    success: true,
    user: {
      userId: userId,
      name: data.name.trim(),
      email: emailClean,
      createdAt: createdAt
    }
  };
}

function loginUser(data) {
  if (!data.email || !data.password) {
    return { success: false, error: 'Email and password are required' };
  }

  var users = getSheetData(USER_SPREADSHEET_ID, 'Users');
  var emailClean = data.email.toString().trim().toLowerCase();

  for (var i = 0; i < users.length; i++) {
    if (users[i].email.toString().toLowerCase() === emailClean) {
      if (users[i].password.toString() === data.password.toString()) {
        return {
          success: true,
          user: {
            userId: users[i].userId,
            name: users[i].name,
            email: users[i].email,
            createdAt: users[i].createdAt
          }
        };
      } else {
        return { success: false, error: 'Invalid email or password' };
      }
    }
  }

  return { success: false, error: 'Invalid email or password' };
}

function getUser(data) {
  if (!data.userId) return { success: false, error: 'User ID is required' };
  var users = getSheetData(USER_SPREADSHEET_ID, 'Users');
  for (var i = 0; i < users.length; i++) {
    if (users[i].userId === data.userId) {
      return {
        success: true,
        user: {
          userId: users[i].userId,
          name: users[i].name,
          email: users[i].email,
          createdAt: users[i].createdAt
        }
      };
    }
  }
  return { success: false, error: 'User not found' };
}

// --- Quiz Operations ---

function createQuiz(data) {
  if (!data.userId) return { success: false, error: 'User ID is required' };
  if (!data.title || !data.title.toString().trim()) return { success: false, error: 'Quiz Title is required' };
  if (!data.questions || !data.questions.length) return { success: false, error: 'Quiz must contain at least one question' };

  var quizId = data.quizId || ('qz_' + Utilities.getUuid().replace(/-/g, ''));
  var createdAt = new Date().toISOString();
  var updatedAt = createdAt;

  var ss = SpreadsheetApp.openById(QUIZ_SPREADSHEET_ID);

  // Save Quiz row
  var quizSheet = ss.getSheetByName('Quizzes');
  quizSheet.appendRow([
    quizId,
    data.userId,
    data.title.toString().trim(),
    data.description ? data.description.toString().trim() : '',
    data.timerType || 'none',
    Number(data.duration || data.timerDuration) || 0,
    Boolean(data.anonymous),
    JSON.stringify(data.participantFields || []),
    data.showScore !== undefined ? Boolean(data.showScore) : true,
    data.allowPreviousQuestions !== undefined ? Boolean(data.allowPreviousQuestions) : true,
    'active',
    createdAt,
    updatedAt
  ]);

  // Save Questions and Options
  var qSheet = ss.getSheetByName('Questions');
  var oSheet = ss.getSheetByName('Options');

  var savedQuestions = [];

  for (var i = 0; i < data.questions.length; i++) {
    var q = data.questions[i];
    var questionId = q.questionId || ('q_' + Utilities.getUuid().substring(0, 12));
    var qOrder = i + 1;

    qSheet.appendRow([questionId, quizId, q.questionText, qOrder]);

    var savedOptions = [];
    if (q.options && q.options.length) {
      for (var j = 0; j < q.options.length; j++) {
        var opt = q.options[j];
        var optionId = opt.optionId || ('opt_' + Utilities.getUuid().substring(0, 12));
        var isCorrect = Boolean(opt.isCorrect);

        oSheet.appendRow([optionId, questionId, opt.optionText, isCorrect]);

        savedOptions.push({
          optionId: optionId,
          optionText: opt.optionText,
          isCorrect: isCorrect
        });
      }
    }

    savedQuestions.push({
      questionId: questionId,
      quizId: quizId,
      questionText: q.questionText,
      order: qOrder,
      options: savedOptions
    });
  }

  var fullQuiz = {
    quizId: quizId,
    userId: data.userId,
    title: data.title.toString().trim(),
    description: data.description ? data.description.toString().trim() : '',
    timerType: data.timerType || 'none',
    timerDuration: Number(data.duration || data.timerDuration) || 0,
    anonymous: Boolean(data.anonymous),
    participantFields: data.participantFields || [],
    showScore: data.showScore !== undefined ? Boolean(data.showScore) : true,
    allowPreviousQuestions: data.allowPreviousQuestions !== undefined ? Boolean(data.allowPreviousQuestions) : true,
    status: 'active',
    createdAt: createdAt,
    updatedAt: updatedAt,
    questions: savedQuestions
  };

  return { success: true, quiz: fullQuiz };
}

function getQuiz(data) {
  if (!data.quizId) return { success: false, error: 'Quiz ID is required' };

  var quizzes = getSheetData(QUIZ_SPREADSHEET_ID, 'Quizzes');
  var targetQuiz = null;

  for (var i = 0; i < quizzes.length; i++) {
    if (quizzes[i].quizId === data.quizId && quizzes[i].status !== 'deleted') {
      targetQuiz = quizzes[i];
      break;
    }
  }

  if (!targetQuiz) return { success: false, error: 'Quiz not found' };

  // If userId provided for editing/dashboard, check ownership
  if (data.userId && targetQuiz.userId !== data.userId) {
    return { success: false, error: 'Unauthorized to access this quiz' };
  }

  var questionsData = getSheetData(QUIZ_SPREADSHEET_ID, 'Questions');
  var optionsData = getSheetData(QUIZ_SPREADSHEET_ID, 'Options');

  var quizQuestions = [];
  for (var q = 0; q < questionsData.length; q++) {
    if (questionsData[q].quizId === targetQuiz.quizId) {
      var qId = questionsData[q].questionId;
      var qOptions = [];

      for (var o = 0; o < optionsData.length; o++) {
        if (optionsData[o].questionId === qId) {
          qOptions.push({
            optionId: optionsData[o].optionId,
            optionText: optionsData[o].optionText,
            isCorrect: Boolean(optionsData[o].isCorrect)
          });
        }
      }

      quizQuestions.push({
        questionId: qId,
        quizId: targetQuiz.quizId,
        questionText: questionsData[q].questionText,
        order: Number(questionsData[q].order),
        options: qOptions
      });
    }
  }

  quizQuestions.sort(function(a, b) { return a.order - b.order; });

  var participantFields = [];
  try {
    participantFields = targetQuiz.participantFields ? JSON.parse(targetQuiz.participantFields) : [];
  } catch (e) {}

  var formattedQuiz = {
    quizId: targetQuiz.quizId,
    userId: targetQuiz.userId,
    title: targetQuiz.title,
    description: targetQuiz.description,
    timerType: targetQuiz.timerType,
    timerDuration: Number(targetQuiz.timerDuration),
    anonymous: Boolean(targetQuiz.anonymous),
    participantFields: participantFields,
    showScore: Boolean(targetQuiz.showScore),
    allowPreviousQuestions: targetQuiz.allowPreviousQuestions !== undefined ? Boolean(targetQuiz.allowPreviousQuestions) : true,
    status: targetQuiz.status,
    createdAt: targetQuiz.createdAt,
    updatedAt: targetQuiz.updatedAt,
    questions: quizQuestions
  };

  return { success: true, quiz: formattedQuiz };
}

function getUserQuizzes(data) {
  if (!data.userId) return { success: false, error: 'User ID is required' };

  var quizzes = getSheetData(QUIZ_SPREADSHEET_ID, 'Quizzes');
  var questions = getSheetData(QUIZ_SPREADSHEET_ID, 'Questions');
  var attempts = getSheetData(QUIZ_SPREADSHEET_ID, 'Attempts');

  var userQuizzes = [];

  for (var i = 0; i < quizzes.length; i++) {
    if (quizzes[i].userId === data.userId && quizzes[i].status !== 'deleted') {
      var qId = quizzes[i].quizId;
      var qCount = 0;
      for (var q = 0; q < questions.length; q++) {
        if (questions[q].quizId === qId) qCount++;
      }

      var attCount = 0;
      for (var a = 0; a < attempts.length; a++) {
        if (attempts[a].quizId === qId) attCount++;
      }

      userQuizzes.push({
        quizId: quizzes[i].quizId,
        userId: quizzes[i].userId,
        title: quizzes[i].title,
        description: quizzes[i].description,
        timerType: quizzes[i].timerType,
        timerDuration: Number(quizzes[i].timerDuration),
        anonymous: Boolean(quizzes[i].anonymous),
        showScore: Boolean(quizzes[i].showScore),
        allowPreviousQuestions: quizzes[i].allowPreviousQuestions !== undefined ? Boolean(quizzes[i].allowPreviousQuestions) : true,
        status: quizzes[i].status,
        createdAt: quizzes[i].createdAt,
        questionCount: qCount,
        attemptCount: attCount
      });
    }
  }

  return { success: true, quizzes: userQuizzes };
}

function updateQuiz(data) {
  if (!data.quizId || !data.userId) return { success: false, error: 'Quiz ID and User ID are required' };

  var ss = SpreadsheetApp.openById(QUIZ_SPREADSHEET_ID);
  var quizSheet = ss.getSheetByName('Quizzes');
  var quizRows = quizSheet.getDataRange().getValues();

  var rowIndex = -1;
  for (var r = 1; r < quizRows.length; r++) {
    if (quizRows[r][0] === data.quizId) {
      if (quizRows[r][1] !== data.userId) {
        return { success: false, error: 'Unauthorized to edit this quiz' };
      }
      rowIndex = r + 1;
      break;
    }
  }

  if (rowIndex === -1) return { success: false, error: 'Quiz not found' };

  var updatedAt = new Date().toISOString();

  // Update Quizzes sheet row
  quizSheet.getRange(rowIndex, 3).setValue(data.title.toString().trim()); // title
  quizSheet.getRange(rowIndex, 4).setValue(data.description ? data.description.toString().trim() : ''); // description
  quizSheet.getRange(rowIndex, 5).setValue(data.timerType || 'none'); // timerType
  quizSheet.getRange(rowIndex, 6).setValue(Number(data.timerDuration) || 0); // timerDuration
  quizSheet.getRange(rowIndex, 7).setValue(Boolean(data.anonymous)); // anonymous
  quizSheet.getRange(rowIndex, 8).setValue(JSON.stringify(data.participantFields || [])); // participantFields
  quizSheet.getRange(rowIndex, 9).setValue(data.showScore !== undefined ? Boolean(data.showScore) : true); // showScore
  quizSheet.getRange(rowIndex, 10).setValue(data.allowPreviousQuestions !== undefined ? Boolean(data.allowPreviousQuestions) : true); // allowPreviousQuestions
  quizSheet.getRange(rowIndex, 13).setValue(updatedAt); // updatedAt

  // Remove existing questions and options for this quiz and re-insert
  removeQuestionsAndOptionsForQuiz(ss, data.quizId);

  var qSheet = ss.getSheetByName('Questions');
  var oSheet = ss.getSheetByName('Options');
  var savedQuestions = [];

  for (var i = 0; i < data.questions.length; i++) {
    var q = data.questions[i];
    var questionId = q.questionId || ('q_' + Utilities.getUuid().substring(0, 12));
    var qOrder = i + 1;

    qSheet.appendRow([questionId, data.quizId, q.questionText, qOrder]);

    var savedOptions = [];
    if (q.options && q.options.length) {
      for (var j = 0; j < q.options.length; j++) {
        var opt = q.options[j];
        var optionId = opt.optionId || ('opt_' + Utilities.getUuid().substring(0, 12));
        var isCorrect = Boolean(opt.isCorrect);

        oSheet.appendRow([optionId, questionId, opt.optionText, isCorrect]);

        savedOptions.push({
          optionId: optionId,
          optionText: opt.optionText,
          isCorrect: isCorrect
        });
      }
    }

    savedQuestions.push({
      questionId: questionId,
      quizId: data.quizId,
      questionText: q.questionText,
      order: qOrder,
      options: savedOptions
    });
  }

  return getQuiz({ quizId: data.quizId, userId: data.userId });
}

function removeQuestionsAndOptionsForQuiz(ss, quizId) {
  var qSheet = ss.getSheetByName('Questions');
  var oSheet = ss.getSheetByName('Options');

  var qData = qSheet.getDataRange().getValues();
  var removedQIds = [];

  for (var q = qData.length - 1; q >= 1; q--) {
    if (qData[q][1] === quizId) {
      removedQIds.push(qData[q][0]);
      qSheet.deleteRow(q + 1);
    }
  }

  var oData = oSheet.getDataRange().getValues();
  for (var o = oData.length - 1; o >= 1; o--) {
    if (removedQIds.indexOf(oData[o][1]) !== -1) {
      oSheet.deleteRow(o + 1);
    }
  }
}

function deleteQuiz(data) {
  if (!data.quizId || !data.userId) return { success: false, error: 'Quiz ID and User ID are required' };

  var ss = SpreadsheetApp.openById(QUIZ_SPREADSHEET_ID);
  var quizSheet = ss.getSheetByName('Quizzes');
  var rows = quizSheet.getDataRange().getValues();

  for (var r = 1; r < rows.length; r++) {
    if (rows[r][0] === data.quizId) {
      if (rows[r][1] !== data.userId) {
        return { success: false, error: 'Unauthorized to delete this quiz' };
      }
      quizSheet.getRange(r + 1, 11).setValue('deleted'); // status
      return { success: true, message: 'Quiz deleted successfully' };
    }
  }

  return { success: false, error: 'Quiz not found' };
}

// --- Attempt & Submission Operations ---

function submitQuiz(data) {
  if (!data.quizId) return { success: false, error: 'Quiz ID is required' };

  var quizRes = getQuiz({ quizId: data.quizId });
  if (!quizRes.success || !quizRes.quiz) return { success: false, error: 'Quiz not found' };

  var quiz = quizRes.quiz;
  var answers = data.answers || [];
  var participantData = data.participantData || {};

  var correctCount = 0;
  var incorrectCount = 0;
  var processedAnswers = [];

  for (var i = 0; i < quiz.questions.length; i++) {
    var q = quiz.questions[i];
    var userAns = null;
    for (var a = 0; a < answers.length; a++) {
      if (answers[a].questionId === q.questionId) {
        userAns = answers[a];
        break;
      }
    }

    var selectedOptionIds = userAns && userAns.selectedOptionIds ? userAns.selectedOptionIds : [];

    var correctOptionIds = [];
    for (var o = 0; o < q.options.length; o++) {
      if (q.options[o].isCorrect) {
        correctOptionIds.push(q.options[o].optionId);
      }
    }

    var isCorrect = false;
    if (correctOptionIds.length === selectedOptionIds.length) {
      var allMatch = true;
      for (var c = 0; c < correctOptionIds.length; c++) {
        if (selectedOptionIds.indexOf(correctOptionIds[c]) === -1) {
          allMatch = false;
          break;
        }
      }
      isCorrect = allMatch;
    }

    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    processedAnswers.push({
      questionId: q.questionId,
      selectedOptionIds: selectedOptionIds,
      isCorrect: isCorrect
    });
  }

  var totalQuestions = quiz.questions.length;
  var scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  var attemptId = data.attemptId || ('att_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24));
  var submittedAt = new Date().toISOString();

  var ss = SpreadsheetApp.openById(QUIZ_SPREADSHEET_ID);

  // Append Attempt
  var attSheet = ss.getSheetByName('Attempts');
  attSheet.appendRow([
    attemptId,
    quiz.quizId,
    quiz.userId,
    JSON.stringify(participantData),
    scorePercentage,
    totalQuestions,
    correctCount,
    incorrectCount,
    Number(data.completionTimeSeconds) || 0,
    submittedAt
  ]);

  // Append Answers
  var ansSheet = ss.getSheetByName('Answers');
  for (var p = 0; p < processedAnswers.length; p++) {
    var pa = processedAnswers[p];
    ansSheet.appendRow([
      attemptId,
      pa.questionId,
      JSON.stringify(pa.selectedOptionIds),
      pa.isCorrect
    ]);
  }

  if (quiz.showScore) {
    return {
      success: true,
      showScore: true,
      attemptId: attemptId,
      totalQuestions: totalQuestions,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      percentage: scorePercentage,
      scoreText: correctCount + ' / ' + totalQuestions
    };
  } else {
    return {
      success: true,
      showScore: false,
      attemptId: attemptId,
      message: 'Thank you for completing this quiz!'
    };
  }
}

// --- Analytics Operations ---

function getAnalytics(data) {
  if (!data.quizId || !data.userId) return { success: false, error: 'Quiz ID and User ID are required' };

  var quizRes = getQuiz({ quizId: data.quizId, userId: data.userId });
  if (!quizRes.success) return quizRes;

  var quiz = quizRes.quiz;
  var allAttempts = getSheetData(QUIZ_SPREADSHEET_ID, 'Attempts');
  var allAnswers = getSheetData(QUIZ_SPREADSHEET_ID, 'Answers');

  var quizAttempts = [];
  for (var a = 0; a < allAttempts.length; a++) {
    if (allAttempts[a].quizId === quiz.quizId) {
      quizAttempts.push(allAttempts[a]);
    }
  }

  var totalAttempts = quizAttempts.length;
  var completedAttempts = totalAttempts;
  var completionRate = totalAttempts > 0 ? 100 : 0;

  var avgScore = 0;
  var highestScore = 0;
  var lowestScore = 0;
  var avgCompletionTime = 0;

  if (totalAttempts > 0) {
    var totalScore = 0;
    var totalTime = 0;
    var maxS = 0;
    var minS = 100;

    for (var i = 0; i < quizAttempts.length; i++) {
      var s = Number(quizAttempts[i].score) || 0;
      var t = Number(quizAttempts[i].completionTimeSeconds) || 0;

      totalScore += s;
      totalTime += t;

      if (s > maxS) maxS = s;
      if (s < minS) minS = s;
    }

    avgScore = Math.round(totalScore / totalAttempts);
    highestScore = Math.round(maxS);
    lowestScore = Math.round(minS);
    avgCompletionTime = Math.round(totalTime / totalAttempts);
  }

  // Question performance
  var questionPerformance = [];
  for (var q = 0; q < quiz.questions.length; q++) {
    var qId = quiz.questions[q].questionId;
    var qAnswered = 0;
    var qCorrect = 0;

    for (var ans = 0; ans < allAnswers.length; ans++) {
      if (allAnswers[ans].questionId === qId) {
        qAnswered++;
        if (Boolean(allAnswers[ans].isCorrect)) {
          qCorrect++;
        }
      }
    }

    var correctPct = qAnswered > 0 ? Math.round((qCorrect / qAnswered) * 100) : 0;
    var incorrectPct = qAnswered > 0 ? 100 - correctPct : 0;

    questionPerformance.push({
      questionId: qId,
      questionText: quiz.questions[q].questionText,
      order: quiz.questions[q].order,
      totalAnswered: qAnswered,
      correctPct: correctPct,
      incorrectPct: incorrectPct
    });
  }

  // Sort recent attempts
  quizAttempts.sort(function(a, b) {
    return new Date(b.submittedAt) - new Date(a.submittedAt);
  });

  var recentAttempts = [];
  for (var r = 0; r < Math.min(20, quizAttempts.length); r++) {
    var pData = {};
    try { pData = JSON.parse(quizAttempts[r].participantData); } catch (e) {}

    recentAttempts.push({
      attemptId: quizAttempts[r].attemptId,
      participantData: pData,
      score: Number(quizAttempts[r].score),
      correctCount: Number(quizAttempts[r].correctCount),
      totalQuestions: Number(quizAttempts[r].totalQuestions),
      percentage: Number(quizAttempts[r].score),
      completionTimeSeconds: Number(quizAttempts[r].completionTimeSeconds),
      submittedAt: quizAttempts[r].submittedAt
    });
  }

  return {
    success: true,
    analytics: {
      quizId: quiz.quizId,
      quizTitle: quiz.title,
      totalAttempts: totalAttempts,
      completedAttempts: completedAttempts,
      completionRate: completionRate,
      avgScore: avgScore,
      highestScore: highestScore,
      lowestScore: lowestScore,
      avgCompletionTime: avgCompletionTime,
      questionPerformance: questionPerformance,
      recentAttempts: recentAttempts
    }
  };
}
