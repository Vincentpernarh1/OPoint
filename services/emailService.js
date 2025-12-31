import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
        // Add connection timeout and retry settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000, // 5 seconds
        socketTimeout: 10000, // 10 seconds
        // Connection pooling for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // TLS settings for Gmail
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
        },
        // Debug logging (set to true for troubleshooting)
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
    });
};

/**
 * Send password reset email to employee
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.employeeName - Name of the employee
 * @param {string} params.tempPassword - Temporary password
 * @param {string} params.resetBy - Name of admin/HR who reset the password
 * @returns {Promise<Object>} - Result of email sending
 */
export async function sendPasswordResetEmail({ to, employeeName, tempPassword, resetBy }) {
    try {
        // Validate required environment variables
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('⚠️ Email configuration missing. Email will not be sent.');
            console.log(`📧 Password reset notification for ${to}: Temporary password is ${tempPassword}`);
            return { 
                success: false, 
                error: 'Email not configured',
                message: 'Password reset successful, but email notification was not sent due to missing email configuration.' 
            };
        }

        const transporter = createTransporter();
        const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

        const mailOptions = {
            from: `"OPoint" <${fromAddress}>`,
            to: to,
            subject: 'Password Reset - OPoint',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .password-box { background-color: #fff; border: 2px solid #4F46E5; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px; }
                        .password { font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 2px; font-family: 'Courier New', monospace; }
                        .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
                        .security { background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 12px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
                        .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        ul { padding-left: 20px; }
                        li { margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset</h1>
                        </div>
                        <div class="content">
                            <p>Hello <strong>${employeeName}</strong>,</p>
                            
                            <p>Your password for OPoint has been reset by <strong>${resetBy}</strong>.</p>
                            
                            <div class="password-box">
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">Your secure temporary password is:</p>
                                <p class="password">${tempPassword}</p>
                                <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">This password is randomly generated and unique to you</p>
                            </div>
                            
                            <div class="security">
                                <strong>🔒 Security Notice:</strong> This password has been randomly generated for your security. Keep it confidential and do not share it with anyone.
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Important:</strong> This is a temporary password. You will be required to change it immediately upon your first login.
                            </div>
                            
                            <h3>Next Steps:</h3>
                            <ul>
                                <li>Log in to OPoint using your email and the temporary password above</li>
                                <li>You will be prompted to create a new password</li>
                                <li>Choose a strong password with at least 8 characters</li>
                                <li>Do not share your password with anyone</li>
                            </ul>
                            
                            <p style="margin-top: 30px;">If you did not request this password reset or have any concerns, please contact your HR department immediately.</p>
                            
                            <p>Best regards,<br>
                            <strong>OPoint Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>&copy; ${new Date().getFullYear()} OPoint. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Hello ${employeeName},

Your password for OPoint has been reset by ${resetBy}.

Your temporary password is: ${tempPassword}

IMPORTANT: This is a temporary password. You will be required to change it immediately upon your first login.

Next Steps:
1. Log in to OPoint using your email and the temporary password above
2. You will be prompted to create a new password
3. Choose a strong password with at least 8 characters
4. Do not share your password with anyone

If you did not request this password reset or have any concerns, please contact your HR department immediately.

Best regards,
OPoint Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} OPoint. All rights reserved.
            `.trim()
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Password reset email sent successfully to:', to);
        console.log('📧 Message ID:', info.messageId);
        
        return { 
            success: true, 
            messageId: info.messageId,
            message: 'Password reset email sent successfully' 
        };

    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        return { 
            success: false, 
            error: error.message,
            message: 'Password reset successful, but failed to send email notification' 
        };
    }
}

/**
 * Verify email configuration
 * @returns {Promise<boolean>} - True if email is configured correctly
 */
export async function verifyEmailConfig() {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            return false;
        }

        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Email service is ready');
        return true;
    } catch (error) {
        console.error('❌ Email configuration error:', error.message);
        return false;
    }
}

export default {
    sendPasswordResetEmail,
    verifyEmailConfig
};
