export const messages = {
  en: {
    signIn: "Sign in", createAccount: "Create account", sendVerificationEmail: "Send verification email", sending: "Sending…", emailVerificationGuide: "We'll create your account after you verify the link sent to this address.", nickname: "Nickname", nicknamePlaceholder: "2–24 characters", email: "Email", password: "Password", runtime: "WebMCP skill runtime",
    newUser: "New to SkillMCP?", existingUser: "Already have an account?", forgotPassword: "Forgot password?", resendVerification: "Resend verification email", verificationHelp: "Didn't receive the verification email?", verificationSent: "Check your inbox and verify your email before signing in.", verificationResent: "If this email belongs to an unverified account, a new link has been sent.",
    authTitle: "Your skills belong in every conversation.",
    authCopy: "Install, manage, and invoke reusable workflows from any WebMCP-enabled conversation.",
    marketplace: "Marketplace", library: "My library", createSkill: "Create skill", connectMcp: "Connect MCP", signOut: "Sign out",
    signInRequiredTitle: "Sign in to manage your skills.", signInRequiredCopy: "Your marketplace installs, custom workflows, and active skill are saved to your account.",
    search: "Search skills, categories, or tags", all: "All", featured: "Featured", mostInstalled: "Most installed",
    highestRated: "Highest rated", recentlyUpdated: "Recently updated", favorites: "Favorites",
    marketTitle: "Discover skills built for real work.", marketCopy: "Community workflows, one click away from your web agent.",
    verifiedOpen: "Verified open source", communitySkills: "Community published", install: "Install", installed: "Installed", installing: "Installing", ownSkill: "Your skill",
    quickView: "Quick view", viewSource: "View source", by: "by", installs: "installs", updated: "Updated",
    source: "Source", license: "License", language: "Language", category: "Category", tags: "Tags",
    close: "Close", addFavorite: "Add to favorites", removeFavorite: "Remove favorite", noRatings: "No ratings", ratings: "ratings", rateSkill: "Rate this skill", installToRate: "Install this skill before rating it.", emptyMarketplace: "No public skills yet.", emptyMarketplaceCopy: "Publish the first real community skill instead of showing demo listings.",
    libraryTitle: "Your installed skills.", libraryCopy: "Search, activate, edit, duplicate, and organize the workflows available to your agent.",
    totalSkills: "Total skills", activeContext: "Active context", customSkills: "Custom skills",
    allSkills: "All skills", marketplaceSkills: "Marketplace", mySkills: "Created by me",
    activate: "Activate", active: "Active", manage: "Manage", duplicate: "Duplicate", edit: "Edit",
    remove: "Remove", deleteTitle: "Remove this skill?", deleteCopy: "The skill will be removed from your library. This cannot be undone.",
    cancel: "Cancel", confirmRemove: "Remove skill", empty: "No skills match this view.", browseMarket: "Browse marketplace",
    agentHandoff: "Agent handoff", webmcpReady: "WebMCP tools ready", webmcpMissing: "WebMCP is unavailable in this browser",
    agentCopy: "Only the active workflow is returned to your agent.", copyResponse: "Copy response", copied: "Copied",
    invocation: "Use SkillMCP to get my active skill, then follow it.",
    responseLanguage: "Response language", responseLanguageAuto: "Automatic", responseLanguageHelp: "Applied to ordinary answers even when a skill is written in another language.", translationException: "Translation, proofreading, quotation, and source-language requests follow the language specified in the current task.",
    createTitle: "Publish-quality skills start with a clear workflow.",
    createCopy: "Define discovery metadata, execution instructions, and output standards in one guided editor.",
    basics: "Basics", behavior: "Instructions", review: "Review", skillName: "Skill name",
    shortDescription: "Short description", skillCategory: "Category", skillLanguage: "Instruction language",
    visibility: "Visibility", private: "Private", unlisted: "Unlisted", public: "Public",
    tagHelp: "Tags, separated by commas", instructions: "SKILL.md instructions",
    instructionHelp: "Describe triggers, ordered steps, constraints, and the expected output.",
    template: "Start from a template", blank: "Blank", researchTemplate: "Research", writingTemplate: "Writing",
    reviewTemplate: "Review", preview: "Live preview", characters: "characters", completeness: "Completeness",
    saveSkill: "Save skill", updateSkill: "Update skill", saved: "Skill saved to your library.",
    nameHint: "Clear, specific, and easy to invoke", descriptionHint: "Explain what it does and when to use it",
    markdownHint: "Markdown is supported. Strong skills include trigger conditions and a definition of done.",
    account: "Account", settings: "Settings", accountTitle: "Manage your account.", accountCopy: "Update your public nickname and protect access to your private skill library.", verifiedAccount: "Email verified", profile: "Profile", nicknameSettings: "Nickname", nicknameCopy: "This name is shown as the creator of public marketplace skills.", security: "Security", currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password", changePassword: "Change password", passwordSecurityCopy: "Use at least 11 characters and avoid passwords used elsewhere.", passwordChangeHelp: "Changing your password signs out other sessions and disconnects existing MCP OAuth tokens.", saveChanges: "Save changes", saving: "Saving…", profileSaved: "Profile updated.", passwordChanged: "Password changed. This session remains signed in.", deleteAccount: "Delete account", deleteAccountCopy: "Permanently remove your account and private data.", openDeletion: "Open deletion page", noActive: "No active skill", openLibrary: "Open library", openSkills: "Open skills", tools: "WebMCP tools", languages: "Languages", readyToSave: "Ready",
    connectTitle: "Connect SkillMCP to your AI client.", connectCopy: "Use the same private skill library from ChatGPT desktop, Codex, or another OAuth-compatible MCP client.", serverAddress: "Streamable HTTP server", copy: "Copy", beforeConnect: "Before you connect", beforeConnectCopy: "Create and verify a SkillMCP account first. OAuth will ask you to sign in and approve read/write access to your skill activation state.", officialDocs: "Official OpenAI guide", desktopApp: "ChatGPT desktop · Codex", connectFromSettings: "Add from MCP settings", desktopStep1: "Open Settings and select MCP servers.", desktopStep2: "Select Add server and enter SkillMCP as the name.", desktopStep3: "Choose Streamable HTTP and paste the server address above.", desktopStep4: "Save, restart the client, then select Authenticate.", desktopStep5: "Sign in to SkillMCP and approve the requested permissions.", connectFromCli: "Connect from a terminal", cliHelp: "After login, run /mcp or codex mcp list to confirm that SkillMCP is enabled.", useAfterConnect: "After connection", tryPrompts: "Try a real workflow", connectPrompt1: "Show the skills installed in my SkillMCP library.", connectPrompt2: "Activate one of the skills installed in my SkillMCP library.", connectPrompt3: "Load my active SkillMCP skills and apply them to this task.", webmcpDifference: "When this website is open in the built-in browser, its site tools can work with the same live page without installing the remote MCP server.",
    errors: {
      INVALID_EMAIL: "Enter a valid email address.", INVALID_NICKNAME: "Use 2–24 letters, numbers, spaces, dots, underscores, or hyphens.", SHORT_PASSWORD: "Use at least 11 characters.", INVALID_CURRENT_PASSWORD: "The current password is incorrect.", PASSWORD_MISMATCH: "The new passwords do not match.", PASSWORD_UNCHANGED: "Choose a password different from the current password.",
      ACCOUNT_EXISTS: "An account already exists for this email.", INVALID_CREDENTIALS: "Incorrect email or password.",
      EMAIL_NOT_VERIFIED: "Verify your email before signing in.", LOGIN_TEMPORARILY_BLOCKED: "Too many attempts. Try again in 15 minutes.",
      EMAIL_DELIVERY_FAILED: "We couldn't send the verification email. Please try again later.",
      AUTH_REQUIRED: "Please sign in again.", ALREADY_INSTALLED: "This skill is already installed.",
      UPSTREAM_UNAVAILABLE: "The source repository is unavailable right now.", REQUIRED_FIELDS: "Complete all required fields.", INVALID_RESPONSE_LANGUAGE: "Choose a supported response language.",
      MARKET_SKILL_READ_ONLY: "Duplicate this marketplace skill before editing it.", NOT_FOUND: "The skill could not be found.", INVALID_RATING: "Choose a rating from 1 to 5.", INSTALL_REQUIRED: "Install the skill before rating it.", CANNOT_RATE_OWN_SKILL: "You cannot rate your own skill.", OWN_SKILL: "This is your published skill.",
      DEFAULT: "Something went wrong. Please try again."
    }
  },
  ko: {
    signIn: "로그인", createAccount: "계정 만들기", sendVerificationEmail: "인증 메일 발송", sending: "발송 중…", emailVerificationGuide: "이 주소로 받은 링크를 확인하면 계정 생성이 완료됩니다.", nickname: "닉네임", nicknamePlaceholder: "2~24자", email: "이메일", password: "비밀번호", runtime: "WebMCP 스킬 런타임",
    newUser: "SkillMCP가 처음인가요?", existingUser: "이미 계정이 있나요?", forgotPassword: "비밀번호를 잊으셨나요?", resendVerification: "확인 메일 다시 보내기", verificationHelp: "확인 메일을 받지 못했나요?", verificationSent: "받은 편지함의 확인 링크를 누른 뒤 로그인해주세요.", verificationResent: "미확인 계정이라면 새 확인 링크를 전송했습니다.",
    authTitle: "모든 대화에, 나만의 스킬을.",
    authCopy: "WebMCP 지원 대화 어디서든 재사용 가능한 워크플로를 설치하고 관리하고 호출하세요.",
    marketplace: "마켓플레이스", library: "내 라이브러리", createSkill: "스킬 만들기", connectMcp: "MCP 연결", signOut: "로그아웃",
    signInRequiredTitle: "스킬을 관리하려면 로그인하세요.", signInRequiredCopy: "마켓 설치 항목, 직접 만든 워크플로, 활성 스킬이 계정에 안전하게 저장됩니다.",
    search: "스킬, 카테고리 또는 태그 검색", all: "전체", featured: "추천", mostInstalled: "최다 설치",
    highestRated: "평점 높은 순", recentlyUpdated: "최근 업데이트", favorites: "즐겨찾기",
    marketTitle: "실제 업무를 위한 스킬을 발견하세요.", marketCopy: "커뮤니티 워크플로를 클릭 한 번으로 웹 에이전트에 연결합니다.",
    verifiedOpen: "오픈소스 검증됨", communitySkills: "커뮤니티 공개", install: "설치", installed: "설치됨", installing: "설치 중", ownSkill: "내 스킬",
    quickView: "빠른 보기", viewSource: "원본 보기", by: "제작", installs: "회 설치", updated: "업데이트",
    source: "출처", license: "라이선스", language: "언어", category: "카테고리", tags: "태그",
    close: "닫기", addFavorite: "즐겨찾기 추가", removeFavorite: "즐겨찾기 해제", noRatings: "평가 없음", ratings: "평점", rateSkill: "이 스킬 평가하기", installToRate: "스킬을 설치한 뒤 평가할 수 있습니다.", emptyMarketplace: "아직 공개된 스킬이 없습니다.", emptyMarketplaceCopy: "데모 목록 대신 실제 사용자가 공개한 스킬만 표시합니다.",
    libraryTitle: "설치한 스킬을 관리하세요.", libraryCopy: "에이전트가 사용할 워크플로를 검색하고 활성화하고 편집·복제·정리할 수 있습니다.",
    totalSkills: "전체 스킬", activeContext: "활성 컨텍스트", customSkills: "직접 만든 스킬",
    allSkills: "전체 스킬", marketplaceSkills: "마켓 설치", mySkills: "직접 만든 스킬",
    activate: "활성화", active: "사용 중", manage: "관리", duplicate: "복제", edit: "편집",
    remove: "삭제", deleteTitle: "이 스킬을 삭제할까요?", deleteCopy: "라이브러리에서 스킬이 제거되며 되돌릴 수 없습니다.",
    cancel: "취소", confirmRemove: "스킬 삭제", empty: "현재 조건에 맞는 스킬이 없습니다.", browseMarket: "마켓 둘러보기",
    agentHandoff: "에이전트 전달", webmcpReady: "WebMCP 도구 준비 완료", webmcpMissing: "이 브라우저에서는 WebMCP를 사용할 수 없습니다",
    agentCopy: "활성화된 워크플로 하나만 에이전트에 반환됩니다.", copyResponse: "응답 복사", copied: "복사됨",
    invocation: "SkillMCP로 내 활성 스킬을 가져와서 그 지침을 따라줘.",
    responseLanguage: "답변 언어", responseLanguageAuto: "자동", responseLanguageHelp: "스킬 작성 언어와 관계없이 일반 답변에 적용됩니다.", translationException: "번역·교정·인용·원문 유지 작업은 현재 요청에 지정된 언어를 우선합니다.",
    createTitle: "좋은 스킬은 명확한 워크플로에서 시작합니다.",
    createCopy: "검색용 정보, 실행 지침, 결과 기준을 단계별 편집기에서 한 번에 정의하세요.",
    basics: "기본 정보", behavior: "실행 지침", review: "검토", skillName: "스킬 이름",
    shortDescription: "짧은 설명", skillCategory: "카테고리", skillLanguage: "지침 언어",
    visibility: "공개 범위", private: "비공개", unlisted: "링크 공개", public: "공개",
    tagHelp: "태그를 쉼표로 구분", instructions: "SKILL.md 지침",
    instructionHelp: "호출 조건, 순서가 있는 단계, 제약사항, 기대 결과를 작성하세요.",
    template: "템플릿으로 시작", blank: "빈 스킬", researchTemplate: "리서치", writingTemplate: "글쓰기",
    reviewTemplate: "검토", preview: "실시간 미리보기", characters: "자", completeness: "완성도",
    saveSkill: "스킬 저장", updateSkill: "수정 저장", saved: "라이브러리에 스킬을 저장했습니다.",
    nameHint: "명확하고 구체적이며 호출하기 쉬운 이름", descriptionHint: "무엇을 하고 언제 쓰는지 설명하세요",
    markdownHint: "Markdown을 지원합니다. 호출 조건과 완료 기준을 포함하면 좋은 스킬이 됩니다.",
    account: "계정", settings: "설정", accountTitle: "내 계정을 관리하세요.", accountCopy: "공개 닉네임을 수정하고 개인 스킬 라이브러리의 접근을 안전하게 관리합니다.", verifiedAccount: "이메일 인증 완료", profile: "프로필", nicknameSettings: "닉네임 설정", nicknameCopy: "공개한 마켓플레이스 스킬의 제작자 이름으로 표시됩니다.", security: "보안", currentPassword: "현재 비밀번호", newPassword: "새 비밀번호", confirmPassword: "새 비밀번호 확인", changePassword: "비밀번호 변경", passwordSecurityCopy: "11자 이상으로 만들고 다른 서비스에서 사용하는 비밀번호는 피해주세요.", passwordChangeHelp: "비밀번호를 변경하면 다른 세션과 기존 MCP OAuth 연결이 해제됩니다.", saveChanges: "변경 사항 저장", saving: "저장 중…", profileSaved: "프로필을 수정했습니다.", passwordChanged: "비밀번호를 변경했습니다. 현재 세션은 유지됩니다.", deleteAccount: "계정 삭제", deleteAccountCopy: "계정과 개인 데이터를 영구적으로 삭제합니다.", openDeletion: "삭제 페이지 열기", noActive: "활성 스킬 없음", openLibrary: "라이브러리 열기", openSkills: "오픈 스킬", tools: "WebMCP 도구", languages: "지원 언어", readyToSave: "저장 준비 완료",
    connectTitle: "SkillMCP를 AI 클라이언트에 연결하세요.", connectCopy: "ChatGPT 데스크톱, Codex 또는 OAuth 호환 MCP 클라이언트에서 같은 개인 스킬 라이브러리를 사용할 수 있습니다.", serverAddress: "Streamable HTTP 서버", copy: "복사", beforeConnect: "연결 전 준비", beforeConnectCopy: "먼저 SkillMCP 계정을 만들고 이메일 인증을 완료하세요. OAuth 화면에서 로그인한 뒤 스킬 읽기와 활성 상태 변경 권한을 승인합니다.", officialDocs: "OpenAI 공식 가이드", desktopApp: "ChatGPT 데스크톱 · Codex", connectFromSettings: "MCP 설정에서 추가", desktopStep1: "설정을 열고 MCP servers를 선택합니다.", desktopStep2: "Add server를 선택하고 이름에 SkillMCP를 입력합니다.", desktopStep3: "Streamable HTTP를 선택하고 위 서버 주소를 붙여 넣습니다.", desktopStep4: "저장한 뒤 클라이언트를 재시작하고 Authenticate를 선택합니다.", desktopStep5: "SkillMCP에 로그인하고 요청된 권한을 승인합니다.", connectFromCli: "터미널에서 연결", cliHelp: "로그인 후 /mcp 또는 codex mcp list로 SkillMCP가 활성화됐는지 확인하세요.", useAfterConnect: "연결 후 사용", tryPrompts: "실제 워크플로 실행", connectPrompt1: "내 SkillMCP 라이브러리에 설치된 스킬을 보여줘.", connectPrompt2: "내 SkillMCP 라이브러리에 설치된 스킬 하나를 활성화해줘.", connectPrompt3: "내 활성 SkillMCP 스킬을 불러와서 이 작업에 적용해줘.", webmcpDifference: "이 사이트를 내장 브라우저로 열면 원격 MCP를 별도로 설치하지 않아도 사이트 도구가 같은 라이브 페이지와 로그인 상태에서 동작할 수 있습니다.",
    errors: {
      INVALID_EMAIL: "올바른 이메일 주소를 입력하세요.", INVALID_NICKNAME: "닉네임은 2~24자의 한글·영문·숫자·공백·점·밑줄·하이픈으로 입력하세요.", SHORT_PASSWORD: "비밀번호는 11자 이상이어야 합니다.", INVALID_CURRENT_PASSWORD: "현재 비밀번호가 올바르지 않습니다.", PASSWORD_MISMATCH: "새 비밀번호가 서로 일치하지 않습니다.", PASSWORD_UNCHANGED: "현재 비밀번호와 다른 비밀번호를 사용하세요.",
      ACCOUNT_EXISTS: "이미 가입된 이메일입니다.", INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
      EMAIL_NOT_VERIFIED: "이메일 확인을 완료한 뒤 로그인해주세요.", LOGIN_TEMPORARILY_BLOCKED: "로그인 시도가 많아 잠시 차단되었습니다. 15분 뒤 다시 시도해주세요.",
      EMAIL_DELIVERY_FAILED: "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
      AUTH_REQUIRED: "다시 로그인해 주세요.", ALREADY_INSTALLED: "이미 설치한 스킬입니다.",
      UPSTREAM_UNAVAILABLE: "현재 원본 저장소에 접근할 수 없습니다.", REQUIRED_FIELDS: "필수 항목을 모두 입력하세요.", INVALID_RESPONSE_LANGUAGE: "지원하지 않는 답변 언어입니다.",
      MARKET_SKILL_READ_ONLY: "마켓 스킬은 복제한 뒤 편집할 수 있습니다.", NOT_FOUND: "스킬을 찾을 수 없습니다.", INVALID_RATING: "1점부터 5점 사이로 평가해주세요.", INSTALL_REQUIRED: "스킬을 설치한 뒤 평가할 수 있습니다.", CANNOT_RATE_OWN_SKILL: "자신이 만든 스킬은 평가할 수 없습니다.", OWN_SKILL: "직접 공개한 스킬입니다.",
      DEFAULT: "문제가 발생했습니다. 다시 시도해 주세요."
    }
  }
};

