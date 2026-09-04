import { useEffect, useState } from "react";

export default function Account({ c, user, busy, actions }) {
  const [nickname, setNickname] = useState(user.nickname || "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => setNickname(user.nickname || ""), [user.nickname]);

  async function saveProfile(event) {
    event.preventDefault();
    setNotice("");
    try {
      await actions.updateProfile({ nickname });
      setNotice(c.profileSaved);
    } catch {}
  }

  async function changePassword(event) {
    event.preventDefault();
    setNotice("");
    if (passwords.newPassword !== passwords.confirmPassword) return actions.showError("PASSWORD_MISMATCH");
    try {
      await actions.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice(c.passwordChanged);
    } catch {}
  }

  return (
    <>
      <section className="page-titlebar">
        <div><p className="eyebrow">{c.account}</p><h1>{c.accountTitle}</h1><p className="hero-copy">{c.accountCopy}</p></div>
        <div className="title-actions"><span>{user.email}</span><strong>{c.verifiedAccount}</strong></div>
      </section>
      <section className="account-page">
        {notice && <div className="account-notice">{notice}</div>}
        <div className="account-grid">
          <form className="settings-card" onSubmit={saveProfile}>
            <header><p className="section-label">{c.profile}</p><h2>{c.nicknameSettings}</h2><span>{c.nicknameCopy}</span></header>
            <label>{c.nickname}<input required minLength={2} maxLength={24} value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="nickname" /></label>
            <label>{c.email}<input value={user.email} readOnly disabled /></label>
            <div className="settings-actions"><button className="primary" disabled={busy === "profile"}>{busy === "profile" ? c.saving : c.saveChanges}</button></div>
          </form>
          <form className="settings-card" onSubmit={changePassword}>
            <header><p className="section-label">{c.security}</p><h2>{c.changePassword}</h2><span>{c.passwordSecurityCopy}</span></header>
            <label>{c.currentPassword}<input type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label>
            <label>{c.newPassword}<input type="password" required minLength={11} autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label>
            <label>{c.confirmPassword}<input type="password" required minLength={11} autoComplete="new-password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label>
            <p className="form-help">{c.passwordChangeHelp}</p>
            <div className="settings-actions"><button className="primary" disabled={busy === "password"}>{busy === "password" ? c.saving : c.changePassword}</button></div>
          </form>
        </div>
        <div className="account-danger"><div><strong>{c.deleteAccount}</strong><span>{c.deleteAccountCopy}</span></div><a className="danger-button" href="/account-deletion">{c.openDeletion}</a></div>
      </section>
    </>
  );
}
