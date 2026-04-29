(function () {
  const {
    fieldTypes,
    defaultConfig,
    clone,
    uniqueId,
    normalizeConfig,
    saveConfig,
    loadSavedConfig,
    loadStaticConfig,
    renderForm,
    loadSubmissions,
    submissionsToCsv
  } = window.FormStudio;

  let config = normalizeConfig(loadSavedConfig() || defaultConfig);
  let selectedId = config.fields[0] ? config.fields[0].id : null;

  const nodes = {
    fieldTypeGrid: document.getElementById("fieldTypeGrid"),
    formTitle: document.getElementById("formTitle"),
    formDescription: document.getElementById("formDescription"),
    submitText: document.getElementById("submitText"),
    accentColor: document.getElementById("accentColor"),
    layoutMode: document.getElementById("layoutMode"),
    submissionType: document.getElementById("submissionType"),
    googleEndpoint: document.getElementById("googleEndpoint"),
    googleEndpointRow: document.getElementById("googleEndpointRow"),
    previewDraftBtn: document.getElementById("previewDraftBtn"),
    loadPublishedConfigBtn: document.getElementById("loadPublishedConfigBtn"),
    clearDraftCacheBtn: document.getElementById("clearDraftCacheBtn"),
    exportSubmissionsBtn: document.getElementById("exportSubmissionsBtn"),
    builderPreviewTitle: document.getElementById("builderPreviewTitle"),
    builderPreview: document.getElementById("builderPreview"),
    fieldList: document.getElementById("fieldList"),
    fieldEditor: document.getElementById("fieldEditor"),
    inspectorTitle: document.getElementById("inspectorTitle"),
    exportConfigBtn: document.getElementById("exportConfigBtn"),
    importConfigBtn: document.getElementById("importConfigBtn"),
    configFileInput: document.getElementById("configFileInput"),
    resetConfigBtn: document.getElementById("resetConfigBtn"),
    toast: document.getElementById("toast")
  };

  function init() {
    renderFieldTypes();
    bindSettings();
    bindActions();
    syncSettings();
    renderAll();
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
      config.submission.type = nodes.submissionType.value;
      config.submission.googleEndpoint = nodes.googleEndpoint.value.trim();
      persistAndRender();
    };

    [nodes.formTitle, nodes.formDescription, nodes.submitText, nodes.accentColor, nodes.layoutMode, nodes.submissionType, nodes.googleEndpoint]
      .forEach((input) => input.addEventListener("input", update));

    nodes.submissionType.addEventListener("change", update);
  }

  function bindActions() {
    nodes.exportConfigBtn.addEventListener("click", exportConfig);
    nodes.importConfigBtn.addEventListener("click", () => nodes.configFileInput.click());
    nodes.configFileInput.addEventListener("change", importConfig);
    nodes.previewDraftBtn.addEventListener("click", previewDraft);
    nodes.loadPublishedConfigBtn.addEventListener("click", loadPublishedConfig);
    nodes.clearDraftCacheBtn.addEventListener("click", clearDraftCache);
    nodes.exportSubmissionsBtn.addEventListener("click", exportLocalSubmissions);
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
    nodes.submissionType.value = config.submission.type;
    nodes.googleEndpoint.value = config.submission.googleEndpoint;
    nodes.googleEndpointRow.hidden = config.submission.type !== "googleSheets";
    nodes.builderPreviewTitle.textContent = config.title;
  }

  function readSettingsIntoConfig() {
    config.title = nodes.formTitle.value.trim() || "Untitled Form";
    config.description = nodes.formDescription.value.trim();
    config.submitText = nodes.submitText.value.trim() || "Submit";
    config.theme.accentColor = nodes.accentColor.value;
    config.theme.layout = nodes.layoutMode.value;
    config.submission.type = nodes.submissionType.value;
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
    window.location.href = `form.html?source=local&t=${stamp}`;
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

    if (["select", "radio", "checkbox"].includes(field.type)) {
      nodes.fieldEditor.appendChild(makeTextarea("Options", field.options.join("\n"), (value) => {
        field.options = value.split("\n").map((item) => item.trim()).filter(Boolean);
        if (!field.options.length) field.options = ["Option 1"];
        persistAndRender();
      }));
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
    const blob = new Blob([JSON.stringify(normalizeConfig(config), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "form-config.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Config exported.");
  }

  function exportLocalSubmissions() {
    const submissions = loadSubmissions();
    if (!submissions.length) {
      showToast("No local submissions to export yet.");
      return;
    }

    const blob = new Blob([submissionsToCsv(config, submissions)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "submissions.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Local submissions exported.");
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