export const categoryNames = {
  en: { All: "All", Favorites: "Favorites", Research: "Research", Engineering: "Engineering", Security: "Security", Planning: "Planning", Writing: "Writing", Other: "Other" },
  ko: { All: "전체", Favorites: "즐겨찾기", Research: "리서치", Engineering: "개발", Security: "보안", Planning: "기획·설계", Writing: "글쓰기", Other: "기타" }
};

export const languageNames = {
  en: { English: "English", Korean: "Korean", Japanese: "Japanese", Spanish: "Spanish" },
  ko: { English: "영어", Korean: "한국어", Japanese: "일본어", Spanish: "스페인어" }
};

export const tagNames = {
  en: {},
  ko: { Research: "리서치", Citations: "출처", Analysis: "분석", Code: "코드", Review: "리뷰", Quality: "품질", Security: "보안", OWASP: "OWASP", "Threat model": "위협 모델", Architecture: "아키텍처", Planning: "설계", Scale: "확장성", Writing: "글쓰기", Docs: "문서", Communication: "커뮤니케이션" }
};

export const skillTemplates = {
  en: {
    blank: "",
    research: "## When to use\nUse this skill when the user asks for research, comparison, or evidence-backed recommendations.\n\n## Workflow\n1. Clarify the decision and scope.\n2. Gather primary and current sources.\n3. Cross-check important claims.\n4. Synthesize findings and limitations.\n\n## Definition of done\n- Every consequential claim is cited.\n- Facts and inference are clearly separated.\n- End with actionable next steps.",
    writing: "## When to use\nUse this skill when the user asks to draft, rewrite, or improve professional content.\n\n## Workflow\n1. Identify the audience, goal, and tone.\n2. Lead with the outcome.\n3. Organize the content for scanning.\n4. Edit for clarity and accuracy.\n\n## Definition of done\n- The main message is immediately clear.\n- Language is concise and specific.\n- No unsupported claims remain.",
    review: "## When to use\nUse this skill when the user asks for a structured review or second opinion.\n\n## Workflow\n1. Establish intent and acceptance criteria.\n2. Inspect correctness, risks, and edge cases.\n3. Separate blockers from suggestions.\n4. Recommend concrete fixes.\n\n## Definition of done\n- Every finding explains impact.\n- Findings are prioritized.\n- The final verdict is explicit."
  },
  ko: {
    blank: "",
    research: "## 사용 시점\n사용자가 조사, 비교 또는 근거 기반 추천을 요청할 때 이 스킬을 사용합니다.\n\n## 워크플로\n1. 의사결정 목표와 조사 범위를 명확히 합니다.\n2. 최신 1차 자료를 수집합니다.\n3. 중요한 주장을 교차 검증합니다.\n4. 조사 결과와 한계를 종합합니다.\n\n## 완료 기준\n- 중요한 주장마다 출처가 있습니다.\n- 사실과 추론이 명확히 구분됩니다.\n- 실행 가능한 다음 단계로 마무리합니다.",
    writing: "## 사용 시점\n사용자가 전문적인 글의 초안 작성, 재작성 또는 개선을 요청할 때 이 스킬을 사용합니다.\n\n## 워크플로\n1. 독자, 목표, 어조를 파악합니다.\n2. 핵심 결과를 먼저 제시합니다.\n3. 빠르게 읽을 수 있도록 내용을 구성합니다.\n4. 명확성과 정확성을 기준으로 다듬습니다.\n\n## 완료 기준\n- 핵심 메시지가 즉시 이해됩니다.\n- 표현이 간결하고 구체적입니다.\n- 근거 없는 주장이 남아 있지 않습니다.",
    review: "## 사용 시점\n사용자가 구조화된 검토나 두 번째 의견을 요청할 때 이 스킬을 사용합니다.\n\n## 워크플로\n1. 의도와 승인 기준을 확인합니다.\n2. 정확성, 위험, 예외 상황을 점검합니다.\n3. 차단 문제와 개선 제안을 구분합니다.\n4. 구체적인 수정안을 제시합니다.\n\n## 완료 기준\n- 모든 지적에 영향이 설명되어 있습니다.\n- 중요도에 따라 우선순위가 정리됩니다.\n- 최종 판단이 명확합니다."
  }
};
