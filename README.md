# AI Resume Builder

A web app that generates professional and ATS-friendly resumes from user input.

## Features
- Form for name, profile, contact, education, skills, and experience
- AI-assisted resume generation (`OPENAI_API_KEY` optional)
- ATS-friendly structured formatting
- Download generated resume as PDF
- Portable self-extracting file to run the app anywhere with Node.js

## Run locally

```bash
npm start
```

Open: `http://localhost:3000`

## Run as a separate portable file (extract + run anywhere)

Build the portable file:

```bash
npm run portable
```

This creates:

- `dist/resume-builder-portable.run` (single self-extracting file)

Run it anywhere:

```bash
chmod +x resume-builder-portable.run
./resume-builder-portable.run /path/where/you/want/the/app
```

The file will extract the app and start it immediately.

## Optional AI integration

Set an OpenAI API key to use model-based generation:

```bash
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4o-mini
npm start
```

Without an API key, the app uses a local ATS-focused generator.
