const EFFECTIVE_DATE = process.env.POLICY_EFFECTIVE_DATE || "2026-09-04";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function page({ title, eyebrow, content, publisher, supportEmail }) {
  const contact = supportEmail
    ? `<a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>`
    : `<a href="/support">지원 페이지</a>`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index,follow">
  <title>${escapeHtml(title)} · SkillMCP</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#17202a;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}a{color:#176b5b}.top{background:#fff;border-bottom:1px solid #dfe4e8}.nav{width:min(100% - 40px,1040px);height:68px;margin:auto;display:flex;align-items:center;justify-content:space-between}.brand{font-size:20px;font-weight:800;color:#173f36;text-decoration:none}.links{display:flex;gap:18px;font-size:14px}.links a{text-decoration:none;color:#56616d}.wrap{width:min(100% - 40px,800px);margin:56px auto 80px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#667085}.hero{padding-bottom:28px;border-bottom:1px solid #d9dfe4}.hero h1{margin:6px 0 8px;font-size:clamp(30px,5vw,44px);line-height:1.15}.meta{color:#6a7480;font-size:14px}.section{margin-top:36px}.section h2{font-size:21px;margin:0 0 10px}.section h3{font-size:16px;margin:22px 0 6px}.section p,.section li{color:#3f4a55}.section ul,.section ol{padding-left:22px}.notice{background:#eaf4f1;border:1px solid #c9e1da;border-radius:12px;padding:16px 18px}.danger{background:#fff4f1;border-color:#f0d1c8}.form{display:grid;gap:14px;margin-top:20px}.form label{font-weight:700;font-size:14px}.form input{display:block;width:100%;height:46px;margin-top:6px;border:1px solid #c9d0d7;border-radius:9px;padding:0 12px;font:inherit}.form button{height:46px;border:0;border-radius:9px;background:#173f36;color:#fff;font:inherit;font-weight:750;cursor:pointer}.foot{border-top:1px solid #dfe4e8;color:#727c86;font-size:13px;padding:26px 0}.foot-inner{width:min(100% - 40px,1040px);margin:auto;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}@media(max-width:620px){.links{gap:10px;font-size:12px}.wrap{margin-top:34px}}
    .form button{display:inline-flex;align-items:center;justify-content:center;gap:9px;box-shadow:0 2px 0 #0d2b24;transition:background .16s,transform .08s,box-shadow .08s,opacity .16s}.form button:hover{background:#21594d}.form button:active{transform:translateY(2px);box-shadow:0 0 0 #0d2b24}.form button[aria-busy="true"]{background:#315f55;box-shadow:none;cursor:wait}.form button[aria-busy="true"]::before{content:"";width:15px;height:15px;border:2px solid rgba(255,255,255,.42);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}.form button:disabled{opacity:.82}.notice[role="status"]{box-shadow:0 5px 18px rgba(23,107,91,.08)}@keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <header class="top"><nav class="nav"><a class="brand" href="/">SkillMCP</a><div class="links"><a href="/privacy">개인정보</a><a href="/terms">이용약관</a><a href="/support">지원</a></div></nav></header>
  <main class="wrap"><header class="hero"><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><div class="meta">시행일 ${escapeHtml(EFFECTIVE_DATE)} · ${escapeHtml(publisher)}</div></header>${content}</main>
  <footer class="foot"><div class="foot-inner"><span>© ${new Date().getUTCFullYear()} ${escapeHtml(publisher)}</span><span>문의: ${contact}</span></div></footer>
  <script src="/form-feedback.js" defer></script>
</body>
</html>`;
}

function section(title, body) {
  return `<section class="section"><h2>${title}</h2>${body}</section>`;
}

export function installPublicPages({ app, deleteAccountByCredentials, requestPasswordReset, confirmPasswordReset, confirmEmailVerification, requestEmailVerification }) {
  const publisher = String(process.env.PUBLISHER_NAME || "SkillMCP").trim();
  const supportEmail = String(process.env.SUPPORT_EMAIL || "").trim();
  const supportContact = supportEmail
    ? `<a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>`
    : "도메인 연결 시 공개되는 SkillMCP 지원 이메일";

  app.get("/.well-known/openai-apps-challenge", (_, res) => {
    const token = String(process.env.OPENAI_APPS_CHALLENGE || "").trim();
    if (!token) return res.status(404).type("text/plain").send("Challenge not configured");
    res.set("Cache-Control", "no-store");
    return res.status(200).type("text/plain").send(token);
  });

  app.get("/privacy", (_, res) => {
    const content = [
      section("1. 수집하는 정보", `<ul><li><strong>계정 정보:</strong> 이메일 주소, 이메일 확인 여부와 비밀번호의 단방향 암호학적 검증값. 원문 비밀번호는 저장하지 않습니다.</li><li><strong>사용자 콘텐츠:</strong> 설치하거나 직접 만든 스킬의 이름, 설명, 지침, 태그와 활성화 설정.</li><li><strong>인증 정보:</strong> 해시 처리된 브라우저 세션, 이메일 확인·비밀번호 재설정 토큰, OAuth 액세스·갱신 토큰과 만료 시각.</li><li><strong>운영 정보:</strong> 서비스 보안과 장애 대응에 필요한 IP 주소, 요청 경로, 오류 정보 등 최소한의 서버 로그.</li></ul>`),
      section("2. 이용 목적", `<ul><li>SkillMCP 계정 인증과 MCP 연결 제공</li><li>사용자가 선택한 스킬의 저장, 조회 및 활성 상태 관리</li><li>서비스 보안, 남용 방지, 오류 해결과 품질 개선</li><li>법적 의무 준수와 권리 보호</li></ul>`),
      section("3. ChatGPT 및 Codex와의 데이터 전달", `<p>사용자가 OAuth 연결을 승인하고 SkillMCP 도구를 호출하면 요청 수행에 필요한 스킬 이름·설명·지침·활성 상태가 OpenAI가 운영하는 ChatGPT 또는 Codex 클라이언트로 전달됩니다. 계정 이메일, 비밀번호, 인증 토큰과 내부 로그는 MCP 도구 결과에 포함하지 않습니다.</p>`),
      section("4. 보관 및 삭제", `<p>계정과 사용자 콘텐츠는 계정이 유지되는 동안 보관합니다. 브라우저 세션은 마지막 사용 후 최대 30일이며 최초 로그인 후 90일을 넘지 않습니다. 이메일 확인 토큰은 24시간, 비밀번호 재설정 토큰은 30분, OAuth 액세스 토큰은 1시간, 갱신 토큰은 30일 동안 유효합니다. 계정이 삭제되면 관련 스킬과 인증 토큰도 함께 삭제합니다.</p>`),
      section("5. 처리 위탁 및 국외 처리", `<p>서비스는 클라우드 인프라, 이메일 전송 서비스와 OpenAI 플러그인 연결 기능을 사용합니다. 데이터는 서비스 제공에 필요한 범위에서 해당 사업자의 인프라가 위치한 국가에서 처리될 수 있습니다. 실제 출시 전 이용 사업자, 처리 국가와 보관 기간을 본 정책에 구체적으로 반영합니다.</p>`),
      section("6. 이용자의 권리", `<p>이용자는 자신의 정보 열람, 정정, 삭제와 처리 제한을 요청할 수 있습니다. 계정 삭제는 <a href="/account-deletion">계정 삭제 페이지</a>에서 직접 요청하거나 ${supportContact}로 문의할 수 있습니다.</p>`),
      section("7. 보안", `<p>SkillMCP는 전송 구간 암호화, 비밀번호 scrypt 해시, 이메일 확인, 로그인 시도 제한, HttpOnly 세션 쿠키, OAuth PKCE, 최소 권한 범위와 토큰 해시 저장을 사용합니다. 다만 어떤 시스템도 절대적인 보안을 보장할 수는 없습니다.</p>`),
      section("8. 아동의 개인정보", `<p>SkillMCP는 만 14세 미만 아동을 대상으로 하지 않으며, 법정대리인의 동의 없이 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>`),
      section("9. 변경 및 문의", `<p>중요한 변경은 시행 전에 서비스 내 공지 또는 적절한 방법으로 안내합니다. 개인정보 관련 문의는 ${supportContact}로 보내주세요.</p>`)
    ].join("");
    res.type("html").send(page({ title: "개인정보처리방침", eyebrow: "Privacy Policy", content, publisher, supportEmail }));
  });

  app.get("/terms", (_, res) => {
    const content = [
      section("1. 서비스", `<p>SkillMCP는 사용자가 재사용 가능한 작업 지침을 설치·작성·활성화하고, 승인된 MCP 클라이언트에서 이를 조회하거나 활성 상태를 변경할 수 있게 합니다.</p>`),
      section("2. 계정과 보안", `<p>이용자는 정확한 계정 정보를 제공하고 인증 정보를 안전하게 관리해야 합니다. 계정에서 발생한 의심스러운 활동을 발견하면 즉시 ${supportContact}로 알려야 합니다.</p>`),
      section("3. 사용자 콘텐츠", `<p>이용자는 자신이 작성한 스킬 콘텐츠에 대한 권리를 유지합니다. 이용자는 서비스를 제공하고 선택한 MCP 클라이언트에 해당 콘텐츠를 전달하는 데 필요한 범위에서 ${escapeHtml(publisher)}가 콘텐츠를 저장·처리하도록 허용합니다. 타인의 권리나 법률을 침해하는 콘텐츠를 업로드해서는 안 됩니다.</p>`),
      section("4. 오픈소스 스킬", `<p>마켓플레이스에 표시되는 제3자 오픈소스 스킬은 각 저장소에 표시된 라이선스와 조건을 따릅니다. SkillMCP는 출처와 라이선스 정보를 가능한 범위에서 표시하지만, 이용자는 사용 전에 해당 조건을 확인해야 합니다.</p>`),
      section("5. 금지 행위", `<ul><li>불법 행위, 권리 침해, 악성 코드 배포 또는 보안 우회</li><li>서비스·계정·인프라에 대한 무단 접근이나 과도한 자동 요청</li><li>기만, 사칭, 개인정보 또는 비밀정보의 무단 수집</li><li>서비스의 정상 운영이나 다른 이용자의 사용을 방해하는 행위</li></ul>`),
      section("6. AI 결과와 책임", `<p>스킬은 AI의 응답 방식을 안내하지만 결과의 정확성, 완전성 또는 특정 목적 적합성을 보장하지 않습니다. 의료·법률·재무 등 중요한 판단에는 자격 있는 전문가의 검토가 필요합니다. 여러 스킬을 동시에 활성화하면 토큰 사용량이 증가하거나 지침이 충돌할 수 있습니다.</p>`),
      section("7. 변경·중단·해지", `<p>보안, 유지보수 또는 법적 사유로 서비스의 일부를 변경하거나 일시 중단할 수 있습니다. 이용자는 언제든지 계정을 삭제할 수 있으며, 약관 위반이나 보안 위험이 있는 계정은 제한 또는 해지될 수 있습니다.</p>`),
      section("8. 보증과 책임 제한", `<p>서비스는 관련 법률이 허용하는 범위에서 현재 상태로 제공됩니다. ${escapeHtml(publisher)}는 간접적·특별·결과적 손해에 대해 법률이 허용하는 범위에서 책임을 제한합니다. 이 조항은 강행 법규에 따른 이용자의 권리를 제한하지 않습니다.</p>`),
      section("9. 준거법 및 문의", `<p>본 약관은 대한민국 법률을 따릅니다. 분쟁은 당사자 간 협의를 우선하며, 해결되지 않을 경우 관련 법률이 정한 법원에서 처리합니다. 문의: ${supportContact}</p>`)
    ].join("");
    res.type("html").send(page({ title: "이용약관", eyebrow: "Terms of Service", content, publisher, supportEmail }));
  });

  app.get("/support", (_, res) => {
    const contactBlock = supportEmail
      ? `<div class="notice"><strong>지원 이메일</strong><br><a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a><br>문의에는 계정 이메일, 발생 시각, 재현 절차를 적어주세요. 비밀번호나 OAuth 토큰은 보내지 마세요.</div>`
      : `<div class="notice danger"><strong>출시 전 설정 필요</strong><br>도메인이 정해지면 <code>SUPPORT_EMAIL</code> 환경변수에 실제 지원 이메일을 설정합니다.</div>`;
    const content = [
      section("문의", contactBlock),
      section("지원 범위", `<ul><li>계정 및 MCP 연결 문제</li><li>스킬 설치·활성화·작성 문제</li><li>개인정보 열람·정정·삭제 요청</li><li>보안 취약점과 악용 신고</li></ul>`),
      section("응답", `<p>영업일 기준으로 가능한 빠르게 확인합니다. 보안 사고나 서비스 장애처럼 긴급한 문제를 우선 처리합니다.</p>`),
      section("계정 도움말", `<p><a href="/forgot-password">비밀번호 재설정</a>을 요청하거나 <a href="/account-deletion">계정 삭제 페이지</a>에서 계정과 저장된 스킬을 직접 삭제할 수 있습니다.</p>`)
    ].join("");
    res.type("html").send(page({ title: "고객지원", eyebrow: "Support", content, publisher, supportEmail }));
  });

  app.get("/verify-email", (req, res) => {
    const verified = confirmEmailVerification(String(req.query.token || ""));
    const content = section("확인 결과", verified
      ? `<div class="notice"><strong>이메일 확인이 완료되었습니다.</strong><br><a href="/">SkillMCP로 돌아가 로그인</a>할 수 있습니다.</div>`
      : `<div class="notice danger"><strong>링크가 유효하지 않거나 만료되었습니다.</strong><br>가입 화면에서 확인 메일을 다시 요청해주세요.</div>`);
    res.set("Cache-Control", "no-store");
    res.type("html").send(page({ title: "이메일 확인", eyebrow: "Email Verification", content, publisher, supportEmail }));
  });

  app.get("/resend-verification", (req, res) => {
    const sent = String(req.query.sent || "") === "1";
    const notice = sent ? `<div class="notice"><strong>요청을 접수했습니다.</strong><br>확인되지 않은 계정이라면 새 링크를 전송했습니다.</div>` : "";
    const content = section("확인 링크 다시 받기", `${notice}<p>가입한 이메일을 입력하세요. 계정 존재 여부와 관계없이 같은 결과를 표시합니다.</p><form class="form" method="post" action="/resend-verification"><label>계정 이메일<input type="email" name="email" autocomplete="email" required></label><button type="submit">확인 링크 보내기</button></form>`);
    res.set("Cache-Control", "no-store");
    res.type("html").send(page({ title: "이메일 확인 재전송", eyebrow: "Email Verification", content, publisher, supportEmail }));
  });

  app.post("/resend-verification", async (req, res) => {
    try { await requestEmailVerification(String(req.body.email || "")); } catch { /* keep the response non-enumerating */ }
    res.redirect(303, "/resend-verification?sent=1");
  });

  app.get("/forgot-password", (req, res) => {
    const sent = String(req.query.sent || "") === "1";
    const notice = sent ? `<div class="notice" role="status" aria-live="polite"><strong>✓ 요청을 접수했습니다.</strong><br>가입된 이메일이라면 재설정 링크를 전송했습니다. 받은편지함과 스팸함을 확인해주세요.</div>` : "";
    const buttonLabel = sent ? "재설정 링크 다시 보내기" : "재설정 링크 보내기";
    const content = section("재설정 링크 받기", `${notice}<p>가입한 이메일을 입력하세요. 계정 존재 여부와 관계없이 같은 결과를 표시합니다.</p><form class="form" method="post" action="/forgot-password"><label>계정 이메일<input type="email" name="email" autocomplete="email" required></label><button type="submit" data-loading-label="전송 중…">${buttonLabel}</button></form>`);
    res.set("Cache-Control", "no-store");
    res.type("html").send(page({ title: "비밀번호 찾기", eyebrow: "Password Reset", content, publisher, supportEmail }));
  });

  app.post("/forgot-password", async (req, res) => {
    try { await requestPasswordReset(String(req.body.email || "")); } catch { /* keep the response non-enumerating */ }
    res.redirect(303, "/forgot-password?sent=1");
  });

  app.get("/reset-password", (req, res) => {
    const token = String(req.query.token || "");
    const result = String(req.query.result || "");
    const notice = result === "failed" ? `<div class="notice danger"><strong>재설정하지 못했습니다.</strong><br>링크가 만료되었거나 비밀번호가 11자 미만입니다.</div>` : "";
    const content = section("새 비밀번호 설정", `${notice}<form class="form" method="post" action="/reset-password"><input type="hidden" name="token" value="${escapeHtml(token)}"><label>새 비밀번호<input type="password" name="newPassword" autocomplete="new-password" minlength="11" required></label><button type="submit" data-loading-label="변경 중…">비밀번호 변경</button></form>`);
    res.set("Cache-Control", "no-store");
    res.type("html").send(page({ title: "비밀번호 재설정", eyebrow: "Password Reset", content, publisher, supportEmail }));
  });

  app.post("/reset-password", (req, res) => {
    const result = confirmPasswordReset(String(req.body.token || ""), String(req.body.newPassword || ""));
    if (!result.ok) return res.redirect(303, `/reset-password?result=failed&token=${encodeURIComponent(String(req.body.token || ""))}`);
    return res.redirect(303, "/?passwordReset=1");
  });

  app.get("/account-deletion", (req, res) => {
    const result = String(req.query.result || "");
    const notice = result === "deleted"
      ? `<div class="notice"><strong>계정이 삭제되었습니다.</strong><br>저장된 스킬과 OAuth 연결 토큰도 함께 삭제했습니다.</div>`
      : result === "failed"
        ? `<div class="notice danger"><strong>삭제하지 못했습니다.</strong><br>입력한 정보와 확인 문구를 다시 확인해주세요.</div>`
        : "";
    const content = section("삭제되는 정보", `<p>계정 이메일, 비밀번호 검증값, 설치·작성한 스킬, 활성 설정, 즐겨찾기와 발급된 OAuth 토큰이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>${notice}<form class="form" method="post" action="/account-deletion"><label>계정 이메일<input type="email" name="email" autocomplete="username" required></label><label>현재 비밀번호<input type="password" name="password" autocomplete="current-password" required></label><label>확인 문구<input type="text" name="confirmation" placeholder="DELETE" pattern="DELETE" required></label><button type="submit">계정과 데이터 영구 삭제</button></form>`);
    res.set("Cache-Control", "no-store");
    res.type("html").send(page({ title: "계정 삭제", eyebrow: "Account Deletion", content, publisher, supportEmail }));
  });

  app.post("/account-deletion", (req, res) => {
    const deleted = deleteAccountByCredentials({
      email: String(req.body.email || ""),
      password: String(req.body.password || ""),
      confirmation: String(req.body.confirmation || "")
    });
    res.redirect(303, `/account-deletion?result=${deleted ? "deleted" : "failed"}`);
  });
}
