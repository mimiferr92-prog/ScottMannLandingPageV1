document.getElementById('year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');

if (reducedMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  reveals.forEach((item) => observer.observe(item));
}

const applicationForm = document.getElementById('application-form');
const formStatus = document.getElementById('form-status');
const formSteps = [...document.querySelectorAll('.form-step')];
const nextButton = document.getElementById('form-next');
const backButton = document.getElementById('form-back');
const submitButton = document.getElementById('form-submit');
const stepCount = document.getElementById('step-count');
const progressBar = document.getElementById('progress-bar');
const formConfig = window.TTM_FORM_CONFIG || { preview: true, endpoint: '/api/apply' };
const storageKey = 'take-the-mic-application-draft';
let currentStep = 0;

function showStep(index) {
  currentStep = Math.max(0, Math.min(index, formSteps.length - 1));
  formSteps.forEach((step, stepIndex) => {
    const active = stepIndex === currentStep;
    step.hidden = !active;
    step.classList.toggle('is-active', active);
  });
  backButton.hidden = currentStep === 0;
  nextButton.hidden = currentStep === formSteps.length - 1;
  submitButton.hidden = currentStep !== formSteps.length - 1;
  stepCount.textContent = `Step ${currentStep + 1} of ${formSteps.length}`;
  progressBar.style.width = `${((currentStep + 1) / formSteps.length) * 100}%`;
  formStatus.textContent = '';
  formStatus.classList.remove('is-success');
}

function validateCurrentStep() {
  const controls = [...formSteps[currentStep].querySelectorAll('input, select, textarea')];
  const invalid = controls.find((control) => !control.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    formStatus.textContent = 'Please complete the required fields before continuing.';
    return false;
  }
  return true;
}

function saveDraft() {
  if (!applicationForm) return;
  const draft = {};
  new FormData(applicationForm).forEach((value, key) => {
    if (key !== 'website') draft[key] = value;
  });
  draft.consent = applicationForm.elements.consent.checked;
  try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch (_) {}
}

function restoreDraft() {
  let draft;
  try { draft = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (_) { return; }
  if (!draft) return;
  Object.entries(draft).forEach(([name, value]) => {
    const control = applicationForm.elements[name];
    if (!control || name === 'website') return;
    if (control.type === 'checkbox') control.checked = Boolean(value);
    else control.value = value;
  });
}

nextButton?.addEventListener('click', () => {
  if (!validateCurrentStep()) return;
  saveDraft();
  showStep(currentStep + 1);
});

backButton?.addEventListener('click', () => {
  saveDraft();
  showStep(currentStep - 1);
});

applicationForm?.addEventListener('input', saveDraft);
applicationForm?.addEventListener('change', saveDraft);

applicationForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateCurrentStep()) return;

  const payload = Object.fromEntries(new FormData(applicationForm).entries());
  payload.consent = applicationForm.elements.consent.checked;

  if (formConfig.preview) {
    formStatus.textContent = 'Application complete. Email delivery will activate after approval.';
    formStatus.classList.add('is-success');
    saveDraft();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting…';
  formStatus.textContent = '';

  try {
    const response = await fetch(formConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Unable to submit the application.');
    formStatus.textContent = 'Application received. The Take the Mic team will follow up soon.';
    formStatus.classList.add('is-success');
    applicationForm.reset();
    try { localStorage.removeItem(storageKey); } catch (_) {}
  } catch (error) {
    formStatus.textContent = error.message || 'Unable to submit right now. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit Application <span aria-hidden="true">→</span>';
  }
});

if (applicationForm) {
  restoreDraft();
  showStep(0);
}
