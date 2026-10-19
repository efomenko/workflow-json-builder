# Workflow JSON Builder

A small, browser-based editor for describing IT automation workflows as ordered JSON data. Build a workflow from a trigger, condition, and action; review validation feedback; and keep a working copy in the browser.

## Problem statement

Automation ideas are often discussed in plain language before they are ready to be implemented in a specific IT platform. This project provides a simple way to express those ideas as an ordered, structured workflow that can be reviewed and shared as JSON.

The app is an editor and learning project, not an automation engine: it describes steps but does not run them or connect to IT systems.

## Key features

- Add and edit Trigger, Condition, and Action steps with names and properties.
- Choose from common triggers such as alert created, email received, device registered, ticket created, and user created.
- Add only one trigger to a workflow; after adding one, new steps can be Conditions or Actions.
- Configure a one-time scheduled trigger with a native date-and-time picker using the browser's local time zone.
- Display steps in order, move them up or down, and delete them.
- See validation feedback while editing; invalid workflows remain editable.
- Import a workflow JSON file after checking its structure. Replacing existing work requires confirmation.
- Export a valid workflow as a human-readable JSON file.
- Automatically save the current workflow in browser `localStorage`.
- Load saved workflow data on startup and clear the current workflow after confirmation.
- Load a marked demo workflow for a machine-offline alert scenario.
- Use a responsive, browser-native interface without a framework or external UI library.

## Example workflow

The built-in demo describes this sequence:

1. **Trigger — Alert Created:** starts from an alert-created event from an infrastructure monitoring source.
2. **Condition — Alert Type equals MachineOffline30:** checks `alert.type`.
3. **Action — Create PSA Ticket:** describes creating a high-priority incident in a PSA service desk.

The workflow name and description are marked as demo data. The app does not execute this scenario or contact a monitoring platform or PSA.

## Technology stack

- HTML for the document structure and native dialog.
- CSS for layout, responsive behavior, and visual styling.
- Vanilla JavaScript for workflow state, rendering, validation, JSON import, and persistence.
- Browser `localStorage` for the saved working copy.

No framework, backend, API, package installation, or API key is required.

## Architecture overview

The project is a small static client-side application:

1. `index.html` provides the page structure, workflow fields, actions, step list, validation panel, and step form.
2. `styles.css` controls the visual design and responsive layout.
3. `app.js` owns the current step data, creates and renders steps, validates workflows, handles import and user actions, and reads/writes browser storage.

The workflow's name and description are read from their form fields. The ordered steps are held in a JavaScript array. Rendering updates the visible list from that array, and changes are saved as a JSON string under the `workflow-json-builder.workflow` localStorage key.

## Run locally

1. Download or clone this project.
2. Open `index.html` in a modern browser.

No build step or local server is required. Workflow data is saved in the browser profile's local storage; it is not synchronized between browsers or devices.

## How to use the application

1. Enter a workflow name and an optional description.
2. Select **Add step**.
3. Choose a step type, enter a name, and fill in the available properties.
4. Save the step. Use **Edit** to revise it, the up/down controls to change its position, or delete it.
5. Review the validation panel and make any needed corrections.
6. Use **Load Example Workflow** to see the demo. If the current workflow contains data, confirm before replacing it.
7. Use **Import JSON** to select a workflow file. The app checks the file's JSON syntax and expected structure, then asks before replacing existing work.
8. Select **Export JSON** to download the workflow after it passes validation.
9. Use **Clear Workflow** to remove the current workflow and its saved browser copy, after confirmation.

Changes are saved automatically while editing. Closing and reopening the page in the same browser context restores the saved workflow when browser storage is available.

## Example JSON

This sample follows the structure used by the app's importer. Step IDs must be non-empty and unique. Property values must be strings.

```json
{
  "name": "Demo: Machine Offline Alert to PSA Ticket",
  "description": "DEMO DATA — When a monitoring alert reports MachineOffline30, check the alert type and create a high-priority incident in the PSA service desk.",
  "steps": [
    {
      "id": "step-example-trigger",
      "type": "trigger",
      "name": "Alert Created",
      "properties": {
        "event": "alert-created",
        "source": "Infrastructure monitoring",
        "alertType": "MachineOffline30"
      }
    },
    {
      "id": "step-example-condition",
      "type": "condition",
      "name": "Alert Type equals MachineOffline30",
      "properties": {
        "field": "alert.type",
        "operator": "equals",
        "value": "MachineOffline30"
      }
    },
    {
      "id": "step-example-action",
      "type": "action",
      "name": "Create PSA Ticket",
      "properties": {
        "action": "create-psa-ticket",
        "target": "PSA service desk",
        "ticketType": "Incident",
        "priority": "High",
        "summary": "Machine offline: {{alert.deviceName}}"
      }
    }
  ]
}
```

The importer checks the JSON structure, supported step types, IDs, names, properties object, and string property values. A structurally valid workflow can still have validation issues displayed in the app.

## Project structure

```text
workflow-json-builder/
├── index.html   # Page structure and accessible form controls
├── styles.css   # Application styling and responsive layout
├── app.js       # Workflow state, rendering, validation, import, persistence
└── README.md    # Project overview and usage guide
```

## Validation rules

The app displays validation errors without blocking edits. A workflow is considered valid when:

- It has a non-empty name.
- It contains at least one step.
- Every step has a non-empty name.
- It contains no more than one trigger.
- Its first step is a trigger.
- A Trigger must have an event type selected.
- A scheduled Trigger must have a future date and time.
- Every Condition has a non-empty `field` and `operator` property.
- Every Action has a non-empty `action` property.

The current validator does not require a Condition's `value` property or validate that other properties match a real integration's schema.

A scheduled trigger is a one-time date and time in the user's local time zone. Recurring schedules and time-zone selection are not supported.

## What I learned from building it with GitHub Copilot

Building this incrementally with GitHub Copilot reinforced that a useful product prototype is more than its main happy path. I learned to:

- Break a broad product idea into small, testable increments.
- Treat the workflow as structured data and render the UI from that data.
- Define validation separately from structural JSON checks: one checks workflow rules, the other checks whether imported data can safely be read.
- Keep invalid workflows editable while making the problems visible.
- Review generated code and verify behavior in the browser, especially around replacement confirmation, malformed imports, and browser storage.
- Be explicit about the boundary between describing an automation and actually executing it.

## Known limitations

- The app edits and stores workflow descriptions; it does not execute workflows.
- There are no integrations with monitoring, ticketing, or other IT platforms.
- Workflow data is stored only in the current browser's local storage, with no cloud backup or cross-device sync.
- The built-in form offers a small, predefined set of properties. Imported workflows may contain other string properties, which are retained when editing but are not directly editable in the form.
- The app does not check workflow properties against an external system's schema.
- Validation covers the listed workflow rules, not runtime behavior, credentials, permissions, or integration-specific requirements.

## Future improvements

- Add configurable property fields for each step type.
- Support workflow templates and additional examples.
- Add more detailed validation, including property value and schema checks.
- Offer an explicit download or backup mechanism for locally saved workflows.
- Add automated tests for validation, import, step ordering, and persistence.
