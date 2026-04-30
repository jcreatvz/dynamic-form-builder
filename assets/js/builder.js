(function () {
  const AUTH_KEY = "dynamicFormStudio.builderAuth";
  const GH_TOKEN_KEY = "dynamicFormStudio.githubToken";
  const AUTH_USER = "onlyjc";
  const AUTH_PASS = "jc123";
  const GITHUB_OWNER = "jcreatvz";
  const GITHUB_REPO = "dynamic-form-builder";
  const GITHUB_BRANCH = "main";
  const CONFIG_PATH = "form-config.json";

  const {
    fieldTypes,
    defaultConfig,
    clone,
    uniqueId,
    normalizeConfig,
    saveConfig,
    loadSavedConfig,
    loadStaticConfig,
    renderForm
  } = window.FormStudio;

  let config = normalizeConfig(loadSavedConfig() || defaultConfig);
  let selectedId = config.fields[0] ? config.fields[0].id : null;
  let builderInitialized = false;

  const nodes = {
    fieldTypeGrid: document.getElementById("fieldTypeGrid"),
    formTitle: document.getElementById("formTitle"),
    formDescription: document.getElementById("formDescription"),
    submitText: document.getElementById("submitText"),
    accentColor: document.getElementById("accentColor"),
    layoutMode: document.getElementById("layoutMode"),
    colorMode: document.getElementById("colorMode"),
    bodyBackgroundImage: document.getElementById("bodyBackgroundImage"),
    formBackgroundImage: document.getElementById("formBackgroundImage"),
    formBackgroundOpacity: document.getElementById("formBackgroundOpacity"),
    heroMediaType: document.getElementById("heroMediaType"),
    heroMediaUrl: document.getElementById("heroMediaUrl"),
    googleEndpoint: document.getElementById("googleEndpoint"),
    googleEndpointRow: document.getElementById("googleEndpointRow"),
    previewDraftBtn: document.getElementById("previewDraftBtn"),
    loadPublishedConfigBtn: document.getElementById("loadPublishedConfigBtn"),
    clearDraftCacheBtn: document.getElementById("clearDraftCacheBtn"),
    builderPreviewTitle: document.getElementById("builderPreviewTitle"),
    builderPreview: document.getElementById("builderPreview"),
    fieldList: document.getElementById("fieldList"),
    fieldEditor: document.getElementById("fieldEditor"),
    inspectorTitle: document.getElementById("inspectorTitle"),
    exportConfigBtn: document.getElementById("exportConfigBtn"),
    pushConfigBtn: document.getElementById("pushConfigBtn"),
    githubToken: document.getElementById("githubToken"),
    saveGithubTokenBtn: document.getElementById("saveGithubTokenBtn"),
    importConfigBtn: document.getElementById("importConfigBtn"),
    configFileInput: document.getElementById("configFileInput"),
    resetConfigBtn: document.getElementById("resetConfigBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    loginGate: document.getElementById("loginGate"),
    loginForm: document.getElementById("loginForm"),
    loginUser: document.getElementById("loginUser"),
    loginPass: document.getElementById("loginPass"),
    rememberLogin: document.getElementById("rememberLogin"),
    loginError: document.getElementById("loginError"),
    toast: document.getElementById("toast")
  };

  function init() {
    bindAuth();
    if (!isAuthenticated()) {
      lockBuilder();
      return;
    }
    unlockBuilder();
    initBuilder();
  }

  function initBuilder() {
    if (builderInitialized) return;
    builderInitialized = true;
    renderFieldTypes();
    bindSettings();
    bindActions();
    syncSettings();
    renderAll();
  }

  function bindAuth() {
    nodes.loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const valid = nodes.loginUser.value === AUTH_USER && nodes.loginPass.value === AUTH_PASS;
      if (!valid) {
        nodes.loginError.hidden = false;
        nodes.loginPass.value = "";
        nodes.loginPass.focus();
        return;
      }

      nodes.loginError.hidden = true;
      if (nodes.rememberLogin.checked) {
        localStorage.setItem(AUTH_KEY, "1");
      } else {
        sessionStorage.setItem(AUTH_KEY, "1");
      }
      unlockBuilder();
      initBuilder();
    });

    nodes.logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
      window.location.reload();
    });
  }

  function isAuthenticated() {
    return localStorage.getItem(AUTH_KEY) === "1" || sessionStorage.getItem(AUTH_KEY) === "1";
  }

  function lockBuilder() {
    document.body.classList.add("auth-locked");
    nodes.loginGate.hidden = false;
    nodes.loginUser.focus();
  }

  function unlockBuilder() {
    document.body.classList.remove("auth-locked");
    nodes.loginGate.hidden = true;
  }

  function renderFieldTypes() {
    nodes.fieldTypeGrid.replaceChildren();
    fieldTypes.forEach((fieldType) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "field-type-button";
      button.innerHTML = `<span>${fieldType.icon}</span><strong>${fieldType.label}</strong>`;
      button.addEventListener("click", () => addField(fieldType.type, fieldType.label));
      nodes.fieldTypeGrid.appendChild(button);
    });
  }

  function bindSettings() {
    const update = () => {
      config.title = nodes.formTitle.value.trim() || "Untitled Form";
      config.description = nodes.formDescription.value.trim();
      config.submitText = nodes.submitText.value.trim() || "Submit";
      config.theme.accentColor = nodes.accentColor.value;
      config.theme.layout = nodes.layoutMode.value;
      config.theme.colorMode = nodes.colorMode.value;
      config.theme.bodyBackgroundImage = nodes.bodyBackgroundImage.value.trim();
      config.theme.formBackgroundImage = nodes.formBackgroundImage.value.trim();
      config.theme.formBackgroundOpacity = Number(nodes.formBackgroundOpacity.value);
      config.theme.heroMedia = {
        type: nodes.heroMediaType.value,
        url: nodes.heroMediaUrl.value.trim()
      };
      config.submission.type = "googleSheets";
      config.submission.googleEndpoint = nodes.googleEndpoint.value.trim();
      persistAndRender();
    };

    [nodes.formTitle, nodes.formDescription, nodes.submitText, nodes.accentColor, nodes.layoutMode, nodes.colorMode, nodes.bodyBackgroundImage, nodes.formBackgroundImage, nodes.formBackgroundOpacity, nodes.heroMediaType, nodes.heroMediaUrl, nodes.googleEndpoint]
      .forEach((input) => input.addEventListener("input", update));
  }

  function bindActions() {
    nodes.exportConfigBtn.addEventListener("click", exportConfig);
    nodes.pushConfigBtn.addEventListener("click", pushConfigToGitHub);
    nodes.saveGithubTokenBtn.addEventListener("click", saveGithubToken);
    nodes.importConfigBtn.addEventListener("click", () => nodes.configFileInput.click());
    nodes.configFileInput.addEventListener("change", importConfig);
    nodes.previewDraftBtn.addEventListener("click", previewDraft);
    nodes.loadPublishedConfigBtn.addEventListener("click", loadPublishedConfig);
    nodes.clearDraftCacheBtn.addEventListener("click", clearDraftCache);
    nodes.resetConfigBtn.addEventListener("click", () => {
      config = normalizeConfig(clone(defaultConfig));
      selectedId = config.fields[0] ? config.fields[0].id : null;
      syncSettings();
      persistAndRender();
      showToast("Sample config restored.");
    });
  }

  function syncSettings() {
    nodes.formTitle.value = config.title;
    nodes.formDescription.value = config.description;
    nodes.submitText.value = config.submitText;
    nodes.accentColor.value = config.theme.accentColor;
    nodes.layoutMode.value = config.theme.layout;
    nodes.colorMode.value = config.theme.colorMode;
    nodes.bodyBackgroundImage.value = config.theme.bodyBackgroundImage;
    nodes.formBackgroundImage.value = config.theme.formBackgroundImage;
    nodes.formBackgroundOpacity.value = config.theme.formBackgroundOpacity;
    nodes.heroMediaType.value = config.theme.heroMedia.type;
    nodes.heroMediaUrl.value = config.theme.heroMedia.url;
    config.submission.type = "googleSheets";
    nodes.googleEndpoint.value = config.submission.googleEndpoint;
    nodes.googleEndpointRow.hidden = false;
    nodes.builderPreviewTitle.textContent = config.title;
    nodes.githubToken.value = sessionStorage.getItem(GH_TOKEN_KEY) || "";
  }

  function readSettingsIntoConfig() {
    config.title = nodes.formTitle.value.trim() || "Untitled Form";
    config.description = nodes.formDescription.value.trim();
    config.submitText = nodes.submitText.value.trim() || "Submit";
    config.theme.accentColor = nodes.accentColor.value;
    config.theme.layout = nodes.layoutMode.value;
    config.theme.colorMode = nodes.colorMode.value;
    config.theme.bodyBackgroundImage = nodes.bodyBackgroundImage.value.trim();
    config.theme.formBackgroundImage = nodes.formBackgroundImage.value.trim();
    config.theme.formBackgroundOpacity = Number(nodes.formBackgroundOpacity.value);
    config.theme.heroMedia = {
      type: nodes.heroMediaType.value,
      url: nodes.heroMediaUrl.value.trim()
    };
    config.submission.type = "googleSheets";
    config.submission.googleEndpoint = nodes.googleEndpoint.value.trim();
    config = normalizeConfig(config);
  }

  function addField(type, label) {
    const field = {
      id: uniqueId(label, config.fields),
      type,
      label,
      placeholder: type === "select" ? "Choose one" : "",
      helper: "",
      required: false
    };

    if (["select", "radio", "checkbox"].includes(type)) {
      field.options = ["Option 1", "Option 2"];
    }

    if (type === "select") {
      field.display = "dropdown";
    }

    if (type === "section") {
      field.label = "Section Title";
      field.helper = "Optional section description.";
      field.required = false;
    }

    config.fields.push(field);
    selectedId = field.id;
    persistAndRender();
    showToast(`${label} field added.`);
  }

  function selectField(id) {
    selectedId = id;
    renderAll();
  }

  function persistAndRender() {
    config = normalizeConfig(config);
    saveConfig(config);
    renderAll();
  }

  function previewDraft() {
    readSettingsIntoConfig();
    saveConfig(config);
    const stamp = Date.now();
    window.location.href = `form.html?t=${stamp}`;
  }

  function renderAll() {
    syncSettings();
    renderPreview();
    renderFieldList();
    renderEditor();
  }

  function renderPreview() {
    renderForm(nodes.builderPreview, config, {
      selectedId,
      showHiddenFields: true,
      onSelect: selectField
    });
    const form = nodes.builderPreview.querySelector("form");
    if (form) {
      form.addEventListener("submit", (event) => event.preventDefault());
    }
  }

  function renderFieldList() {
    nodes.fieldList.replaceChildren();
    config.fields.forEach((field, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `field-list-item${field.id === selectedId ? " active" : ""}`;
      item.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(field.label)}</strong><em>${field.type}</em>`;
      item.addEventListener("click", () => selectField(field.id));
      nodes.fieldList.appendChild(item);
    });
  }

  function renderEditor() {
    const field = config.fields.find((item) => item.id === selectedId);
    nodes.fieldEditor.className = "field-editor";
    nodes.fieldEditor.replaceChildren();

    if (!field) {
      nodes.inspectorTitle.textContent = "Select a field";
      nodes.fieldEditor.className = "field-editor empty-state";
      nodes.fieldEditor.innerHTML = "<p>Add or select a field to edit its details.</p>";
      return;
    }

    nodes.inspectorTitle.textContent = "Field Settings";
    nodes.fieldEditor.append(
      makeTextInput("Label", field.label, (value) => {
        field.label = value || "Untitled Field";
        persistAndRender();
      }),
      makeTextInput("Field ID", field.id, (value) => {
        const next = value.trim();
        if (!next || config.fields.some((item) => item.id === next && item !== field)) {
          showToast("Field ID must be unique.");
          return;
        }
        field.id = next;
        selectedId = next;
        persistAndRender();
      }),
      makeTextInput("Placeholder", field.placeholder || "", (value) => {
        field.placeholder = value;
        persistAndRender();
      }),
      makeTextarea("Helper Text", field.helper || "", (value) => {
        field.helper = value;
        persistAndRender();
      }),
      makeToggle("Required", field.required, (checked) => {
        field.required = checked;
        persistAndRender();
      })
    );

    if (field.type === "select") {
      nodes.fieldEditor.appendChild(makeSelectInput("Display", field.display || "dropdown", [
        ["dropdown", "Dropdown"],
        ["list", "Option list"],
        ["multiSelect", "Multi-select"]
      ], (value) => {
        field.display = value;
        persistAndRender();
      }));
    }

    if (["select", "radio", "checkbox"].includes(field.type)) {
      nodes.fieldEditor.appendChild(makeTextarea("Options", field.options.join("\n"), (value) => {
        field.options = value.split("\n").map((item) => item.trim()).filter(Boolean);
        if (!field.options.length) field.options = ["Option 1"];
        persistAndRender();
      }));
      nodes.fieldEditor.appendChild(makeOptionRulesEditor(field));
    }

    if (field.type !== "section") {
      nodes.fieldEditor.appendChild(makeVisibilityEditor(field));
    }

    nodes.fieldEditor.appendChild(makeFieldActions(field));
  }

  function makeTextInput(label, value, onChange) {
    const wrap = document.createElement("label");
    wrap.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.addEventListener("change", () => onChange(input.value));
    wrap.appendChild(input);
    return wrap;
  }

  function makeTextarea(label, value, onChange) {
    const wrap = document.createElement("label");
    wrap.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("textarea");
    input.rows = label === "Options" ? 5 : 3;
    input.value = value;
    input.addEventListener("change", () => onChange(input.value));
    wrap.appendChild(input);
    return wrap;
  }

  function makeSelectInput(label, value, options, onChange) {
    const wrap = document.createElement("label");
    wrap.innerHTML = `<span>${label}</span>`;
    const input = document.createElement("select");
    options.forEach(([optionValue, optionLabel]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionLabel;
      input.appendChild(option);
    });
    input.value = value;
    input.addEventListener("change", () => onChange(input.value));
    wrap.appendChild(input);
    return wrap;
  }

  function makeToggle(label, checked, onChange) {
    const wrap = document.createElement("label");
    wrap.className = "toggle-row";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    wrap.append(span, input);
    return wrap;
  }

  function makeVisibilityEditor(field) {
    const wrap = document.createElement("div");
    wrap.className = "condition-editor";
    const title = document.createElement("h3");
    title.textContent = "Visibility";
    wrap.appendChild(title);

    if (!field.visibility && field.visibleIf) {
      field.visibility = {
        defaultState: "hidden",
        action: "show",
        fieldId: field.visibleIf.fieldId,
        operator: field.visibleIf.operator,
        value: field.visibleIf.value
      };
      delete field.visibleIf;
    }

    const state = field.visibility || {
      defaultState: "shown",
      action: "show",
      fieldId: "",
      operator: "equals",
      value: ""
    };

    wrap.appendChild(makeSelectInput("Default", state.defaultState, [
      ["shown", "Shown by default"],
      ["hidden", "Hidden by default"]
    ], (value) => {
      field.visibility = Object.assign({}, state, { defaultState: value });
      persistAndRender();
    }));

    const enabled = makeToggle("Use visibility rule", Boolean(field.visibility && field.visibility.fieldId), (checked) => {
      if (checked) {
        const source = config.fields.find((item) => item.id !== field.id && item.type !== "section");
        field.visibility = Object.assign({}, state, {
          fieldId: source ? source.id : "",
          action: state.action || "show",
          operator: "equals",
          value: ""
        });
      } else {
        field.visibility = {
          defaultState: state.defaultState,
          action: state.action || "show",
          fieldId: "",
          operator: "equals",
          value: ""
        };
      }
      persistAndRender();
    });
    wrap.appendChild(enabled);

    if (!field.visibility || !field.visibility.fieldId) return wrap;

    const sourceOptions = config.fields
      .filter((item) => item.id !== field.id && item.type !== "section")
      .map((item) => [item.id, item.label]);
    if (!sourceOptions.length) {
      const empty = document.createElement("p");
      empty.className = "field-helper";
      empty.textContent = "Add another field first.";
      wrap.appendChild(empty);
      return wrap;
    }

    wrap.appendChild(makeSelectInput("Action", field.visibility.action, [
      ["show", "Show when matched"],
      ["hide", "Hide when matched"]
    ], (value) => {
      field.visibility.action = value;
      persistAndRender();
    }));

    wrap.appendChild(makeSelectInput("Field", field.visibility.fieldId, sourceOptions, (value) => {
      field.visibility.fieldId = value;
      persistAndRender();
    }));
    wrap.appendChild(makeSelectInput("Operator", field.visibility.operator, [
      ["equals", "Equals"],
      ["notEquals", "Does not equal"],
      ["contains", "Contains"],
      ["isEmpty", "Is empty"],
      ["isNotEmpty", "Is not empty"]
    ], (value) => {
      field.visibility.operator = value;
      persistAndRender();
    }));

    if (!["isEmpty", "isNotEmpty"].includes(field.visibility.operator)) {
      wrap.appendChild(makeTextInput("Value", field.visibility.value || "", (value) => {
        field.visibility.value = value;
        persistAndRender();
      }));
    }

    return wrap;
  }

  function makeOptionRulesEditor(field) {
    const wrap = document.createElement("div");
    wrap.className = "condition-editor";
    const title = document.createElement("h3");
    title.textContent = "Dynamic Option Rules";
    const help = document.createElement("p");
    help.className = "field-helper";
    help.textContent = "Applies only to dropdown, radio, and checkbox fields. Use source field IDs. Example: when service = Website:";
    const example = document.createElement("pre");
    example.className = "script-example";
    example.textContent = "when service = Website:\n  Landing Page\n  E-commerce\nwhen service = Automation:\n  Zapier\n  Custom API\ndefault:\n  General Inquiry";
    const editor = makeTextarea("Rules", field.optionRulesText || "", (value) => {
      field.optionRulesText = value;
      persistAndRender();
    });
    wrap.append(title, help, example, editor);
    return wrap;
  }

  function makeFieldActions(field) {
    const actions = document.createElement("div");
    actions.className = "editor-actions";
    const index = config.fields.indexOf(field);
    actions.append(
      actionButton("Up", () => moveField(index, -1), index === 0),
      actionButton("Down", () => moveField(index, 1), index === config.fields.length - 1),
      actionButton("Duplicate", () => duplicateField(field), false),
      actionButton("Delete", () => deleteField(field), false, "danger")
    );
    return actions;
  }

  function actionButton(label, onClick, disabled, tone) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button subtle ${tone || ""}`;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", onClick);
    return button;
  }

  function moveField(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= config.fields.length) return;
    const [field] = config.fields.splice(index, 1);
    config.fields.splice(target, 0, field);
    persistAndRender();
  }

  function duplicateField(field) {
    const copy = clone(field);
    copy.label = `${field.label} Copy`;
    copy.id = uniqueId(copy.label, config.fields);
    config.fields.splice(config.fields.indexOf(field) + 1, 0, copy);
    selectedId = copy.id;
    persistAndRender();
  }

  function deleteField(field) {
    config.fields = config.fields.filter((item) => item !== field);
    selectedId = config.fields[0] ? config.fields[0].id : null;
    persistAndRender();
  }

  function exportConfig() {
    readSettingsIntoConfig();
    if (!config.submission.googleEndpoint) {
      showToast("Paste an Apps Script URL before exporting.");
      return;
    }

    const blob = new Blob([JSON.stringify(normalizeConfig(config), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "form-config.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Config exported.");
  }

  function saveGithubToken() {
    const token = nodes.githubToken.value.trim();
    if (!token) {
      sessionStorage.removeItem(GH_TOKEN_KEY);
      showToast("GitHub token cleared for this session.");
      return;
    }

    sessionStorage.setItem(GH_TOKEN_KEY, token);
    nodes.githubToken.value = token;
    showToast("GitHub token saved for this session.");
  }

  async function pushConfigToGitHub() {
    readSettingsIntoConfig();
    if (!config.submission.googleEndpoint) {
      showToast("Paste an Apps Script URL before pushing.");
      return;
    }

    const token = nodes.githubToken.value.trim() || sessionStorage.getItem(GH_TOKEN_KEY);
    if (!token) {
      showToast("Paste a GitHub token first.");
      nodes.githubToken.focus();
      return;
    }

    sessionStorage.setItem(GH_TOKEN_KEY, token);
    nodes.pushConfigBtn.disabled = true;
    nodes.pushConfigBtn.textContent = "Pushing...";

    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONFIG_PATH}`;
      const current = await githubRequest(`${apiUrl}?ref=${GITHUB_BRANCH}`, token);
      const content = JSON.stringify(normalizeConfig(config), null, 2) + "\n";
      await githubRequest(apiUrl, token, {
        method: "PUT",
        body: JSON.stringify({
          message: "Update form config from builder",
          content: toBase64(content),
          sha: current.sha,
          branch: GITHUB_BRANCH
        })
      });
      saveConfig(config);
      showToast("form-config.json pushed to GitHub.");
    } catch (error) {
      showToast(error.message || "GitHub push failed.");
    } finally {
      nodes.pushConfigBtn.disabled = false;
      nodes.pushConfigBtn.textContent = "Push Config";
    }
  }

  async function githubRequest(url, token, options) {
    const response = await fetch(url, {
      method: options && options.method ? options.method : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options && options.body ? options.body : undefined
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `GitHub request failed (${response.status})`);
    }
    return data;
  }

  function toBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  async function loadPublishedConfig() {
    try {
      config = normalizeConfig(await loadStaticConfig());
      selectedId = config.fields[0] ? config.fields[0].id : null;
      saveConfig(config);
      renderAll();
      showToast("Published config loaded into builder.");
    } catch (error) {
      showToast("Could not load published form-config.json.");
    }
  }

  function clearDraftCache() {
    localStorage.removeItem(window.FormStudio.STORAGE_KEY);
    config = normalizeConfig(clone(defaultConfig));
    selectedId = config.fields[0] ? config.fields[0].id : null;
    saveConfig(config);
    renderAll();
    showToast("Draft cache cleared.");
  }

  function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        config = normalizeConfig(JSON.parse(reader.result));
        selectedId = config.fields[0] ? config.fields[0].id : null;
        saveConfig(config);
        renderAll();
        showToast("Config imported.");
      } catch (error) {
        showToast("That JSON file could not be imported.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(message) {
    nodes.toast.textContent = message;
    nodes.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => nodes.toast.classList.remove("show"), 2200);
  }

  init();
})();
