(function () {
  const STORAGE_KEY = "dynamicFormStudio.config";
  const SUBMISSIONS_KEY = "dynamicFormStudio.localSubmissions";

  const fieldTypes = [
    { type: "text", label: "Text", icon: "T" },
    { type: "email", label: "Email", icon: "@" },
    { type: "tel", label: "Phone", icon: "#" },
    { type: "number", label: "Number", icon: "1" },
    { type: "date", label: "Date", icon: "D" },
    { type: "textarea", label: "Long Text", icon: "P" },
    { type: "select", label: "Dropdown", icon: "V" },
    { type: "radio", label: "Radio", icon: "O" },
    { type: "checkbox", label: "Checkboxes", icon: "C" }
  ];

  const defaultConfig = {
    title: "Project Inquiry",
    description: "Tell us what you need and we will follow up with the next best step.",
    submitText: "Send Inquiry",
    theme: {
      accentColor: "#2563eb",
      layout: "single"
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

    if (["select", "radio", "checkbox"].includes(type)) {
      normalized.options = Array.isArray(field.options) && field.options.length
        ? field.options.map(String)
        : ["Option 1", "Option 2"];
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
        layout: input.theme && input.theme.layout === "steps" ? "steps" : "single"
      },
      fields: normalizedFields
    };
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
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = field.placeholder || "Choose one";
      select.appendChild(empty);
      field.options.forEach((option) => {
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

    field.options.forEach((option, index) => {
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

  function renderField(field, values, options) {
    const fieldWrap = el("div", "form-field");
    fieldWrap.dataset.fieldId = field.id;
    if (options && options.selectedId === field.id) fieldWrap.classList.add("is-selected");

    const label = el("label", "field-label");
    label.textContent = field.label;
    if (field.required) label.appendChild(el("span", "required-mark", " *"));
    fieldWrap.appendChild(label);

    let control;
    if (field.type === "radio" || field.type === "checkbox") {
      control = renderChoiceGroup(field, values);
    } else {
      control = makeInput(field);
      control.name = field.id;
      control.id = field.id;
      control.required = field.required;
      if (values[field.id]) control.value = values[field.id];
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
      if (field.type === "checkbox") {
        values[field.id] = Array.from(form.querySelectorAll(`input[name="${CSS.escape(field.id)}"]:checked`))
          .map((input) => input.value);
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
    const form = el("form", "dynamic-form");
    const header = el("div", "form-header");
    const title = el("h1", "", normalized.title);
    header.appendChild(title);
    if (normalized.description) header.appendChild(el("p", "", normalized.description));
    form.appendChild(header);

    if (normalized.theme.layout === "steps" && normalized.fields.length > 1) {
      renderSteppedFields(form, normalized, values, options);
    } else {
      const fieldsWrap = el("div", "fields-wrap");
      normalized.fields.forEach((field) => fieldsWrap.appendChild(renderField(field, values, options)));
      form.appendChild(fieldsWrap);
      form.appendChild(renderSubmit(normalized.submitText));
    }

    container.replaceChildren(form);
    setAccent(container, normalized);
    return form;
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
    progress.appendChild(el("span", "", `Step ${step + 1} of ${config.fields.length}`));
    const bar = el("div", "progress-track");
    const fill = el("i", "");
    fill.style.width = `${((step + 1) / config.fields.length) * 100}%`;
    bar.appendChild(fill);
    progress.appendChild(bar);
    form.appendChild(progress);

    const fieldsWrap = el("div", "fields-wrap step-wrap");
    fieldsWrap.appendChild(renderField(config.fields[step], values, options));
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
    next.type = step === config.fields.length - 1 ? "submit" : "button";
    next.textContent = step === config.fields.length - 1 ? config.submitText : "Next";
    if (next.type === "button") {
      next.addEventListener("click", () => options && options.onStepChange && options.onStepChange(step + 1));
    }

    actions.append(previous, next);
    form.appendChild(actions);
  }

  function saveSubmission(values) {
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || "[]");
    submissions.push({ submittedAt: new Date().toISOString(), values });
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
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
    saveSubmission
  };
})();
