// The steps array is the browser's current working copy of the workflow.
let steps = [];
let editingStepId = null;
const WORKFLOW_STORAGE_KEY = "workflow-json-builder.workflow";

const addStepButton = document.querySelector("#add-step-button");
const clearWorkflowButton = document.querySelector("#clear-workflow-button");
const loadExampleButton = document.querySelector("#load-example-button");
const stepDialog = document.querySelector("#step-dialog");
const stepForm = document.querySelector("#step-form");
const stepTypeSelect = document.querySelector("#step-type");
const stepNameInput = document.querySelector("#step-name");
const propertyFields = document.querySelector("#property-fields");
const stepList = document.querySelector("#step-list");
const emptyState = document.querySelector("#empty-state");
const workflowNameInput = document.querySelector("#workflow-name");
const workflowDescriptionInput = document.querySelector("#workflow-description");
const validationPanel = document.querySelector("#validation-panel");
const validationIcon = document.querySelector("#validation-icon");
const validationSummary = document.querySelector("#validation-summary");
const validationErrors = document.querySelector("#validation-errors");
const importButton = document.querySelector("#import-json-button");
const importFileInput = document.querySelector("#import-json-file");
const exportButton = document.querySelector("#export-json-button");
const appFeedback = document.querySelector("#app-feedback");

const triggerEvents = [
  ["manual", "Manual start"],
  ["schedule", "On a schedule (one time)"],
  ["webhook", "When a webhook is received"],
  ["alert-created", "Alert Created"],
  ["email-received", "Email Received"],
  ["device-registered", "Device Registered"],
  ["ticket-created", "Ticket Created"],
  ["user-created", "User Created"],
];

const triggerPropertiesByEvent = {
  "alert-created": [
    {
      name: "source",
      label: "Monitoring source",
      type: "text",
      placeholder: "e.g. Infrastructure monitoring",
    },
    {
      name: "alertType",
      label: "Alert type",
      type: "text",
      placeholder: "e.g. MachineOffline30",
    },
  ],
  "email-received": [
    {
      name: "mailbox",
      label: "Mailbox",
      type: "text",
      placeholder: "e.g. it-alerts@example.com",
    },
    {
      name: "sender",
      label: "Sender filter",
      type: "text",
      placeholder: "e.g. monitoring@example.com",
    },
    {
      name: "subjectContains",
      label: "Subject contains",
      type: "text",
      placeholder: "e.g. Service degraded",
    },
  ],
  "device-registered": [
    {
      name: "source",
      label: "Device management source",
      type: "text",
      placeholder: "e.g. Endpoint management",
    },
    {
      name: "deviceType",
      label: "Device type",
      type: "text",
      placeholder: "e.g. Laptop",
    },
  ],
  "ticket-created": [
    {
      name: "source",
      label: "Ticketing system",
      type: "text",
      placeholder: "e.g. PSA service desk",
    },
    {
      name: "ticketType",
      label: "Ticket type",
      type: "text",
      placeholder: "e.g. Incident",
    },
  ],
  "user-created": [
    {
      name: "source",
      label: "Identity system",
      type: "text",
      placeholder: "e.g. Microsoft Entra ID",
    },
  ],
  schedule: [
    {
      name: "scheduledAt",
      label: "Run once at",
      type: "datetime-local",
      helpText: "Choose a future date and time in your device's local time zone.",
    },
  ],
};

// Each type asks for a small set of properties that make sense for it.
const propertiesByType = {
  trigger: [
    {
      name: "event",
      label: "When should it start?",
      type: "select",
      emptyOption: "Choose a trigger",
      options: triggerEvents,
    },
  ],
  condition: [
    {
      name: "field",
      label: "Field to check",
      type: "text",
      placeholder: "e.g. ticket.priority",
    },
    {
      name: "operator",
      label: "Operator",
      type: "select",
      emptyOption: "Choose an operator",
      options: [
        ["equals", "Equals"],
        ["not-equals", "Does not equal"],
        ["contains", "Contains"],
        ["greater-than", "Greater than"],
      ],
    },
    {
      name: "value",
      label: "Expected value",
      type: "text",
      placeholder: "e.g. high",
    },
  ],
  action: [
    {
      name: "action",
      label: "Action to perform",
      type: "select",
      emptyOption: "Choose an action",
      options: [
        ["send-notification", "Send a notification"],
        ["create-ticket", "Create a ticket"],
        ["create-psa-ticket", "Create a PSA ticket"],
        ["update-record", "Update a record"],
      ],
    },
    {
      name: "target",
      label: "Target or recipient",
      type: "text",
      placeholder: "e.g. #it-support",
    },
    {
      name: "ticketType",
      label: "Ticket type",
      type: "text",
      placeholder: "e.g. Incident",
    },
    {
      name: "priority",
      label: "Priority",
      type: "text",
      placeholder: "e.g. High",
    },
    {
      name: "summary",
      label: "Ticket summary",
      type: "text",
      placeholder: "e.g. Machine offline: {{alert.deviceName}}",
    },
  ],
};

