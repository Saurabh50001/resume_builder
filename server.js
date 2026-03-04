const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/generate-resume') {
    const body = await readJsonBody(req);

    if (body === null) {
      return sendJson(res, 400, { error: 'Invalid JSON body.' });
    }

    try {
      const generatedResume = await buildResumeWithAI(body);
      return sendJson(res, 200, { resume: generatedResume });
    } catch (error) {
      console.error('Resume generation failed:', error.message);
      return sendJson(res, 500, {
        error: 'Unable to generate resume right now. Please try again.',
      });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const filePath = resolveStaticPath(req.url || '/');
  if (!filePath) {
    res.writeHead(404);
    return res.end('Not Found');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }

    const ext = path.extname(filePath);
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    if (req.method === 'HEAD') {
      return res.end();
    }
    return res.end(content);
  });
});

function resolveStaticPath(urlPath) {
  const normalized = urlPath === '/' ? '/index.html' : urlPath;
  const parsedPath = decodeURIComponent(normalized.split('?')[0]);
  const safePath = path.normalize(parsedPath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.join(publicDir, safePath);

  if (!absolutePath.startsWith(publicDir)) {
    return null;
  }

  return absolutePath;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        resolve(null);
      }
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });

    req.on('error', () => resolve(null));
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function buildResumeWithAI(data) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      return await generateWithOpenAI(data, openAiKey);
    } catch {
      console.warn('OpenAI generation failed. Falling back to local generator.');
    }
  }
  return generateLocally(data);
}

async function generateWithOpenAI(data, apiKey) {
  const systemPrompt = `You are an expert resume writer focused on ATS optimization.
Return valid JSON only matching this schema:
{"summary":"string","skills":["string"],"experience":[{"title":"string","company":"string","dates":"string","bullets":["string"]}],"education":[{"degree":"string","institution":"string","dates":"string"}]}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(data) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI request failed');
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No AI response content');
  }

  return JSON.parse(content);
}

function generateLocally(data) {
  const normalizedSkills = parseCommaValues(data.skills)
    .map((skill) => skill.toLowerCase())
    .filter(Boolean);

  const coreSkills = Array.from(new Set([
    ...normalizedSkills,
    'communication',
    'problem solving',
    'team collaboration',
  ])).slice(0, 10).map(capitalizeWords);

  const experience = (Array.isArray(data.experience) ? data.experience : [])
    .filter((item) => item && (item.role || item.company || item.description))
    .map((item) => ({
      title: item.role || 'Professional Experience',
      company: item.company || 'Company Name',
      dates: item.dates || 'Dates not provided',
      bullets: buildBullets(item.description, coreSkills),
    }));

  const education = (Array.isArray(data.education) ? data.education : [])
    .filter((item) => item && (item.degree || item.institution))
    .map((item) => ({
      degree: item.degree || 'Degree',
      institution: item.institution || 'Institution',
      dates: item.dates || 'Dates not provided',
    }));

  return {
    summary: `${data.profile || 'Results-driven professional'} with experience in ${coreSkills.slice(0, 4).join(', ')}. Demonstrates measurable impact, strong collaboration, and consistent delivery aligned to ATS-friendly role requirements.`,
    skills: coreSkills,
    experience,
    education,
  };
}

function buildBullets(description, skills) {
  const text = (description || '').trim();
  if (!text) {
    return [
      `Delivered projects with focus on ${skills[0] || 'operational excellence'} and stakeholder outcomes.`,
      'Improved process efficiency through data-informed decisions and cross-functional collaboration.',
    ];
  }

  const rawSentences = text
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (!rawSentences.length) {
    return [text];
  }

  return rawSentences.map((sentence, idx) => {
    const keyword = skills[idx % skills.length] || 'leadership';
    return `${capitalize(sentence)} (ATS keyword: ${keyword})`;
  });
}

function parseCommaValues(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value.split(',').map((item) => item.trim());
}

function capitalizeWords(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

server.listen(PORT, () => {
  console.log(`Resume Builder running on http://localhost:${PORT}`);
});
