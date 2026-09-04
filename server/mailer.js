import nodemailer from "nodemailer";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createMailer() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const mode = String(process.env.EMAIL_MODE || (host ? "smtp" : process.env.NODE_ENV === "production" ? "smtp" : "capture")).toLowerCase();
  const from = String(process.env.SMTP_FROM || "SkillMCP <no-reply@localhost>").trim();
  const transporter = mode === "smtp"
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "1",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined
      })
    : null;

  async function send({ to, subject, heading, copy, actionLabel, actionUrl }) {
    if (!transporter) return { captured: true, actionUrl };
    if (!host || !process.env.SMTP_FROM) throw new Error("SMTP is not configured.");
    await transporter.sendMail({
      from,
      to,
      subject,
      text: `${heading}\n\n${copy}\n\n${actionUrl}\n\n요청하지 않았다면 이 메일을 무시하세요.`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#17202a"><h1 style="font-size:24px">${escapeHtml(heading)}</h1><p style="line-height:1.7">${escapeHtml(copy)}</p><p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#173f36;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(actionLabel)}</a></p><p style="color:#68737f;font-size:13px">요청하지 않았다면 이 메일을 무시하세요.</p></div>`
    });
    return { captured: false };
  }

  return {
    sendEmailVerification({ to, actionUrl }) {
      return send({
        to,
        subject: "SkillMCP 이메일 주소를 확인해주세요",
        heading: "이메일 주소 확인",
        copy: "SkillMCP 계정을 활성화하려면 24시간 안에 아래 버튼을 눌러주세요.",
        actionLabel: "이메일 확인",
        actionUrl
      });
    },
    sendPasswordReset({ to, actionUrl }) {
      return send({
        to,
        subject: "SkillMCP 비밀번호 재설정",
        heading: "비밀번호 재설정",
        copy: "30분 안에 아래 버튼을 눌러 새 비밀번호를 설정해주세요.",
        actionLabel: "비밀번호 재설정",
        actionUrl
      });
    }
  };
}