function getPropertiesForType(type, values = {}) {
  const typeProperties = propertiesByType[type] ?? [];
  if (type !== "trigger") {
    return typeProperties;
  }

  return [
    ...typeProperties,
    ...(triggerPropertiesByEvent[values.event] ?? []),
  ];
}

// Build a unique ID and check the current list to guard against collisions.
function createStepId(existingSteps = steps) {
  let id;

  do {
    const randomPart = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    id = `step-${randomPart}`;
  } while (existingSteps.some((step) => step.id === id));

  return id;
}

// Create the appropriate input controls whenever the user changes step type.
function renderPropertyFields(type, values = {}) {
  propertyFields.replaceChildren();

  for (const property of getPropertiesForType(type, values)) {
    const field = document.createElement("div");
    field.className = "field";

    const label = document.createElement("label");
    label.htmlFor = `property-${property.name}`;
    label.textContent = property.label;

    let input;
    if (property.type === "select") {
      input = document.createElement("select");

      // Empty choices let validation explain what needs fixing instead of blocking edits.
      if (property.emptyOption) {
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = property.emptyOption;
        input.append(emptyOption);
      }

      for (const [value, text] of property.options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        input.append(option);
      }

      if (values[property.name] && !property.options.some(([value]) => value === values[property.name])) {
        const customOption = document.createElement("option");
        customOption.value = values[property.name];
        customOption.textContent = `Other: ${values[property.name]}`;
        input.append(customOption);
      }
    } else {
      input = document.createElement("input");
      input.type = property.type;
      input.placeholder = property.placeholder;
    }

    input.id = `property-${property.name}`;
    input.name = property.name;
    input.value = values[property.name] ?? "";
    field.append(label, input);
    if (property.helpText) {
      const hint = document.createElement("small");
      hint.className = "field-hint";
      hint.textContent = property.helpText;
      field.append(hint);
    }
    propertyFields.append(field);
  }
}

// Return machine-readable validation issues for the current workflow.
function validateWorkflow(workflow) {
  const errors = [];
  const workflowName = String(workflow.name ?? "").trim();
  const workflowSteps = Array.isArray(workflow.steps) ? workflow.steps : [];

  if (!workflowName) {
    errors.push({
      code: "workflow-name-required",
      message: "Add a name for this workflow.",
    });
  }

  if (workflowSteps.length === 0) {
    errors.push({
      code: "workflow-steps-required",
      message: "Add at least one step to the workflow.",
    });
  }

  workflowSteps.forEach((step, index) => {
    const stepName = String(step.name ?? "").trim();
    const properties = step.properties ?? {};

    if (!stepName) {
      errors.push({
        code: "step-name-required",
        message: `Step ${index + 1} needs a name.`,
        stepId: step.id,
      });
    }

    if (step.type === "trigger" && !String(properties.event ?? "").trim()) {
      errors.push({
        code: "trigger-event-required",
        message: `Trigger "${stepName || `Step ${index + 1}`}" needs an event type.`,
        stepId: step.id,
      });
    }

    if (step.type === "trigger" && properties.event === "schedule") {
      const scheduledAt = new Date(properties.scheduledAt ?? "");
      if (!properties.scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        errors.push({
          code: "schedule-date-required",
          message: `Trigger "${stepName || `Step ${index + 1}`}" needs a future date and time.`,
          stepId: step.id,
        });
      }
    }

    if (step.type === "condition") {
      if (!String(properties.field ?? "").trim()) {
        errors.push({
          code: "condition-field-required",
          message: `Condition "${stepName || `Step ${index + 1}`}" needs a field to check.`,
          stepId: step.id,
        });
      }

      if (!String(properties.operator ?? "").trim()) {
        errors.push({
          code: "condition-operator-required",
          message: `Condition "${stepName || `Step ${index + 1}`}" needs an operator.`,
          stepId: step.id,
        });
      }
    }

    if (step.type === "action" && !String(properties.action ?? "").trim()) {
      errors.push({
        code: "action-name-required",
        message: `Action "${stepName || `Step ${index + 1}`}" needs an action to perform.`,
        stepId: step.id,
      });
    }
  });

  const triggerSteps = workflowSteps.filter((step) => step.type === "trigger");
  if (triggerSteps.length > 1) {
    errors.push({
      code: "multiple-triggers",
      message: "A workflow can contain only one trigger.",
      stepId: triggerSteps[1].id,
    });
  }

  if (workflowSteps.length > 0 && workflowSteps[0].type !== "trigger") {
    errors.push({
      code: "first-step-must-be-trigger",
      message: "The first step must be a trigger.",
      stepId: workflowSteps[0].id,
    });
  }

  return errors;
}

