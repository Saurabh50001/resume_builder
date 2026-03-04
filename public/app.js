const form = document.getElementById('resumeForm');
const preview = document.getElementById('resumePreview');
const addEducationBtn = document.getElementById('addEducation');
const addExperienceBtn = document.getElementById('addExperience');
const educationContainer = document.getElementById('educationContainer');
const experienceContainer = document.getElementById('experienceContainer');
const downloadBtn = document.getElementById('downloadPdf');

addEducationBtn.addEventListener('click', () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'group education-item';
  wrapper.innerHTML = `
    <input type="text" name="educationDegree" placeholder="Degree" required />
    <input type="text" name="educationInstitution" placeholder="Institution" required />
    <input type="text" name="educationDates" placeholder="Dates" />
  `;
  educationContainer.appendChild(wrapper);
});

addExperienceBtn.addEventListener('click', () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'group experience-item';
  wrapper.innerHTML = `
    <input type="text" name="experienceRole" placeholder="Role" required />
    <input type="text" name="experienceCompany" placeholder="Company" required />
    <input type="text" name="experienceDates" placeholder="Dates" />
    <textarea name="experienceDescription" rows="3" placeholder="Describe your impact"></textarea>
  `;
  experienceContainer.appendChild(wrapper);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  downloadBtn.disabled = true;
  preview.innerHTML = '<p class="placeholder">Generating ATS-friendly resume...</p>';

  const payload = collectFormData();

  try {
    const response = await fetch('/api/generate-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Generation failed.');
    }

    renderResume(payload, data.resume);
    downloadBtn.disabled = false;
  } catch (error) {
    preview.innerHTML = `<p class="placeholder">${error.message}</p>`;
  }
});

downloadBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');

  const lines = preview.innerText.split('\n').filter(Boolean);
  let y = 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 520);
    wrapped.forEach((textLine) => {
      if (y > 780) {
        doc.addPage();
        y = 40;
      }
      doc.text(textLine, 40, y);
      y += 16;
    });
  });

  doc.save('ats-friendly-resume.pdf');
});

function collectFormData() {
  const formData = new FormData(form);

  const education = Array.from(document.querySelectorAll('.education-item')).map((item) => ({
    degree: item.querySelector('[name="educationDegree"]').value,
    institution: item.querySelector('[name="educationInstitution"]').value,
    dates: item.querySelector('[name="educationDates"]').value,
  }));

  const experience = Array.from(document.querySelectorAll('.experience-item')).map((item) => ({
    role: item.querySelector('[name="experienceRole"]').value,
    company: item.querySelector('[name="experienceCompany"]').value,
    dates: item.querySelector('[name="experienceDates"]').value,
    description: item.querySelector('[name="experienceDescription"]').value,
  }));

  return {
    name: formData.get('name'),
    profile: formData.get('profile'),
    contact: formData.get('contact'),
    skills: formData.get('skills'),
    education,
    experience,
  };
}

function renderResume(input, generated) {
  preview.innerHTML = `
    <h1>${escapeHtml(input.name)}</h1>
    <p>${escapeHtml(input.contact)}</p>

    <h2>Professional Summary</h2>
    <p>${escapeHtml(generated.summary || '')}</p>

    <h2>Skills</h2>
    <p>${(generated.skills || []).map(escapeHtml).join(' • ')}</p>

    <h2>Experience</h2>
    ${(generated.experience || []).map((item) => `
      <p><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.company)} (${escapeHtml(item.dates)})</p>
      <ul>${(item.bullets || []).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
    `).join('')}

    <h2>Education</h2>
    ${(generated.education || []).map((item) => `
      <p><strong>${escapeHtml(item.degree)}</strong> — ${escapeHtml(item.institution)} (${escapeHtml(item.dates)})</p>
    `).join('')}
  `;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
