(function () {
  const STORAGE_KEY = "dynamicFormStudio.config";
  const fieldTypes = [
    { type: "text", label: "Text", icon: "T" },
    { type: "email", label: "Email", icon: "@" },
    { type: "tel", label: "Phone", icon: "#" },
    { type: "number", label: "Number", icon: "1" },
    { type: "date", label: "Date", icon: "D" },
    { type: "textarea", label: "Long Text", icon: "P" },
    { type: "select", label: "Dropdown", icon: "V" },
    { type: "radio", label: "Radio", icon: "O" },
    { type: "checkbox", label: "Checkboxes", icon: "C" },
    { type: "section", label: "Section", icon: "S" }
  ];

  const defaultConfig = {
    title: "Project Inquiry",
    description: "Tell us what you need and we will follow up with the next best step.",
    submitText: "Send Inquiry",
    theme: {
      accentColor: "#2563eb",
      layout: "single",
      colorMode: "light",
      bodyBackgroundImage: "",
      formBackgroundImage: "",
      formBackgroundOpacity: 0.18,
      heroMedia: {
        type: "none",
        url: ""
      }
    },
    submission: {
      type: "googleSheets",
      googleEndpoint: ""
    },
    fields: [
      {
        id: "full_name",
        type: "text",
        label: "Full Name",
        placeholder: "Jane Smith",
        helper: "",
        required: true
      },
      {
        id: "email",
        type: "email",
        label: "Email",
        placeholder: "jane@example.com",
        helper: "",
        required: true
      },
      {
        id: "service",
        type: "select",
        label: "Service Needed",
        placeholder: "Choose one",
        helper: "",
        required: true,
        options: ["Website", "Automation", "Branding"]
      },
      {
        id: "details",
        type: "textarea",
        label: "Project Details",
        placeholder: "Share goals, timeline, and anything else we should know.",
        helper: "",
        required: false
      }
    ]
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slugify(value) {
    return String(value || "field")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";
  }

  function uniqueId(label, fields) {
    const base = slugify(label);
    const used = new Set((fields || []).map((field) => field.id));
    let next = base;
    let index = 2;
    while (used.has(next)) {
      next = `${base}_${index}`;
      index += 1;
    }
    return next;
  }

  function normalizeField(field, fields) {
    const type = fieldTypes.some((item) => item.type === field.type) ? field.type : "text";
    const normalized = {
      id: field.id || uniqueId(field.label || type, fields),
      type,
      label: field.label || "Untitled Field",
      placeholder: field.placeholder || "",
      helper: field.helper || "",
      required: Boolean(field.required)
    };

    if (type === "section") {
      normalized.required = false;
      normalized.placeholder = "";
    }

    if (["select", "radio", "checkbox"].includes(type)) {
      normalized.options = Array.isArray(field.options) && field.options.length
        ? field.options.map(String)
        : ["Option 1", "Option 2"];
    }

    if (["select", "radio", "checkbox"].includes(type)) {
      normalized.optionRulesText = field.optionRulesText || "";
      normalized.optionRules = parseOptionRules(normalized.optionRulesText);
    }

    if (type === "select") {
      normalized.display = ["dropdown", "list", "multiSelect"].includes(field.display) ? field.display : "dropdown";
    }

    if (field.visibleIf && typeof field.visibleIf === "object") {
      normalized.visibleIf = {
        fieldId: field.visibleIf.fieldId || "",
        operator: ["equals", "notEquals", "contains", "isEmpty", "isNotEmpty"].includes(field.visibleIf.operator)
          ? field.visibleIf.operator
          : "equals",
        value: field.visibleIf.value || ""
      };
    }

    if (field.visibility && typeof field.visibility === "object") {
      normalized.visibility = {
        defaultState: field.visibility.defaultState === "hidden" ? "hidden" : "shown",
        action: field.visibility.action === "hide" ? "hide" : "show",
        fieldId: field.visibility.fieldId || "",
        operator: ["equals", "notEquals", "contains", "isEmpty", "isNotEmpty"].includes(field.visibility.operator)
          ? field.visibility.operator
          : "equals",
        value: field.visibility.value || ""
      };
    } else if (normalized.visibleIf) {
      normalized.visibility = {
        defaultState: "hidden",
        action: "show",
        fieldId: normalized.visibleIf.fieldId,
        operator: normalized.visibleIf.operator,
        value: normalized.visibleIf.value
      };
    }

    return normalized;
  }

  function normalizeConfig(config) {
    const input = config && typeof config === "object" ? config : defaultConfig;
    const fields = Array.isArray(input.fields) ? input.fields : [];
    const normalizedFields = fields.map((field) => normalizeField(field, fields));

    return {
      title: input.title || "Untitled Form",
      description: input.description || "",
      submitText: input.submitText || "Submit",
      theme: {
        accentColor: input.theme && input.theme.accentColor ? input.theme.accentColor : "#2563eb",
        layout: input.theme && input.theme.layout === "steps" ? "steps" : "single",
        colorMode: input.theme && input.theme.colorMode === "dark" ? "dark" : "light",
        bodyBackgroundImage: input.theme && input.theme.bodyBackgroundImage ? String(input.theme.bodyBackgroundImage).trim() : "",
        formBackgroundImage: input.theme && input.theme.formBackgroundImage ? String(input.theme.formBackgroundImage).trim() : "",
        formBackgroundOpacity: input.theme && input.theme.formBackgroundOpacity !== undefined
          ? Math.max(0, Math.min(1, Number(input.theme.formBackgroundOpacity) || 0))
          : 0.18,
        heroMedia: {
          type: input.theme && input.theme.heroMedia && ["none", "image", "video"].includes(input.theme.heroMedia.type)
            ? input.theme.heroMedia.type
            : "none",
          url: input.theme && input.theme.heroMedia && input.theme.heroMedia.url ? String(input.theme.heroMedia.url).trim() : ""
        }
      },
      submission: {
        type: "googleSheets",
        googleEndpoint: input.submission && input.submission.googleEndpoint ? String(input.submission.googleEndpoint).trim() : ""
      },
      fields: normalizedFields
    };
  }

  function parseOptionRules(text) {
    const rules = [];
    let current = null;
    String(text || "").split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;

      const whenMatch = line.match(/^when\s+([A-Za-z0-9_-]+)\s*(=|!=|contains)\s*(.+):$/i);
      if (whenMatch) {
        current = {
          sourceFieldId: whenMatch[1],
          operator: whenMatch[2] === "!=" ? "notEquals" : whenMatch[2] === "contains" ? "contains" : "equals",
          value: whenMatch[3].trim(),
          options: []
        };
        rules.push(current);
        return;
      }

      if (/^default\s*:$/i.test(line)) {
        current = {
          sourceFieldId: "",
          operator: "default",
          value: "",
          options: []
        };
        rules.push(current);
        return;
      }

      if (current) {
        current.options.push(line.replace(/^-\s*/, ""));
      }
    });
    return rules.filter((rule) => rule.options.length);
  }

  function saveConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeConfig(config)));
  }

  function loadSavedConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? normalizeConfig(JSON.parse(stored)) : null;
    } catch (error) {
      return null;
    }
  }

  async function loadStaticConfig() {
    const response = await fetch("form-config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load form-config.json");
    }
    return normalizeConfig(await response.json());
  }

  function setAccent(container, config) {
    const accent = config.theme && config.theme.accentColor ? config.theme.accentColor : "#2563eb";
    container.style.setProperty("--accent", accent);
    container.style.setProperty("--form-bg-opacity", config.theme.formBackgroundOpacity);
    container.style.setProperty("--form-bg-image", config.theme.formBackgroundImage ? `url("${config.theme.formBackgroundImage}")` : "none");
    document.body.style.setProperty("--body-bg-image", config.theme.bodyBackgroundImage ? `url("${config.theme.bodyBackgroundImage}")` : "none");
  }

  function evaluateCondition(condition, values) {
    if (!condition || !condition.fieldId || !condition.operator) return true;
    const value = values[condition.fieldId];
    const isArray = Array.isArray(value);
    const empty = isArray ? value.length === 0 : !value;

    if (condition.operator === "isEmpty") return empty;
    if (condition.operator === "isNotEmpty") return !empty;
    if (condition.operator === "contains") {
      return isArray ? value.includes(condition.value) : String(value || "").includes(condition.value);
    }
    if (condition.operator === "notEquals") {
      return isArray ? !value.includes(condition.value) : String(value || "") !== condition.value;
    }
    return isArray ? value.includes(condition.value) : String(value || "") === condition.value;
  }

  function isFieldVisible(field, values) {
    if (field.visibility) {
      const defaultVisible = field.visibility.defaultState !== "hidden";
      if (!field.visibility.fieldId) return defaultVisible;
      const matched = evaluateCondition({
        fieldId: field.visibility.fieldId,
        operator: field.visibility.operator,
        value: field.visibility.value
      }, values || {});
      if (!matched) return defaultVisible;
      return field.visibility.action === "show";
    }

    return evaluateCondition(field.visibleIf, values || {});
  }

  function getEffectiveOptions(field, values) {
    if (!field.optionRules || !field.optionRules.length) return field.options || [];
    const matched = field.optionRules.find((rule) => {
      if (rule.operator === "default") return false;
      return evaluateCondition({
        fieldId: rule.sourceFieldId,
        operator: rule.operator,
        value: rule.value
      }, values || {});
    });
    if (matched) return matched.options;
    const fallback = field.optionRules.find((rule) => rule.operator === "default");
    return fallback ? fallback.options : field.options || [];
  }

  function getDynamicDependencyIds(config) {
    const normalized = normalizeConfig(config);
    const ids = new Set();
    normalized.fields.forEach((field) => {
      if (field.visibleIf && field.visibleIf.fieldId) ids.add(field.visibleIf.fieldId);
      if (field.visibility && field.visibility.fieldId) ids.add(field.visibility.fieldId);
      (field.optionRules || []).forEach((rule) => {
        if (rule.sourceFieldId) ids.add(rule.sourceFieldId);
      });
    });
    return ids;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeInput(field) {
    if (field.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.rows = 5;
      textarea.placeholder = field.placeholder || "";
      return textarea;
    }

    if (field.type === "select") {
      const select = document.createElement("select");
      const effectiveOptions = getEffectiveOptions(field, {});
      if (field.display === "multiSelect") {
        select.multiple = true;
        select.size = Math.min(Math.max(effectiveOptions.length, 3), 6);
      }
      const empty = document.createElement("option");
      if (field.display !== "multiSelect") {
        empty.value = "";
        empty.textContent = field.placeholder || "Choose one";
        select.appendChild(empty);
      }
      effectiveOptions.forEach((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        select.appendChild(item);
      });
      return select;
    }

    const input = document.createElement("input");
    input.type = field.type;
    input.placeholder = field.placeholder || "";
    return input;
  }

  function renderChoiceGroup(field, values) {
    const group = el("div", "choice-group");
    group.setAttribute("role", field.type === "radio" ? "radiogroup" : "group");

    getEffectiveOptions(field, values).forEach((option, index) => {
      const id = `${field.id}_${index}`;
      const label = el("label", "choice-pill");
      const input = document.createElement("input");
      input.type = field.type;
      input.name = field.id;
      input.value = option;
      input.id = id;
      if (field.required && field.type === "radio") input.required = true;
      if (field.type === "checkbox" && Array.isArray(values[field.id])) {
        input.checked = values[field.id].includes(option);
      } else if (values[field.id] === option) {
        input.checked = true;
      }
      label.append(input, el("span", "", option));
      group.appendChild(label);
    });

    return group;
  }

  function renderOptionList(field, values) {
    const group = el("div", "choice-group option-list");
    const mode = field.display === "multiSelect" ? "checkbox" : "radio";
    group.setAttribute("role", mode === "radio" ? "radiogroup" : "group");

    getEffectiveOptions(field, values).forEach((option, index) => {
      const label = el("label", "choice-pill option-card");
      const input = document.createElement("input");
      input.type = mode;
      input.name = field.id;
      input.value = option;
      input.id = `${field.id}_${index}`;
      if (field.required && mode === "radio") input.required = true;
      if (mode === "checkbox" && Array.isArray(values[field.id])) {
        input.checked = values[field.id].includes(option);
      } else if (values[field.id] === option) {
        input.checked = true;
      }
      label.append(input, el("span", "", option));
      group.appendChild(label);
    });

    return group;
  }

  function renderField(field, values, options) {
    const hiddenForPreview = options && options.showHiddenFields && !isFieldVisible(field, values);
    if (field.type === "section") {
      const section = el("div", "form-section");
      section.dataset.fieldId = field.id;
      if (options && options.selectedId === field.id) section.classList.add("is-selected");
      if (hiddenForPreview) section.classList.add("is-preview-hidden");
      section.appendChild(el("h2", "", field.label));
      if (field.helper) section.appendChild(el("p", "", field.helper));
      if (options && typeof options.onSelect === "function") {
        section.addEventListener("click", () => options.onSelect(field.id));
      }
      return section;
    }

    const fieldWrap = el("div", "form-field");
    fieldWrap.dataset.fieldId = field.id;
    if (options && options.selectedId === field.id) fieldWrap.classList.add("is-selected");
    if (hiddenForPreview) fieldWrap.classList.add("is-preview-hidden");

    const label = el("label", "field-label");
    label.textContent = field.label;
    if (field.required) label.appendChild(el("span", "required-mark", " *"));
    fieldWrap.appendChild(label);

    let control;
    if (field.type === "select" && ["list", "multiSelect"].includes(field.display)) {
      control = renderOptionList(field, values);
    } else if (field.type === "radio" || field.type === "checkbox") {
      control = renderChoiceGroup(field, values);
    } else {
      const fieldForInput = field.type === "select"
        ? Object.assign({}, field, { options: getEffectiveOptions(field, values), optionRules: [] })
        : field;
      control = makeInput(fieldForInput);
      control.name = field.id;
      control.id = field.id;
      control.required = field.required;
      if (field.type === "select" && field.display === "multiSelect" && Array.isArray(values[field.id])) {
        Array.from(control.options).forEach((option) => {
          option.selected = values[field.id].includes(option.value);
        });
      } else if (values[field.id]) {
        control.value = values[field.id];
      }
    }

    fieldWrap.appendChild(control);

    if (field.helper) {
      fieldWrap.appendChild(el("p", "field-helper", field.helper));
    }

    const error = el("p", "field-error");
    error.hidden = true;
    fieldWrap.appendChild(error);

    if (options && typeof options.onSelect === "function") {
      fieldWrap.addEventListener("click", () => options.onSelect(field.id));
    }

    return fieldWrap;
  }

  function collectValues(form, config) {
    const values = {};
    config.fields.forEach((field) => {
      if (field.type === "section" || !isFieldVisible(field, values)) return;
      if (field.type === "checkbox") {
        values[field.id] = Array.from(form.querySelectorAll(`input[name="${CSS.escape(field.id)}"]:checked`))
          .map((input) => input.value);
      } else if (field.type === "select" && field.display === "multiSelect") {
        const select = form.querySelector(`[name="${CSS.escape(field.id)}"]`);
        if (select) {
          values[field.id] = Array.from(select.selectedOptions).map((option) => option.value);
        } else {
          values[field.id] = Array.from(form.querySelectorAll(`input[name="${CSS.escape(field.id)}"]:checked`))
            .map((input) => input.value);
        }
      } else if (field.type === "select" && field.display === "list") {
        const checked = form.querySelector(`input[name="${CSS.escape(field.id)}"]:checked`);
        values[field.id] = checked ? checked.value : "";
      } else if (field.type === "radio") {
        const checked = form.querySelector(`input[name="${CSS.escape(field.id)}"]:checked`);
        values[field.id] = checked ? checked.value : "";
      } else {
        const input = form.querySelector(`[name="${CSS.escape(field.id)}"]`);
        values[field.id] = input ? input.value.trim() : "";
      }
    });
    return values;
  }

  function validateValues(config, values, root) {
    let valid = true;
    root.querySelectorAll(".field-error").forEach((error) => {
      error.hidden = true;
      error.textContent = "";
    });
    root.querySelectorAll(".form-field").forEach((field) => field.classList.remove("has-error"));

    config.fields.forEach((field) => {
      if (field.type === "section" || !isFieldVisible(field, values)) return;
      const value = values[field.id];
      const empty = Array.isArray(value) ? value.length === 0 : !value;
      if (field.required && empty) {
        const wrap = root.querySelector(`[data-field-id="${CSS.escape(field.id)}"]`);
        const error = wrap && wrap.querySelector(".field-error");
        if (wrap && error) {
          wrap.classList.add("has-error");
          error.hidden = false;
          error.textContent = "This field is required.";
        }
        valid = false;
      }
    });

    return valid;
  }

  function renderForm(container, config, options) {
    const normalized = normalizeConfig(config);
    const values = options && options.values ? options.values : {};
    const form = el("form", `dynamic-form theme-${normalized.theme.colorMode}`);
    const header = el("div", "form-header");
    if (normalized.theme.heroMedia.url && normalized.theme.heroMedia.type !== "none") {
      header.appendChild(renderHeroMedia(normalized.theme.heroMedia));
    }
    const title = el("h1", "", normalized.title);
    header.appendChild(title);
    if (normalized.description) header.appendChild(el("p", "", normalized.description));
    form.appendChild(header);

    if (normalized.theme.layout === "steps" && normalized.fields.length > 1) {
      renderSteppedFields(form, normalized, values, options);
    } else {
      const fieldsWrap = el("div", "fields-wrap");
      normalized.fields
        .filter((field) => (options && options.showHiddenFields) || isFieldVisible(field, values))
        .forEach((field) => fieldsWrap.appendChild(renderField(field, values, options)));
      form.appendChild(fieldsWrap);
      form.appendChild(renderSubmit(normalized.submitText));
    }

    container.replaceChildren(form);
    setAccent(container, normalized);
    return form;
  }

  function renderHeroMedia(media) {
    const wrap = el("div", "form-hero-media");
    if (media.type === "video") {
      const video = document.createElement("video");
      video.src = media.url;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      wrap.appendChild(video);
      return wrap;
    }

    const image = document.createElement("img");
    image.src = media.url;
    image.alt = "";
    wrap.appendChild(image);
    return wrap;
  }

  function renderSubmit(text) {
    const actions = el("div", "form-actions");
    const button = document.createElement("button");
    button.className = "button primary submit-button";
    button.type = "submit";
    button.textContent = text || "Submit";
    actions.appendChild(button);
    return actions;
  }

  function renderSteppedFields(form, config, values, options) {
    let step = options && Number.isInteger(options.step) ? options.step : 0;
    step = Math.max(0, Math.min(step, config.fields.length - 1));
    const progress = el("div", "step-progress");
    const visibleFields = config.fields.filter((field) => isFieldVisible(field, values));
    progress.appendChild(el("span", "", `Step ${Math.min(step + 1, visibleFields.length)} of ${visibleFields.length}`));
    const bar = el("div", "progress-track");
    const fill = el("i", "");
    fill.style.width = `${visibleFields.length ? ((step + 1) / visibleFields.length) * 100 : 100}%`;
    bar.appendChild(fill);
    progress.appendChild(bar);
    form.appendChild(progress);

    const fieldsWrap = el("div", "fields-wrap step-wrap");
    const currentField = visibleFields[Math.min(step, visibleFields.length - 1)];
    if (currentField) fieldsWrap.appendChild(renderField(currentField, values, options));
    form.appendChild(fieldsWrap);

    const actions = el("div", "form-actions split-actions");
    const previous = document.createElement("button");
    previous.className = "button subtle";
    previous.type = "button";
    previous.textContent = "Back";
    previous.disabled = step === 0;
    previous.addEventListener("click", () => options && options.onStepChange && options.onStepChange(step - 1));

    const next = document.createElement("button");
    next.className = "button primary";
    next.type = step === visibleFields.length - 1 ? "submit" : "button";
    next.textContent = step === visibleFields.length - 1 ? config.submitText : "Next";
    if (next.type === "button") {
      next.addEventListener("click", () => options && options.onStepChange && options.onStepChange(step + 1));
    }

    actions.append(previous, next);
    form.appendChild(actions);
  }

  async function submitToGoogleSheets(config, values) {
    const normalized = normalizeConfig(config);
    const endpoint = normalized.submission.googleEndpoint;
    if (!endpoint) {
      throw new Error("Google Sheets endpoint is missing.");
    }

    const payload = {
      submittedAt: new Date().toISOString(),
      formTitle: normalized.title,
      fields: normalized.fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type
      })).filter((field) => field.type !== "section" && Object.prototype.hasOwnProperty.call(values, field.id)),
      values
    };

    const response = await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    return response;
  }

  window.FormStudio = {
    STORAGE_KEY,
    fieldTypes,
    defaultConfig,
    clone,
    uniqueId,
    normalizeConfig,
    saveConfig,
    loadSavedConfig,
    loadStaticConfig,
    renderForm,
    collectValues,
    validateValues,
    isFieldVisible,
    getDynamicDependencyIds,
    submitToGoogleSheets
  };
})();