// Check imported JSON's shape before using it to update the current workflow.
function validateImportedWorkflow(value) {
  const errors = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["The JSON must contain a workflow object."];
  }

  if (typeof value.name !== "string") {
    errors.push('The workflow "name" must be text.');
  }

  if (value.description !== undefined && typeof value.description !== "string") {
    errors.push('The workflow "description" must be text.');
  }

  if (!Array.isArray(value.steps)) {
    errors.push('The workflow "steps" property must be an array.');
    return errors;
  }

  const knownTypes = new Set(Object.keys(propertiesByType));
  const seenIds = new Set();

  value.steps.forEach((step, index) => {
    const label = `Step ${index + 1}`;

    if (!step || typeof step !== "object" || Array.isArray(step)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (typeof step.id !== "string" || !step.id.trim()) {
      errors.push(`${label} needs a non-empty string "id".`);
    } else if (seenIds.has(step.id)) {
      errors.push(`${label} has a duplicate id: "${step.id}".`);
    } else {
      seenIds.add(step.id);
    }

    if (typeof step.type !== "string" || !knownTypes.has(step.type)) {
      errors.push(`${label} has an unsupported type. Use trigger, condition, or action.`);
    }

    if (typeof step.name !== "string") {
      errors.push(`${label} "name" must be text.`);
    }

    if (
      !step.properties ||
      typeof step.properties !== "object" ||
      Array.isArray(step.properties)
    ) {
      errors.push(`${label} "properties" must be an object.`);
    } else if (
      Object.values(step.properties).some((propertyValue) => typeof propertyValue !== "string")
    ) {
      errors.push(`${label} property values must all be text.`);
    }
  });

  return errors;
}

function showAppFeedback(message, isSuccess = false, kind = "message") {
  appFeedback.textContent = message;
  appFeedback.classList.toggle("is-success", isSuccess);
  appFeedback.dataset.kind = kind;
  appFeedback.setAttribute("role", isSuccess ? "status" : "alert");
  appFeedback.hidden = false;
}

function clearAppFeedback() {
  appFeedback.hidden = true;
  appFeedback.textContent = "";
  appFeedback.classList.remove("is-success");
  delete appFeedback.dataset.kind;
  appFeedback.setAttribute("role", "status");
}

function exportWorkflow() {
  clearAppFeedback();

  const workflow = {
    name: workflowNameInput.value,
    description: workflowDescriptionInput.value,
    steps,
  };
  const errors = validateWorkflow(workflow);

  if (errors.length > 0) {
    renderValidation();
    showAppFeedback(
      `Fix the workflow validation issues before exporting:\n${errors.map((error) => error.message).join("\n")}`,
    );
    return;
  }

  let downloadUrl;
  try {
    const json = JSON.stringify(workflow, null, 2);
    const file = new Blob([json], { type: "application/json;charset=utf-8" });
    downloadUrl = URL.createObjectURL(file);

    const safeName = workflow.name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "");
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `workflow-${safeName || "untitled"}.json`;
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    showAppFeedback(`Exported "${workflow.name}" as a JSON file.`, true);
  } catch {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    showAppFeedback(
      "The workflow could not be exported. Try again or check your browser's download settings.",
    );
  }
}

// Store the entire current workflow so every change can be restored on this browser.
function saveWorkflow() {
  const workflow = {
    name: workflowNameInput.value,
    description: workflowDescriptionInput.value,
    steps,
  };

  try {
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflow));
    if (appFeedback.dataset.kind === "storage-error") {
      clearAppFeedback();
    }
    return true;
  } catch {
    showAppFeedback(
      "Could not save this workflow in browser storage. Check your browser's storage settings or available space.",
      false,
      "storage-error",
    );
    return false;
  }
}

