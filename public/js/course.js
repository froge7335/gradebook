document.addEventListener('DOMContentLoaded', () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const courseId = pathParts.length ? pathParts[pathParts.length - 1] : null;

  const courseTitleEl = document.getElementById('courseTitle');
  const currentMarkEl = document.getElementById('currentMark');
  const assignmentsList = document.getElementById('assignmentsList');
  const assignmentForm = document.getElementById('assignmentForm');

  // Edit modal elements
  const assignmentEditModal = document.getElementById('assignmentEditModal');
  const assignmentEditForm = document.getElementById('assignmentEditForm');
  const editAssignCancel = document.getElementById('editAssignCancel');
  const editAssignTitle = document.getElementById('editAssignTitle');
  const editAssignMark = document.getElementById('editAssignMark');
  const editAssignWeight = document.getElementById('editAssignWeight');

  // Confirm modal
  const confirmModal = document.getElementById('confirmModal');
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');

  let currentlyEditingAssignmentId = null;
  let currentlyDeletingAssignmentId = null;

  // Drag state
  let dragSrcEl = null;
  let draggingId = null;

  if (!courseId) {
    alert('Unable to determine course id.');
    return;
  }

  function escapeHtml(s) { 
    return String(s).replace(/[&<>\"']/g, (c)=> ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '\"':'&quot;',
      "'":'&#39;'
    })[c]); 
  }

  async function loadCourse() {
    assignmentsList.innerHTML = '<p>Loading...</p>';
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`);
      if (!res.ok) throw new Error('Failed to fetch course');
      const course = await res.json();
      courseTitleEl.textContent = course.code || `Course ${course.id}`;
      currentMarkEl.textContent = `Current mark: ${Number(course.currentMark||0).toFixed(2)} / 100`;
      renderAssignments(course.assignments || []);
    } catch (err) {
      console.error(err);
      assignmentsList.innerHTML = '<p class="muted">Failed to load assignments.</p>';
    }
  }

  function openConfirm(title, message, onOk) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');
    confirmOk.onclick = () => {
      confirmModal.classList.add('hidden');
      onOk && onOk();
    };
  }

  confirmCancel.addEventListener('click', () => confirmModal.classList.add('hidden'));

  // Drag handlers for assignment rows
  function handleDragStart(e) {
    const el = e.currentTarget;
    dragSrcEl = el;
    draggingId = el.dataset.id;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggingId);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const over = e.currentTarget;
    if (over === dragSrcEl) return;
    const rows = Array.from(assignmentsList.querySelectorAll('.assignment-row'));
    rows.forEach(r => r.classList.remove('placeholder'));
    over.classList.add('placeholder');
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove('placeholder');
  }

  async function handleDrop(e) {
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('placeholder');
    const srcId = draggingId || e.dataTransfer.getData('text/plain');
    const srcEl = assignmentsList.querySelector(`.assignment-row[data-id="${srcId}"]`);
    if (!srcEl) return;
    const children = Array.from(assignmentsList.children);
    const srcIndex = children.indexOf(srcEl);
    const dstIndex = children.indexOf(target);
    if (srcIndex < dstIndex) {
      target.after(srcEl);
    } else {
      target.before(srcEl);
    }

    // cleanup
    srcEl.classList.remove('dragging');
    draggingId = null; dragSrcEl = null;

    // persist order
    await persistAssignmentOrder();
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    const rows = Array.from(assignmentsList.querySelectorAll('.assignment-row'));
    rows.forEach(r => r.classList.remove('placeholder'));
  }

  // Send new order to backend
  async function persistAssignmentOrder() {
    const ids = Array.from(assignmentsList.querySelectorAll('.assignment-row')).map(r => r.dataset.id);
    if (!ids.length) return;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/assignments/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ids })
      });
      if (!res.ok) {
        console.warn('Persist assignment order failed', res.status);
      } else {
        console.log('Assignment order saved');
      }
    } catch (err) {
      console.warn('Could not persist assignment order', err);
    }
  }

  // Render assignments
  function renderAssignments(assigns) {
    assignmentsList.innerHTML = '';
    if (!assigns.length) { 
      assignmentsList.innerHTML = '<p class="muted">No assignments yet — add one above.</p>'; 
      return; 
    }

    assigns.forEach(a => {
      const row = document.createElement('div');
      row.className = 'assignment-row';
      row.dataset.id = String(a.id);
      row.setAttribute('draggable', 'true');
      row.innerHTML = `
        <div class="assignment-meta">
          <div><strong>${escapeHtml(a.title)}</strong></div>
          <div class="muted">Weight: ${a.weight}</div>
        </div>
        <div style="display:flex;align-items:center;gap:0.6rem;">
          <div><strong>${a.mark}</strong></div>
          <div class="assignment-actions">
            <button class="small-ghost btn-edit" data-id="${a.id}">Edit</button>
            <button class="small-ghost btn-delete" data-id="${a.id}">Delete</button>
          </div>
        </div>
      `;

      // Attach drag handlers
      row.addEventListener('dragstart', handleDragStart);
      row.addEventListener('dragover', handleDragOver);
      row.addEventListener('dragleave', handleDragLeave);
      row.addEventListener('drop', handleDrop);
      row.addEventListener('dragend', handleDragEnd);

      // Edit behaviour
      row.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        currentlyEditingAssignmentId = e.currentTarget.dataset.id;
        editAssignTitle.value = a.title;
        editAssignMark.value = a.mark;
        editAssignWeight.value = a.weight;
        assignmentEditModal.classList.remove('hidden');
      });

      // Delete behaviour
      row.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        currentlyDeletingAssignmentId = e.currentTarget.dataset.id;
        openConfirm('Delete assignment', `Delete "${a.title}"?`, async () => {
          try {
            const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(currentlyDeletingAssignmentId)}`, { 
              method: 'DELETE' 
            });
            if (!res.ok) throw new Error('Delete failed');
            currentlyDeletingAssignmentId = null;
            loadCourse();
          } catch (err) {
            console.error(err);
            alert('Failed to delete assignment');
          }
        });
      });

      assignmentsList.appendChild(row);
    });
  }

  // Add assignment
  assignmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('assignTitle').value.trim();
    const mark = parseFloat(document.getElementById('assignMark').value);
    const weight = parseFloat(document.getElementById('assignWeight').value);
    if (!title) { alert('Title required'); return; }
    if (isNaN(mark) || mark < 0 || mark > 100) { alert('Mark must be 0-100'); return; }
    if (isNaN(weight) || weight < 0) { alert('Weight must be non-negative'); return; }

    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mark, weight })
      });
      const body = await (res.headers.get('content-type')?.includes('json') ? res.json() : res.text());
      if (!res.ok) {
        alert(body?.error || (body?.errors && body.errors.map(x=>x.msg).join('\\n')) || 'Error adding assignment');
        return;
      }
      assignmentForm.reset();
      loadCourse();
    } catch (err) {
      console.error(err);
      alert('Network error adding assignment');
    }
  });

  // Assignment edit cancel
  editAssignCancel.addEventListener('click', () => {
    assignmentEditModal.classList.add('hidden');
    currentlyEditingAssignmentId = null;
  });

  // Assignment edit save
  assignmentEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentlyEditingAssignmentId) return;
    const title = editAssignTitle.value.trim();
    const mark = parseFloat(editAssignMark.value);
    const weight = parseFloat(editAssignWeight.value);
    if (!title) { 
      alert('Title required'); 
      return; 
    }

    if (isNaN(mark) || mark < 0 || mark > 100) { 
      alert('Mark must be 0-100'); 
      return; 
    }

    if (isNaN(weight) || weight < 0) { 
      alert('Weight must be non-negative'); 
      return; 
    }

    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(currentlyEditingAssignmentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mark, weight })
      });
      if (!res.ok) {
        const body = await (res.headers.get('content-type')?.includes('json') ? res.json() : res.text());
        alert(body?.error || (body?.errors && body.errors.map(x=>x.msg).join('\\n')) || 'Error updating assignment');
        return;
      }
      assignmentEditModal.classList.add('hidden');
      currentlyEditingAssignmentId = null;
      loadCourse();
    } catch (err) {
      console.error(err);
      alert('Network error updating assignment');
    }
  });

  // Initial load
  loadCourse();
});