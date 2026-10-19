# Project Instructions

## Project

Workflow JSON Builder is a small browser-based workflow editor.

## Technology

Use:
- HTML
- CSS
- Vanilla JavaScript
- Browser localStorage

Do not introduce:
- React
- Vue
- Angular
- Node.js
- backend services
- external APIs
- external UI frameworks

## Coding principles

- Keep the code understandable for a beginner.
- Prefer simple solutions over abstractions.
- Keep UI logic and workflow state management reasonably separated.
- Avoid unnecessary dependencies.
- Do not change the data model without explaining why.
- Handle invalid user input gracefully.
- Do not silently discard user data.
- Preserve existing functionality when implementing new features.

## Product principles

The application represents a workflow as an ordered list of steps.

Supported step types:
- trigger
- condition
- action

A workflow should be easy to edit, validate, export and import.

## AI coding principles

Before making significant architectural changes:
1. Explain the proposed approach.
2. Identify files that will change.
3. Identify potential risks.

After implementation:
1. Explain what changed.
2. Explain how to test it.
3. Identify any assumptions.

Always distinguish between:
- confirmed requirements
- assumptions
- implementation decisions.