// Restore only data with a recognizable workflow shape; bad data starts empty.
function loadWorkflow() {
  let savedWorkflowText;

  try {
    savedWorkflowText = localStorage.getItem(WORKFLOW_STORAGE_KEY);
  } catch {
    showAppFeedback(
      "Browser storage is unavailable. You can still edit this workflow, but changes may not be saved.",
      false,
      "storage-error",
    );
    return;
  }

  if (savedWorkflowText === null) {
    return;
  }

  let savedWorkflow;
  try {
    savedWorkflow = JSON.parse(savedWorkflowText);
  } catch {
    showAppFeedback(
      "The saved workflow could not be read because its data is corrupted. A new empty workflow has been started.",
    );
    return;
  }

  const structureErrors = validateImportedWorkflow(savedWorkflow);
  if (structureErrors.length > 0) {
    showAppFeedback(
      `The saved workflow has an invalid structure. A new empty workflow has been started:\n${structureErrors.join("\n")}`,
    );
    return;
  }

  workflowNameInput.value = savedWorkflow.name;
  workflowDescriptionInput.value = savedWorkflow.description ?? "";
  steps = savedWorkflow.steps.map((step) => ({
    id: step.id,
    type: step.type,
    name: step.name,
    properties: Object.fromEntries(Object.entries(step.properties)),
  }));
}

function clearWorkflow() {
  if (!window.confirm("Clear the current workflow and its saved browser copy?")) {
    return;
  }

  try {
    localStorage.removeItem(WORKFLOW_STORAGE_KEY);
  } catch {
    showAppFeedback(
      "Could not clear the saved workflow from browser storage. Your current workflow has not been cleared.",
      false,
      "storage-error",
    );
    return;
  }

  workflowNameInput.value = "";
  workflowDescriptionInput.value = "";
  steps = [];
  clearAppFeedback();
  renderSteps();
  showAppFeedback("Workflow cleared.", true);
}

function loadExampleWorkflow() {
  if (
    hasCurrentWork() &&
    !window.confirm("Loading the example will replace your current workflow. Continue?")
  ) {
    return;
  }

  workflowNameInput.value = "Demo: Machine Offline Alert to PSA Ticket";
  workflowDescriptionInput.value =
    "DEMO DATA — When a monitoring alert reports MachineOffline30, check the alert type and create a high-priority incident in the PSA service desk.";
  const exampleSteps = [];
  const addExampleStep = (type, name, properties) => {
    exampleSteps.push({
      id: createStepId([...steps, ...exampleSteps]),
      type,
      name,
      properties,
    });
  };

  addExampleStep("trigger", "Alert Created", {
    event: "alert-created",
    source: "Infrastructure monitoring",
    alertType: "MachineOffline30",
  });
  addExampleStep("condition", "Alert Type equals MachineOffline30", {
    field: "alert.type",
    operator: "equals",
    value: "MachineOffline30",
  });
  addExampleStep("action", "Create PSA Ticket", {
    action: "create-psa-ticket",
    target: "PSA service desk",
    ticketType: "Incident",
    priority: "High",
    summary: "Machine offline: {{alert.deviceName}}",
  });
  steps = exampleSteps;

  renderSteps();
  if (saveWorkflow()) {
    showAppFeedback("Demo data loaded. Customize it before using this workflow.", true);
  } else {
    showAppFeedback(
      "Demo data loaded for this session, but it could not be saved in browser storage.",
      false,
      "storage-error",
    );
  }
}

function hasCurrentWork() {
  return Boolean(
    workflowNameInput.value.trim() ||
    document.querySelector("#workflow-description").value.trim() ||
    steps.length,
  );
}

async function importWorkflowFile(file) {
  let importedWorkflow;

  try {
    const fileText = await file.text();
    importedWorkflow = JSON.parse(fileText);
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "This file is not valid JSON. Check its syntax and try again."
        : "The selected file could not be read. Try choosing it again.";
    showAppFeedback(message);
    return;
  }

  const structureErrors = validateImportedWorkflow(importedWorkflow);
  if (structureErrors.length > 0) {
    showAppFeedback(`Could not import this workflow:\n${structureErrors.join("\n")}`);
    return;
  }

  // Prepare a clean copy before asking to replace anything, so malformed data
  // can never partially overwrite the workflow currently on screen.
  const importedSteps = importedWorkflow.steps.map((step) => ({
    id: step.id,
    type: step.type,
    name: step.name,
    properties: Object.fromEntries(Object.entries(step.properties)),
  }));

  if (
    hasCurrentWork() &&
    !window.confirm("Importing will replace your current workflow. Continue?")
  ) {
    return;
  }

  // Replace state only after reading, parsing, structural validation, and confirmation.
  workflowNameInput.value = importedWorkflow.name;
  workflowDescriptionInput.value = importedWorkflow.description ?? "";
  steps = importedSteps;

  renderSteps();
  if (saveWorkflow()) {
    showAppFeedback(`Imported "${importedWorkflow.name || "workflow"}".`, true);
  } else {
    showAppFeedback(
      `Imported "${importedWorkflow.name || "workflow"}" for this session, but it could not be saved in browser storage.`,
      false,
      "storage-error",
    );
  }
}

