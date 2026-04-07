// Google Apps Script - メールリマインダー中継
// https://script.google.com/home で新規プロジェクトを作成し、このコードを貼り付ける
//
// デプロイ手順:
// 1. 「デプロイ」→「新しいデプロイ」
// 2. 種類: ウェブアプリ
// 3. 実行者: 自分
// 4. アクセス: 全員
// 5. デプロイ後のURLをSupabase Edge Function secretsに GAS_WEBHOOK_URL として登録

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  MailApp.sendEmail({
    to: data.to,
    subject: data.subject,
    htmlBody: data.html,
    name: 'Todome',
  });
  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}
