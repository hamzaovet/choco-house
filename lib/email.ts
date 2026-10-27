import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.EMAIL_USER || "hamzaovet@gmail.com";
  const rawPass = process.env.EMAIL_PASS || "";
  const pass = rawPass.replace(/\s+/g, "");

  if (!pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

export async function sendOtpEmail(to: string, name: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("⚠️ [Email] GMAIL_APP_PASS not configured in environment. Test code:", code);
      return { success: true };
    }

    const fromAddress = `"Choco House Desserts 🍫" <${process.env.EMAIL_USER || "hamzaovet@gmail.com"}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; background-color: #0d0805; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 520px; margin: 0 auto; background: #160d05; border: 1px solid rgba(204, 160, 67, 0.35); border-radius: 24px; padding: 36px 28px; text-align: center; }
          .logo { color: #cca043; font-size: 26px; font-weight: 900; margin-bottom: 8px; font-family: Georgia, serif; }
          .sub { color: #b0957e; font-size: 14px; margin-bottom: 24px; }
          .otp-box { background: #0d0805; border: 2px dashed #cca043; border-radius: 16px; padding: 18px; margin: 24px 0; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #cca043; font-family: monospace; }
          .info { color: #8a7565; font-size: 13px; line-height: 1.6; }
          .footer { margin-top: 30px; font-size: 11px; color: #6d5849; border-top: 1px solid rgba(204, 160, 67, 0.15); padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Choco House Desserts</div>
          <div class="sub">بيت الشوكولاتة والحلويات الفاخرة</div>
          
          <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 10px 0;">أهلاً بك يا ${name || "عميلنا العزيز"} 👋</h2>
          <p class="info">استخدم رمز التحقق التالي لتأكيد تسجيل حسابك في التطبيق:</p>

          <div class="otp-box">${code}</div>

          <p class="info">⚠️ الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص.</p>

          <div class="footer">
            تم إرسال هذا البريد تلقائياً من منصة Choco House Desserts — مدينة 6 أكتوبر<br/>
            للطلبات والاستفسارات: 01091413470
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `${code} هو رمز التحقق الخاص بك — Choco House 🍫`,
      html: htmlContent,
    });

    console.log(`✅ [Email] OTP sent successfully to ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`❌ [Email] Failed to send OTP to ${to}:`, err.message);
    // Return gracefully so user registration flow is never blocked
    return { success: false, error: err.message };
  }
}
