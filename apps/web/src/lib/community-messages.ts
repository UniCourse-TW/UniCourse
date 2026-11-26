// zh-TW wording for the API's `{message}` errors, kept in one place for later i18n.
const messages: Record<string, string> = {
  'Sign in required': '請先登入。',
  'Wrong username or password': '帳號或密碼錯誤。',
  'Too many failed sign-in attempts; try again in a minute': '登入失敗次數過多，請一分鐘後再試。',
  'Username is taken': '這個帳號名稱已有人使用。',
  'Username must be 3-32 characters of a-z, 0-9 and underscore': '帳號名稱需為 3–32 個英文字母、數字或底線。',
  'Password must be 8-128 characters': '密碼需為 8–128 個字元。',
  'Display name must be 1-50 characters on one line': '顯示名稱需為 1–50 字的單行文字。',
  'Bio must be at most 500 characters': '自我介紹最多 500 字。',
  'Unknown school': '找不到這所學校。',
  'Unknown course': '找不到這門課程，請確認學校與課號。',
  'courseCode requires school': '指定課號時也要選擇學校。',
  'Course not found': '找不到這門課程。',
  'Score must be an integer from 1 to 5': '請選擇 1 到 5 分。',
  'Review must be at most 2000 characters of plain text': '評論最多 2000 字。',
  'Title must be 1-200 characters on one line': '標題需為 1–200 字的單行文字。',
  'Content must be 1-20000 characters of plain text': '內容需為 1–20000 字。',
  'At most 5 tags': '最多 5 個標籤。',
  'Tags must be 1-30 characters on one line': '每個標籤需為 1–30 字的單行文字。',
  'type must be announcement, article or question': '請選擇文章類型。',
  'Only admins can post announcements': '只有管理員可以發布公告。',
  'Only the author can edit': '只有作者可以編輯。',
  'Only the author or an admin can delete': '只有作者或管理員可以刪除。',
  'Post not found': '找不到這篇文章，可能已被刪除。',
  'Replies cannot be nested': '回覆不能再被回覆。',
  'Replies have no title': '回覆沒有標題。',
  'Nothing to update': '沒有要更新的內容。',
  'Vote must be -1, 0 or 1': '投票內容有誤。',
  'Search must be at most 100 characters': '搜尋請使用 100 字以內的關鍵字。',
  'page must be between 1 and 10000': '頁碼超出範圍。',
  'Invalid query': '查詢條件有誤。',
  'Invalid request body': '送出的內容有誤。'
};

export const UNAVAILABLE = '暫時無法完成，請稍後再試。';

/** The zh-TW text for an API error body, falling back to its own message. */
export function apiMessage(body: unknown, fallback = UNAVAILABLE) {
  const message =
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : undefined;
  if (!message) return fallback;
  return messages[message] ?? message;
}
