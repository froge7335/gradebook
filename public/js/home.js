const modal = document.getElementById('modal');
const createBtn = document.getElementById('createCourseBtn');
const modalCancel = document.getElementById('modalCancel');
const courseForm = document.getElementById('courseForm');
const coursesContainer = document.getElementById('coursesContainer');
const topDonutHolder = document.getElementById('topDonutHolder');
const cumulativeTitle = document.getElementById('cumulativeTitle');

// Edit modal elements
const editCourseModal = document.getElementById('editCourseModal');
const editCourseForm = document.getElementById('editCourseForm');
const editCourseCancel = document.getElementById('editCourseCancel');
const editCourseCode = document.getElementById('editCourseCode');
const editCourseWeight = document.getElementById('editCourseWeight');

// Confirm modal
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');

let currentEditCourseId = null;
let currentDeleteCourseId = null;

// Drag state
let dragSrcEl = null;
let draggingId = null;

createBtn.addEventListener('click', () => { modal.classList.remove('hidden'); });
modalCancel.addEventListener('click', () => { modal.classList.add('hidden'); });

editCourseCancel.addEventListener('click', () => {
  editCourseModal.classList.add('hidden');
  currentEditCourseId = null;
});

confirmCancel.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  currentDeleteCourseId = null;
});

function openConfirm(title, message, onOk) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmModal.classList.remove('hidden');
  confirmOk.onclick = () => {
    confirmModal.classList.add('hidden');
    onOk && onOk();
  };
}

function escapeHtml(s){ 
  return String(s).replace(/[&<>\"']/g, (c)=> ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '\"':'&quot;',
    "'":'&#39;'
  })[c]); 
}

// Donut helpers for animation
// Create a small donut (for course cards) with a 0→value fill animation
function createSmallDonut(percent) {
  const size = 76;
  const radius = 30;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, Number(percent || 0)));
  const gap = circumference * (1 - filled / 100);
  const color = filled >= 80 ? '#10b981' : (filled >= 60 ? '#f97316' : '#ef4444');

  // SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Background circle
  const bg = document.createElementNS('http://www.w3.org/2000/svg','circle');
  bg.setAttribute('cx', size/2); 
  bg.setAttribute('cy', size/2); 
  bg.setAttribute('r', radius);
  bg.setAttribute('fill', 'none'); 
  bg.setAttribute('stroke', '#e6e9ef'); 
  bg.setAttribute('stroke-width', stroke.toString());
  svg.appendChild(bg);

  // Foreground (animated) circle
  const fg = document.createElementNS('http://www.w3.org/2000/svg','circle');
  fg.setAttribute('cx', size/2); 
  fg.setAttribute('cy', size/2); 
  fg.setAttribute('r', radius);
  fg.setAttribute('fill', 'none'); 
  fg.setAttribute('stroke', color); 
  fg.setAttribute('stroke-width', stroke.toString());
  fg.setAttribute('stroke-linecap', 'round');

  // Use dasharray = circumference and animate dashoffset from circumference -> gap
  fg.setAttribute('stroke-dasharray', String(circumference));
  fg.setAttribute('stroke-dashoffset', String(circumference));
  // Rotate the circle itself so the stroke begins at the top (12 o'clock)
  fg.setAttribute('transform', `rotate(-90 ${size/2} ${size/2})`);
  svg.appendChild(fg);

  const wrapper = document.createElement('div');
  wrapper.className = 'course-donut';
  wrapper.appendChild(svg);

  // Create centered label inside the wrapper
  const center = document.createElement('div');
  center.className = 'center';
  center.textContent = `${Math.round(filled)}%`;
  wrapper.appendChild(center);

  // Animate after insertion to DOM
  wrapper.animateDonut = (duration = 3000) => {
    fg.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(.2,.9,.2,1)`;
    requestAnimationFrame(() => {
      fg.setAttribute('stroke-dashoffset', String(gap));
    });
  };

  return { wrapper, percent: Math.round(filled) };
}

// Create a large donut used at the top summary with animation
function createLargeDonut(percent) {
  const size = 140;
  const radius = 56;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, Number(percent || 0)));
  const gap = circumference * (1 - filled / 100);
  const color = filled >= 80 ? '#10b981' : (filled >= 60 ? '#f97316' : '#ef4444');

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  const bg = document.createElementNS('http://www.w3.org/2000/svg','circle');
  bg.setAttribute('cx', size/2); 
  bg.setAttribute('cy', size/2); 
  bg.setAttribute('r', radius);
  bg.setAttribute('fill', 'none'); 
  bg.setAttribute('stroke', '#e6e9ef'); 
  bg.setAttribute('stroke-width', stroke.toString());
  svg.appendChild(bg);

  const fg = document.createElementNS('http://www.w3.org/2000/svg','circle');
  fg.setAttribute('cx', size/2); 
  fg.setAttribute('cy', size/2); 
  fg.setAttribute('r', radius);
  fg.setAttribute('fill', 'none'); 
  fg.setAttribute('stroke', color); 
  fg.setAttribute('stroke-width', stroke.toString());
  fg.setAttribute('stroke-linecap', 'round');
  fg.setAttribute('stroke-dasharray', String(circumference));
  fg.setAttribute('stroke-dashoffset', String(circumference));
  fg.setAttribute('transform', `rotate(-90 ${size/2} ${size/2})`);
  svg.appendChild(fg);

  const wrapper = document.createElement('div');
  wrapper.className = 'donut-large';
  wrapper.appendChild(svg);
  const center = document.createElement('div');
  center.className = 'center';
  center.innerHTML = `<div>${Math.round(filled)}%</div>`;
  wrapper.appendChild(center);

  wrapper.animateDonut = (duration = 3000) => {
    fg.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(.2,.9,.2,1)`;
    requestAnimationFrame(() => {
      fg.setAttribute('stroke-dashoffset', String(gap));
    });
  };

  return wrapper;
}

