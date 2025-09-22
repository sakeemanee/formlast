const PENDING_KEY = 'userDetails';
const ACCEPTED_KEY = 'accepted-form';
const REJECTED_KEY = 'rejected-form';

let allUserData = JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
const signupForm = document.getElementById('signupForm');
const dataBody = document.getElementById('dataBody');
const totalForm = document.getElementById('totalForm');

function savePending() {
  localStorage.setItem(PENDING_KEY, JSON.stringify(allUserData));
  updateTotal();
}
function updateTotal() {
  totalForm.textContent = 'Total Admission Forms ' + allUserData.length;
}

// Helper to get next serial id from db.json
async function getNextId(endpoint) {
  const res = await fetch(`http://localhost:3001/${endpoint}`);
  const data = await res.json();
  if (!Array.isArray(data)) return 1;
  const ids = data.map(item => item.id).filter(id => typeof id === 'number');
  return ids.length ? Math.max(...ids) + 1 : 1;
}

// Save to db.json
async function saveToDbJson(endpoint, user) {
  await fetch(`http://localhost:3001/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
}

function addData(key, value) {
  const list = JSON.parse(localStorage.getItem(key)) || [];
  list.push(JSON.parse(JSON.stringify(value)));
  localStorage.setItem(key, JSON.stringify(list));
}

function displayData() {
  dataBody.innerHTML = '';
  allUserData.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.email}</td>
      <td>${item.mobile}</td>
      <td>${item.course}</td>
      <td>${item.status}</td>
      <td>
        <button type="button" class="btn-accept" data-index="${index}">Accept</button>
        <button type="button" class="btn-reject" data-index="${index}">Reject</button>
        <button type="button" class="btn-edit" data-index="${index}">Edit</button>
        <button type="button" class="btn-delete" data-index="${index}">Delete</button>
      </td>
    `;
    dataBody.appendChild(tr);
  });
  updateTotal();
}

// Edit functionality
let editIndex = null;

dataBody.addEventListener('click', async function(e) {
  const target = e.target;
  const index = Number(target.dataset.index);

  if (target.classList.contains('btn-edit')) {
    editIndex = index;
    const user = allUserData[editIndex];
    if (!user) return;
    document.getElementById('name').value = user.name;
    document.getElementById('email').value = user.email;
    document.getElementById('mobile').value = user.mobile;
    document.getElementById('course').value = user.course;
    signupForm.scrollIntoView({ behavior: 'smooth' });
  }

  if (target.classList.contains('btn-accept')) {
    const user = allUserData[index];
    if (!user) return;
    user.status = 'Accepted';
    const id = await getNextId('accepted');
    const acceptedUser = { ...user, id };
    addData(ACCEPTED_KEY, acceptedUser);
    allUserData.splice(index, 1);
    savePending();
    displayData();
    alert(`${user.name} has been accepted!`);
    await saveToDbJson('accepted', acceptedUser);
    return;
  }

  if (target.classList.contains('btn-reject')) {
    const user = allUserData[index];
    if (!user) return;
    user.status = 'Rejected';
    const id = await getNextId('rejected');
    const rejectedUser = { ...user, id };
    addData(REJECTED_KEY, rejectedUser);
    allUserData.splice(index, 1);
    savePending();
    displayData();
    alert(`${user.name} has been rejected!`);
    await saveToDbJson('rejected', rejectedUser);
    return;
  }

  if (target.classList.contains('btn-delete')) {
    if (!confirm('Delete this pending entry?')) return;
    const user = allUserData[index];
    allUserData.splice(index, 1);
    savePending();
    displayData();
    alert(`${user?.name || 'Entry'} deleted successfully!`);
    return;
  }
});

signupForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const course = document.getElementById('course').value;
  if (!name || !email || !mobile || !course) return alert('Please fill all fields.');

  if (editIndex !== null) {
    // Edit mode: update existing entry and preserve id/status
    const oldUser = allUserData[editIndex];
    const updatedUser = {
      ...oldUser,
      name,
      email,
      mobile,
      course
    };
    allUserData[editIndex] = updatedUser;
    savePending();
    displayData();
    alert('Form updated successfully!');

    // PATCH to db.json (JSON Server)
    try {
      await fetch(`http://localhost:3001/pending/${updatedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
    } catch (err) {
      console.error('Failed to update db.json', err);
    }

    editIndex = null;
  } else {
    // Add new entry
    const id = await getNextId('pending');
    const user = { id, name, email, mobile, course, status: 'Pending' };
    allUserData.push(user);
    savePending();
    displayData();
    alert('Form submitted successfully!');
    await saveToDbJson('pending', user);
  }
  e.target.reset();
});

// initial render
displayData();