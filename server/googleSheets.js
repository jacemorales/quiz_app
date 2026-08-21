import { google } from 'googleapis'

const USER_SPREADSHEET_ID = process.env.USER_SPREADSHEET_ID || '1KC9kf3igF8xRm1MVaSmUhqCjLKJWArH-iKeYhBBVwnw'
const QUIZ_SPREADSHEET_ID = process.env.QUIZ_SPREADSHEET_ID || '1KJeB29Iyg-JBM-NvgYEt9yPFU8SRNqf1XehCD6Phmho'

let sheets = null

function getSheetsClient() {
  if (sheets) return sheets

  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
      )
      sheets = google.sheets({ version: 'v4', auth })
      return sheets
    } else if (process.env.GOOGLE_SHEETS_API_KEY) {
      sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_SHEETS_API_KEY })
      return sheets
    }
  } catch (err) {
    console.warn('Google Sheets client initialization skipped:', err.message)
  }
  return null
}

export async function appendUserToSheet(user) {
  const client = getSheetsClient()
  if (!client) return
  try {
    await client.spreadsheets.values.append({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: 'Users!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[user.userId, user.name, user.email, user.createdAt]]
      }
    })
  } catch (err) {
    console.warn('Failed to append user to Google Sheet:', err.message)
  }
}

export async function appendQuizToSheet(quiz) {
  const client = getSheetsClient()
  if (!client) return
  try {
    await client.spreadsheets.values.append({
      spreadsheetId: QUIZ_SPREADSHEET_ID,
      range: 'Quizzes!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            quiz.quizId,
            quiz.userId,
            quiz.title,
            quiz.description,
            quiz.timerType,
            quiz.timerDuration,
            quiz.anonymous,
            JSON.stringify(quiz.participantFields),
            quiz.showScore,
            quiz.status,
            quiz.createdAt
          ]
        ]
      }
    })
  } catch (err) {
    console.warn('Failed to append quiz to Google Sheet:', err.message)
  }
}

export async function appendQuestionToSheet(question) {
  const client = getSheetsClient()
  if (!client) return
  try {
    await client.spreadsheets.values.append({
      spreadsheetId: QUIZ_SPREADSHEET_ID,
      range: 'Questions!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            question.questionId,
            question.quizId,
            question.questionText,
            question.order,
            JSON.stringify(question.options)
          ]
        ]
      }
    })
  } catch (err) {
    console.warn('Failed to append question to Google Sheet:', err.message)
  }
}

export async function appendAttemptToSheet(attempt) {
  const client = getSheetsClient()
  if (!client) return
  try {
    await client.spreadsheets.values.append({
      spreadsheetId: QUIZ_SPREADSHEET_ID,
      range: 'Responses!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            attempt.attemptId,
            attempt.quizId,
            JSON.stringify(attempt.participantData),
            attempt.score,
            attempt.correctCount,
            attempt.totalQuestions,
            attempt.completionTimeSeconds,
            attempt.submittedAt
          ]
        ]
      }
    })
  } catch (err) {
    console.warn('Failed to append attempt to Google Sheet:', err.message)
  }
}
