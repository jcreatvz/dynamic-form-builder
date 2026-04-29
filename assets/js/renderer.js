(function () {
  const {
    loadSavedConfig,
    loadStaticConfig,
    renderForm,
    collectValues,
    validateValues,
    saveSubmission,
    submitToGoogleSheets
  } = window.FormStudio;

  const container = document.getElementById("publicForm");
  const toast = document.getElementById("toast");
  let config = null;
  let currentStep = 0;
  let values = {};

  async function init() {
    showLoading();
    try {
      config = await loadStaticConfig();
      render();
    } catch (error) {
      config = loadSavedConfig();
      if (config) {
        render();
      } else {
        showError();
      }
    }
  }

  function render() {
    const form = renderForm(container, config, {
      values,
      step: currentStep,
      onStepChange: changeStep
    });
    form.addEventListener("input", () => {
      values = collectValues(form, config);
    });
    form.addEventListener("submit", submitForm);
  }

  function changeStep(nextStep) {
    const form = container.querySelector("form");
    values = collectValues(form, config);
    currentStep = Math.max(0, Math.min(nextStep, config.fields.length - 1));
    render();
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    values = collectValues(form, config);
    if (!validateValues(config, values, form)) {
      showToast("Please complete the required fields.");
      return;
    }

    const submitButton = form.querySelector(".submit-button, .form-actions .button.primary");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      if (config.submission.type === "googleSheets") {
        await submitToGoogleSheets(config, values);
      }

      saveSubmission(values);
      showSuccess(config.submission.type);
    } catch (error) {
      showToast(error.message || "Submission failed. Please try again.");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = config.submitText;
      }
    }
  }

  function showLoading() {
    container.innerHTML = `
      <div class="dynamic-form loading-state">
        <div class="skeleton title"></div>
        <div class="skeleton line"></div>
        <div class="skeleton input"></div>
        <div class="skeleton input short"></div>
      </div>
    `;
  }

  function showError() {
    container.innerHTML = `
      <div class="dynamic-form result-state">
        <h1>Form unavailable</h1>
        <p>The form configuration could not be loaded. Check form-config.json and try again.</p>
        <a class="button primary" href="builder.html">Open Builder</a>
      </div>
    `;
  }

  function showSuccess(type) {
    const message = type === "googleSheets"
      ? "Your response was sent to the connected Google Sheet."
      : "Your response was saved locally in this browser and can be exported as CSV from the builder.";
    container.innerHTML = `
      <div class="dynamic-form result-state success-state">
        <div class="success-mark">OK</div>
        <h1>Submission received</h1>
        <p>${message}</p>
        <button class="button primary" id="submitAnother" type="button">Submit Another</button>
      </div>
    `;
    document.getElementById("submitAnother").addEventListener("click", () => {
      values = {};
      currentStep = 0;
      render();
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  init();
})();
