(function () {
  const {
    loadSavedConfig,
    loadStaticConfig,
    renderForm,
    collectValues,
    validateValues,
    getDynamicDependencyIds,
    submitToGoogleSheets
  } = window.FormStudio;

  const container = document.getElementById("publicForm");
  const toast = document.getElementById("toast");
  let config = null;
  let currentStep = 0;
  let values = {};
  let hasRendered = false;
  let pendingRender = null;

  async function init() {
    showLoading();
    try {
      config = loadSavedConfig();
      if (!config) {
        config = await loadStaticConfig();
      }
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
    if (hasRendered) {
      form.classList.add("no-animate");
    }
    hasRendered = true;
    form.addEventListener("input", () => {
      values = collectValues(form, config);
    });
    form.addEventListener("change", (event) => {
      values = collectValues(form, config);
      if (shouldRerenderForChange(event)) {
        currentStep = Math.min(currentStep, config.fields.length - 1);
        scheduleRender(captureFocusState());
      }
    });
    form.addEventListener("submit", submitForm);
  }

  function scheduleRender(focusState) {
    window.clearTimeout(pendingRender);
    pendingRender = window.setTimeout(() => {
      render();
      restoreFocusState(focusState);
    }, 70);
  }

  function shouldRerenderForChange(event) {
    const name = event.target && event.target.name;
    if (!name) return false;
    return getDynamicDependencyIds(config).has(name);
  }

  function changeStep(nextStep) {
    const form = container.querySelector("form");
    values = collectValues(form, config);
    currentStep = Math.max(0, Math.min(nextStep, config.fields.length - 1));
    render();
  }

  function captureFocusState() {
    const active = document.activeElement;
    if (!active || !container.contains(active) || !active.name) return null;
    const state = {
      name: active.name,
      value: active.value,
      checked: active.checked,
      selectionStart: null,
      selectionEnd: null
    };
    if (typeof active.selectionStart === "number" && typeof active.selectionEnd === "number") {
      state.selectionStart = active.selectionStart;
      state.selectionEnd = active.selectionEnd;
    }
    return state;
  }

  function restoreFocusState(state) {
    if (!state || !state.name) return;
    const selector = `[name="${escapeSelector(state.name)}"]`;
    const candidates = Array.from(container.querySelectorAll(selector));
    const target = candidates.find((item) => item.value === state.value || item.checked === state.checked) || candidates[0];
    if (!target) return;
    target.focus({ preventScroll: true });
    if (typeof target.setSelectionRange === "function" && state.selectionStart !== null) {
      try {
        target.setSelectionRange(state.selectionStart, state.selectionEnd);
      } catch (error) {
        // Some input types do not support text selection.
      }
    }
  }

  function escapeSelector(value) {
    return window.CSS && typeof window.CSS.escape === "function"
      ? window.CSS.escape(value)
      : String(value).replace(/"/g, '\\"');
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
      await submitToGoogleSheets(config, values);
      showSuccess();
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

  function showSuccess() {
    container.innerHTML = `
      <div class="dynamic-form result-state success-state">
        <div class="success-mark">OK</div>
        <h1>Submission sent</h1>
        <p>The form sent the request to the connected Google Apps Script endpoint. If the Apps Script URL and deployment are correct, the response will be added to the Google Sheet.</p>
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
