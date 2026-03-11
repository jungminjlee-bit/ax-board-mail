
// netlify/functions/sendmail.js
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const makeRes = (statusCode, bodyObj = {}) => ({
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',           // 필요 시 특정 도메인으로 제한
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(bodyObj),
  });

  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return makeRes(200, { ok: true });
    }
    if (event.httpMethod !== 'POST') {
      return makeRes(405, { error: 'Method Not Allowed' });
    }

    // 환경변수
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      MAIL_TO,
      MAIL_FROM,
    } = process.env;

    // 페이로드 파싱
    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); } catch {}

    const { team = '', name = '', sessionId = '', items = [] } = payload;

    // 메일 본문 구성 (가독성 향상)
    const lines = [];
    lines.push(`팀: ${team}`);
    lines.push(`이름: ${name}`);
    lines.push(`세션: ${sessionId}`);
    lines.push('');
    lines.push('=== 과제 배치 결과 ===');
    for (const it of items) {
      const imp = it.impact || '-';
      const feas = it.feasibility || '-';
      lines.push(`${it.projectId} | ${it.projectTitle} | Impact: ${imp} | Feasibility: ${feas}`);
    }
    const textBody = lines.join('\n');

    // SMTP 트랜스포트
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,            // smtp.gmail.com
      port: Number(SMTP_PORT),    // 587
      secure: false,              // 587은 STARTTLS(secure:false + tls) 사용
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { ciphers: 'TLSv1.2' }, // 일부 환경에서 권장
    });

    // 제목에 제출자 정보 포함 + 방문자 회신용 Reply-To 설정(선택)
    const subject = `[과제평가 제출] ${team}/${name} - ${new Date().toISOString()}`;
    const mailOptions = {
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      text: textBody,
      // replyTo: 'visitor@example.com' // 방문자 이메일을 따로 받는다면 여기에 매핑
    };

    await transporter.sendMail(mailOptions);

    return makeRes(200, { ok: true, message: 'Email sent!' });

  } catch (err) {
    return makeRes(500, { error: err.message || String(err) });
  }
};