// Load course
async function loadCourses() {
  coursesContainer.innerHTML = '<p>Loading...</p>';
  try {
    const res = await fetch('/api/courses');
    if (!res.ok) throw new Error('Failed to load courses');
    const courses = await res.json();
    renderTopSummary(courses);
    renderCourses(courses);
  } catch (err) {
    console.error('loadCourses error:', err);
    coursesContainer.innerHTML = '<p class="muted">Failed to load courses.</p>';
    topDonutHolder.innerHTML = '';
  }
}

// Compute weighted average
function computeCumulativeAverage(courses) {
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const c of courses) {
    const w = Number(c.weight || 0);
    const m = Number(c.currentMark || 0);
    totalWeighted += m * w;
    totalWeight += w;
  }
  if (totalWeight <= 0) return 0;
  return (Math.round((totalWeighted / totalWeight) * 100)) / 100;
}

// Render the top course summary
function renderTopSummary(courses) {
  const cumulative = computeCumulativeAverage(courses);
  topDonutHolder.innerHTML = '';
  const large = createLargeDonut(cumulative);
  topDonutHolder.appendChild(large);
  // animate after appended
  if (typeof large.animateDonut === 'function') large.animateDonut();
  cumulativeTitle.textContent = `Cumulative Average — ${(cumulative).toFixed(2)}%`;
}

// Drag handlers for course cards
function handleDragStart(e) {
  const el = e.currentTarget;
  dragSrcEl = el;
  draggingId = el.dataset.id;
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  // Store id in dataTransfer for compatibility
  e.dataTransfer.setData('text/plain', draggingId);
}

function handleDragOver(e) {
  e.preventDefault(); // Allow drop
  e.dataTransfer.dropEffect = 'move';
  const over = e.currentTarget;
  if (over === dragSrcEl) return;
  // Add placeholder class to the element we are hovering over
  const cards = Array.from(coursesContainer.querySelectorAll('.course-card'));
  cards.forEach(c => c.classList.remove('placeholder'));
  over.classList.add('placeholder');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('placeholder');
}

function handleDrop(e) {
  e.stopPropagation();
  const target = e.currentTarget;
  target.classList.remove('placeholder');
  const srcId = draggingId || e.dataTransfer.getData('text/plain');
  const dstEl = target;
  if (!srcId || !dstEl) return;
  const srcEl = coursesContainer.querySelector(`.course-card[data-id="${srcId}"]`);
  if (!srcEl) return;

  // Insert source before the target (or after if target is after source)
  const children = Array.from(coursesContainer.children);
  const srcIndex = children.indexOf(srcEl);
  const dstIndex = children.indexOf(dstEl);
  if (srcIndex < dstIndex) {
    dstEl.after(srcEl);
  } else {
    dstEl.before(srcEl);
  }

  // Clean up dragging classes
  srcEl.classList.remove('dragging');
  draggingId = null; dragSrcEl = null;

  // Trigger persist order
  persistCourseOrder();
}

function handleDragEnd(e) {
  const el = e.currentTarget;
  el.classList.remove('dragging');
  
  // Remove any placeholders
  const cards = Array.from(coursesContainer.querySelectorAll('.course-card'));
  cards.forEach(c => c.classList.remove('placeholder'));
}