// Show every validation issue while leaving all workflow controls editable.
function renderValidation() {
  const errors = validateWorkflow({
    name: workflowNameInput.value,
    steps,
  });

  validationErrors.replaceChildren();
  validationPanel.classList.toggle("is-valid", errors.length === 0);
  validationIcon.textContent = errors.length === 0 ? "✓" : "!";

  if (errors.length === 0) {
    validationSummary.textContent = "This workflow meets all validation rules.";
    return;
  }

  validationSummary.textContent =
    `${errors.length} ${errors.length === 1 ? "issue needs" : "issues need"} attention.`;

  for (const error of errors) {
    const item = document.createElement("li");
    item.dataset.code = error.code;
    item.textContent = error.message;
    validationErrors.append(item);
  }
}

// Render from the steps array so the screen always matches the current data.
function renderSteps() {
  stepList.replaceChildren();
  emptyState.hidden = steps.length > 0;

  steps.forEach((step, index) => {
    const item = document.createElement("li");
    item.className = "step-card";

    const main = document.createElement("div");
    main.className = "step-main";

    const titleRow = document.createElement("div");
    titleRow.className = "step-title-row";

    const number = document.createElement("span");
    number.className = "step-number";
    number.textContent = `${String(index + 1).padStart(2, "0")}`;

    const type = document.createElement("span");
    type.className = "step-type";
    type.dataset.type = step.type;
    type.textContent = step.type;

    const name = document.createElement("h3");
    name.className = "step-name";
    name.textContent = step.name;
    titleRow.append(number, type, name);

    const propertyList = document.createElement("p");
    propertyList.className = "step-properties";
    for (const [key, value] of Object.entries(step.properties)) {
      const property = document.createElement("span");
      property.className = "step-property";

      const propertyName = document.createElement("strong");
      propertyName.textContent = `${key}: `;
      property.append(propertyName, document.createTextNode(value));
      propertyList.append(property);
    }

    main.append(titleRow, propertyList);

    const controls = document.createElement("div");
    controls.className = "step-controls";
    controls.setAttribute("aria-label", `Controls for ${step.name}`);
    controls.append(
      createControlButton("edit", step.id, `Edit ${step.name}`, "✎", false),
      createControlButton("move-up", step.id, "Move step up", "↑", index === 0),
      createControlButton(
        "move-down",
        step.id,
        "Move step down",
        "↓",
        index === steps.length - 1,
      ),
      // Duplicate button: inserts a copy immediately after the original
      createControlButton("duplicate", step.id, `Duplicate ${step.name}`, "⧉", false),
      createControlButton("delete", step.id, "Delete step", "×", false, true),
    );

    item.append(main, controls);
    stepList.append(item);
  });

  renderValidation();
}

// Keep the repeated button markup in one place and attach action details as data.
function createControlButton(action, id, label, text, disabled, isDelete = false) {
  const button = document.createElement("button");
  button.className = `icon-button${isDelete ? " delete-button" : ""}`;
  button.type = "button";
  button.dataset.action = action;
  button.dataset.stepId = id;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  button.disabled = disabled;
  return button;
}

function openStepDialog(step = null) {
  stepForm.reset();
  editingStepId = step ? step.id : null;
  const hasOtherTrigger = step?.type !== "trigger" && steps.some(
    (existingStep) => existingStep.type === "trigger" && existingStep.id !== step?.id,
  );
  const triggerOption = stepTypeSelect.querySelector('option[value="trigger"]');
  triggerOption.hidden = hasOtherTrigger;
  triggerOption.disabled = hasOtherTrigger;
  stepTypeSelect.value = step ? step.type : hasOtherTrigger ? "action" : "trigger";
  renderPropertyFields(stepTypeSelect.value, step?.properties ?? {});

  if (step) {
    stepNameInput.value = step.name;
    document.querySelector("#dialog-title").textContent = "Edit step";
    document.querySelector("#save-step-button").textContent = "Save changes";
  } else {
    document.querySelector("#dialog-title").textContent = "Add a step";
    document.querySelector("#save-step-button").textContent = "Save step";
  }

  stepDialog.showModal();
  stepNameInput.focus();
}

