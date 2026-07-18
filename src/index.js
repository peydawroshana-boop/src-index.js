// ============================================
// ربات تلگرام روی Cloudflare Worker
// ============================================

// توکن ربات را از متغیر محیطی دریافت کنید
const BOT_TOKEN = '8639365110:AAFtzcO4DWztQxUVpq4oO4bcOzQHdXI22X8'; 
const WEBHOOK_PATH = '/webhook'; // مسیر webhook (می‌توانید تغییر دهید)

// ------------------------------------------------------------------
// تابع اصلی برای پردازش درخواست‌ها
// ------------------------------------------------------------------
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // ---------- درخواست GET: راهنما یا تنظیم webhook ----------
  if (request.method === 'GET') {
    if (path === '/setwebhook') {
      // تنظیم خودکار webhook در تلگرام
      const webhookUrl = `https://${url.hostname}${WEBHOOK_PATH}`;
      const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // صفحه اصلی (راهنما)
    return new Response(
      `🤖 ربات تلگرام فعال است!\n\n` +
      `• برای تنظیم webhook: GET /setwebhook\n` +
      `• مسیر webhook: ${WEBHOOK_PATH}\n` +
      `• ارسال پیام به ربات را امتحان کنید.`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // ---------- درخواست POST: پردازش webhook تلگرام ----------
  if (request.method === 'POST' && path === WEBHOOK_PATH) {
    try {
      const body = await request.json();
      console.log('دریافت پیام:', body);

      // اگر پیام وجود داشته باشد
      if (body.message) {
        const chatId = body.message.chat.id;
        const text = body.message.text || '';

        // پاسخ بر اساس متن پیام
        let reply = '';
        if (text === '/start') {
          reply = '👋 سلام! به ربات ساده خوش آمدید.\nاز دستور /help برای راهنما استفاده کنید.';
        } else if (text === '/help') {
          reply = '📌 دستورات موجود:\n/start - شروع\n/help - راهنما\nهمچنین می‌توانید هر پیامی بفرستید تا echo شود.';
        } else if (text.startsWith('/')) {
          reply = '❌ دستور ناشناخته. از /help استفاده کنید.';
        } else {
          reply = `🔁 شما گفتید: "${text}"\n(این یک پاسخ خودکار است)`;
        }

        // ارسال پاسخ به تلگرام
        await sendMessage(chatId, reply);
      }

      // به تلگرام تأیید می‌دهیم که درخواست با موفقیت دریافت شد
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('خطا در پردازش webhook:', error);
      return new Response('خطا', { status: 500 });
    }
  }

  // مسیر نامعتبر
  return new Response('Not Found', { status: 404 });
}

// ------------------------------------------------------------------
// تابع ارسال پیام به تلگرام
// ------------------------------------------------------------------
async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML', // اختیاری
  };
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ------------------------------------------------------------------
// رخداد‌دهنده اصلی Worker
// ------------------------------------------------------------------
export default {
  async fetch(request, env) {
    // تنظیم متغیر محیطی BOT_TOKEN در Cloudflare
    if (!env.BOT_TOKEN) {
      return new Response('❌ متغیر محیطی BOT_TOKEN تنظیم نشده است.', { status: 500 });
    }
    return handleRequest(request, env);
  },
};
