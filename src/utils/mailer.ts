import "dotenv/config";
import nodemailer from "nodemailer";

console.log('🔧 Initializing email transporter...');
console.log('Email config check:', {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  user: process.env.MAIL_USER,
  passExists: !!process.env.MAIL_PASS
});

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  debug: true,
  logger: true,
});

// Test transporter connection
export const testEmailConnection = async () => {
  try {
    console.log('🔍 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email server connection verified successfully!');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};

export const sendOTPEmail = async (to: string, otp: string) => {
  // Test connection first
  const connectionOk = await testEmailConnection();
  if (!connectionOk) {
    throw new Error('Email server connection failed');
  }
  
  console.log('🔧 Email Configuration Check:');
  console.log('MAIL_HOST:', process.env.MAIL_HOST);
  console.log('MAIL_PORT:', process.env.MAIL_PORT);
  console.log('MAIL_USER:', process.env.MAIL_USER);
  console.log('MAIL_PASS exists:', !!process.env.MAIL_PASS);
  console.log('MAIL_PASS length:', process.env.MAIL_PASS?.length);
  
  console.log('📧 Attempting to send OTP email to:', to);
  console.log('🔑 OTP code:', otp);
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #004B5B 0%, #006B7D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #004B5B; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #004B5B; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
          <p>Verify your email address to continue</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for signing up! Please use the verification code below to verify your email address:</p>
          
          <div class="otp-box">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Verification Code</p>
            <div class="otp-code">${otp}</div>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This code expires in 10 minutes</p>
          </div>
          
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Broker Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log('🚀 Sending email with transporter...');
    
    const mailOptions = {
      from: `"Broker Platform" <${process.env.MAIL_USER}>`,
      to,
      subject: "Verify your email",
      html: htmlBody,
    };
    
    console.log('📬 Mail options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html.length
    });
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📊 Send result:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected
    });
    
    console.log("✅ OTP email sent to:", to);
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    console.error('📋 Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode
    });
    throw error;
  }
};

export const sendVerificationSuccessEmail = async (
  to: string,
  csdNumber: string,
  options: { firstName?: string } = {}
) => {
  const greetingName = options.firstName?.trim() ?? "there";

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #004B5B 0%, #006B7D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-icon { font-size: 48px; margin-bottom: 10px; }
        .csd-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #10b981; }
        .csd-number { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #004B5B; margin: 15px 0; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✓</div>
          <h1>Account Verified Successfully</h1>
          <p>Welcome to Broker Platform</p>
        </div>
        <div class="content">
          <p>Hi ${greetingName},</p>
          <p>Congratulations! Your email address has been verified successfully and your account is now active.</p>
          
          <div class="csd-box">
            <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 600;">Your Central Securities Depository (CSD) Number</p>
            <div class="csd-number">${csdNumber}</div>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">Keep this number safe and secure</p>
          </div>
          
          <div class="info-box">
            <p style="margin: 0; font-weight: 600; color: #92400e;">⚠️ Important Information</p>
            <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">You'll need your CSD number for all future transactions on the platform. Please store it in a secure location.</p>
          </div>
          
          <p>You can now start trading and managing your investments through your dashboard.</p>
          <p>Thank you for choosing Broker Platform!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Broker Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Broker Platform" <${process.env.MAIL_USER}>`,
      to,
      subject: "Your account has been verified",
      html: htmlBody,
    });

    console.log("Verification success email sent to:", to);
  } catch (error) {
    console.error("Error sending verification success email:", error);
  }
};

export const sendTradeConfirmationEmail = async (
  to: string,
  fullName: string,
  tradeDetails: {
    tradeType: "BUY" | "SELL";
    companySymbol: string;
    companyName: string;
    quantity: number;
    pricePerShare: number;
    totalAmount: number;
    newBalance: string;
  }
) => {
  const { tradeType, companySymbol, companyName, quantity, pricePerShare, totalAmount, newBalance } = tradeDetails;
  const tradeTypeText = tradeType === "BUY" ? "Purchase" : "Sale";
  const tradeColor = tradeType === "BUY" ? "#10b981" : "#ef4444";

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #004B5B 0%, #006B7D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .trade-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${tradeColor}; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: 600; color: #6b7280; }
        .detail-value { font-weight: 700; color: #111827; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Trade Executed Successfully</h1>
          <p>Your ${tradeTypeText.toLowerCase()} order has been completed</p>
        </div>
        <div class="content">
          <p>Dear ${fullName},</p>
          <p>Your trade has been successfully executed. Here are the details:</p>
          
          <div class="trade-details">
            <h3 style="margin-top: 0; color: ${tradeColor};">${tradeTypeText} Order</h3>
            <div class="detail-row">
              <span class="detail-label">Company:</span>
              <span class="detail-value">${companyName} (${companySymbol})</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Quantity:</span>
              <span class="detail-value">${quantity} shares</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price per Share:</span>
              <span class="detail-value">Rwf ${pricePerShare.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value">Rwf ${totalAmount.toFixed(2)}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">New Wallet Balance:</span>
              <span class="detail-value">Rwf ${Number(newBalance).toFixed(2)}</span>
            </div>
          </div>
          
          <p>You can view your updated portfolio and transaction history in your dashboard.</p>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Broker Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Broker Platform" <${process.env.MAIL_USER}>`,
      to,
      subject: `Trade Confirmation - ${tradeTypeText} of ${companySymbol}`,
      html: htmlBody,
    });

    console.log("Trade confirmation email sent to:", to);
  } catch (error) {
    console.error("Error sending trade confirmation email:", error);
  }
};