addStepButton.addEventListener("click", () => {
  openStepDialog();
});

workflowNameInput.addEventListener("input", renderValidation);
workflowNameInput.addEventListener("input", saveWorkflow);
workflowDescriptionInput.addEventListener("input", saveWorkflow);

importButton.addEventListener("click", () => {
  clearAppFeedback();
  importFileInput.click();
});

exportButton.addEventListener("click", exportWorkflow);

importFileInput.addEventListener("change", async () => {
  const [file] = importFileInput.files;
  importFileInput.value = "";

  if (!file) {
    return;
  }

  clearAppFeedback();
  await importWorkflowFile(file);
});

clearWorkflowButton.addEventListener("click", clearWorkflow);
loadExampleButton.addEventListener("click", loadExampleWorkflow);

stepTypeSelect.addEventListener("change", () => {
  const previousValues = Object.fromEntries(new FormData(stepForm).entries());
  renderPropertyFields(stepTypeSelect.value, previousValues);
});

propertyFields.addEventListener("change", (event) => {
  if (event.target.name !== "event") {
    return;
  }

  const previousValues = Object.fromEntries(new FormData(stepForm).entries());
  renderPropertyFields("trigger", previousValues);
  propertyFields.querySelector('[name="event"]').focus();
});

document.querySelector("#cancel-step-button").addEventListener("click", () => {
  stepDialog.close();
});

document.querySelector("#close-dialog-button").addEventListener("click", () => {
  stepDialog.close();
});

stepDialog.addEventListener("close", () => {
  editingStepId = null;
  stepForm.reset();
  document.querySelector("#dialog-title").textContent = "Add a step";
  document.querySelector("#save-step-button").textContent = "Save step";
});

stepForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // Read the submitted form values into a plain properties object.
  const formData = new FormData(stepForm);
  const type = formData.get("type");
  const properties = {};

  for (const property of getPropertiesForType(type, { event: formData.get("event") })) {
    properties[property.name] = String(formData.get(property.name) ?? "").trim();
  }

  const name = String(formData.get("name") ?? "").trim();
  if (editingStepId) {
    const existingStep = steps.find((step) => step.id === editingStepId);
    if (!existingStep) {
      stepDialog.close();
      showAppFeedback("This step is no longer available to edit. Please try again.");
      return;
    }

    const knownPropertyNames = new Set([
      ...Object.values(propertiesByType).flatMap((typeProperties) =>
        typeProperties.map((property) => property.name),
      ),
      ...Object.values(triggerPropertiesByEvent).flatMap((typeProperties) =>
        typeProperties.map((property) => property.name),
      ),
    ]);
    const customProperties = Object.fromEntries(
      Object.entries(existingStep.properties).filter(([key]) => !knownPropertyNames.has(key)),
    );

    existingStep.type = type;
    existingStep.name = name;
    existingStep.properties = { ...customProperties, ...properties };
  } else {
    steps.push({
      id: createStepId(),
      type,
      name,
      properties,
    });
  }

  stepDialog.close();
  renderSteps();
  saveWorkflow();
});

// One listener handles all step controls, including buttons created later.
stepList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const index = steps.findIndex((step) => step.id === button.dataset.stepId);
  if (index === -1) {
    return;
  }

  if (button.dataset.action === "edit") {
    openStepDialog(steps[index]);
    return;
  }

  // Handle duplication: insert a deep copy immediately after the original
  if (button.dataset.action === "duplicate") {
    const original = steps[index];
    const clone = {
      id: createStepId(steps),
      type: original.type,
      name: original.name,
      properties: JSON.parse(JSON.stringify(original.properties || {})),
    };
    steps.splice(index + 1, 0, clone);
    renderSteps();
    saveWorkflow();
    return;
  }

  if (button.dataset.action === "delete") {
    steps.splice(index, 1);
  } else {
    const offset = button.dataset.action === "move-up" ? -1 : 1;
    const destination = index + offset;

    if (destination >= 0 && destination < steps.length) {
      [steps[index], steps[destination]] = [steps[destination], steps[index]];
    }
  }

  renderSteps();
  saveWorkflow();
});

loadWorkflow();
renderSteps();
