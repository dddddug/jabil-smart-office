/**
 * 邮件发送服务
 */
import nodemailer from 'nodemailer';
import { logInfo, logError } from '../utils/logger.js';

/**
 * 创建邮件传输器
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * 发送邮件
 * @param {Object} options - 邮件选项
 * @param {string[]} options.to - 收件人列表
 * @param {string[]} options.cc - 抄送列表
 * @param {string} options.subject - 邮件主题
 * @param {string} options.text - 邮件文本内容
 * @returns {Promise<Object>} 发送结果
 */
export const sendEmail = async ({ to, cc = [], subject, text }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to.join(', '),
    cc: cc.length > 0 ? cc.join(', ') : undefined,
    subject,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logInfo('邮件发送成功', {
      messageId: info.messageId,
      to: to.join(', '),
      subject
    });
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    logError('邮件发送失败', {
      error: error.message,
      to: to.join(', '),
      subject
    });
    throw error;
  }
};

export default { sendEmail };
