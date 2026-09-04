document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("form.form, form[data-submit-feedback]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (form.dataset.submitting === "true") {
        event.preventDefault();
        return;
      }

      const submitter = event.submitter || form.querySelector('button[type="submit"]');
      if (submitter?.name) {
        const preservedValue = document.createElement("input");
        preservedValue.type = "hidden";
        preservedValue.name = submitter.name;
        preservedValue.value = submitter.value;
        form.appendChild(preservedValue);
      }

      form.dataset.submitting = "true";
      form.setAttribute("aria-busy", "true");
      form.querySelectorAll('button[type="submit"]').forEach((button) => {
        button.disabled = true;
      });
      if (!submitter) return;
      submitter.setAttribute("aria-busy", "true");
      submitter.textContent = submitter.dataset.loadingLabel || "처리 중…";
    });
  });
});