// Send new order to backend
async function persistCourseOrder() {
  const ids = Array.from(coursesContainer.querySelectorAll('.course-card')).map(c => c.dataset.id);
  if (!ids.length) return;
  try {
    const res = await fetch('/api/courses/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ids })
    });
    if (!res.ok) {
      console.warn('Persist order failed', res.status);
    } else {
      console.log('Order persisted');
    }
  } catch (err) {
    console.warn('Could not persist order (network):', err);
  }
}

// Render the two column grid of course cards
function renderCourses(courses) {
  coursesContainer.innerHTML = '';
  if (!courses.length) {
    coursesContainer.innerHTML = '<p class="muted">No courses yet — click "Create Course" to add one.</p>';
    return;
  }

  for (const c of courses) {
    const el = document.createElement('div');
    el.className = 'course-card';
    el.dataset.id = String(c.id);

    // Left: donut
    const smallDonutObj = createSmallDonut(c.currentMark);
    const donutArea = smallDonutObj.wrapper;

    // Right: code and vertical buttons
    const right = document.createElement('div');
    right.className = 'course-right';

    const header = document.createElement('div');
    header.className = 'course-header';
    const codeDiv = document.createElement('div');
    codeDiv.innerHTML = `<div class="course-code">${escapeHtml(c.code)}</div><div class="course-gpa">${c.currentMark} / 100</div>`;
    header.appendChild(codeDiv);

    const actions = document.createElement('div');
    actions.className = 'course-actions-vertical';
    const editBtn = document.createElement('button');
    editBtn.className = 'small-ghost edit';
    editBtn.textContent = 'Edit';
    editBtn.dataset.id = c.id;
    const delBtn = document.createElement('button');
    delBtn.className = 'small-ghost delete';
    delBtn.textContent = 'Delete';
    delBtn.dataset.id = c.id;
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    header.appendChild(actions);
    right.appendChild(header);

    el.appendChild(donutArea);
    el.appendChild(right);

    // Attach drag handlers
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    el.addEventListener('dragend', handleDragEnd);

    // Navigation behavior
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('button')) return;
      if (el.classList.contains('dragging')) return;
      window.location.href = `/course/${c.id}`;
    });

    // Edit behavior
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentEditCourseId = e.target.dataset.id;
      editCourseCode.value = c.code;
      editCourseWeight.value = c.weight || 0;
      editCourseModal.classList.remove('hidden');
    });

    // Delete behaviour
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentDeleteCourseId = e.target.dataset.id;
      openConfirm('Delete course', `Delete "${c.code}" and all its assignments?`, async () => {
        try {
          const res = await fetch(`/api/courses/${currentDeleteCourseId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Delete failed');
          currentDeleteCourseId = null;
          loadCourses();
        } catch (err) {
          alert('Failed to delete course');
          console.error(err);
        }
      });
    });

    coursesContainer.appendChild(el);

    // Trigger small donut animation after appended
    if (typeof smallDonutObj.wrapper.animateDonut === 'function') {
      smallDonutObj.wrapper.animateDonut();
    }
  }
}

// Add course
courseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('courseCode').value.trim();
  const weight = parseFloat(document.getElementById('courseWeight').value) || 0;
  if (!code) { alert('Course code required'); return; }
  try {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, weight })
    });
    const body = await (res.headers.get('content-type')?.includes('json') ? res.json() : res.text());
    if (!res.ok) {
      alert((body && body.errors && body.errors.map(e=>e.msg).join('\n')) || body?.error || 'Error creating course');
      return;
    }
    courseForm.reset();
    modal.classList.add('hidden');
    loadCourses();
  } catch (err) {
    console.error(err);
    alert('Network error creating course');
  }
});

// Edit course
editCourseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentEditCourseId) return;
  const newCode = editCourseCode.value.trim();
  const newWeight = parseFloat(editCourseWeight.value) || 0;
  if (!newCode) { alert('Course code required'); return; }
  try {
    const res = await fetch(`/api/courses/${currentEditCourseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode, weight: newWeight })
    });
    if (!res.ok) {
      const body = await (res.headers.get('content-type')?.includes('json') ? res.json() : res.text());
      alert((body && body.errors && body.errors.map(e=>e.msg).join('\n')) || body?.error || 'Error updating course');
      return;
    }
    editCourseModal.classList.add('hidden');
    currentEditCourseId = null;
    loadCourses();
  } catch (err) {
    console.error(err);
    alert('Network error updating course');
  }
});

// Initial load
loadCourses();