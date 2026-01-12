const client = document.getElementById("client");
const equipment = document.getElementById("equipment");
const locationField = document.getElementById("location");
const dateField = document.getElementById("date");
const diagnosis = document.getElementById("diagnosis");
const solution = document.getElementById("solution");
const list = document.getElementById("list");
const search = document.getElementById("search");

const KEY = "oasis_diagnostics";

dateField.valueAsDate = new Date();

function load(){
  const data = JSON.parse(localStorage.getItem(KEY) || "[]");
  render(data);
}

function save(){
  const data = JSON.parse(localStorage.getItem(KEY) || "[]");

  data.unshift({
    id: Date.now(),
    client: client.value,
    equipment: equipment.value,
    location: locationField.value,
    date: dateField.value,
    diagnosis: diagnosis.value,
    solution: solution.value
  });

  localStorage.setItem(KEY, JSON.stringify(data));
  clearForm();
  render(data);
}

function clearForm(){
  client.value = "";
  equipment.value = "";
  locationField.value = "";
  diagnosis.value = "";
  solution.value = "";
}

function render(data){
  list.innerHTML = "";
  data.forEach(d=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${d.client}</strong>
      <span>${d.equipment} · ${d.location}</span>
      <p>${d.diagnosis}</p>
    `;
    list.appendChild(div);
  });
}

document.getElementById("save").onclick = save;

search.oninput = () => {
  const q = search.value.toLowerCase();
  const data = JSON.parse(localStorage.getItem(KEY) || "[]");
  render(data.filter(d =>
    d.client.toLowerCase().includes(q) ||
    d.equipment.toLowerCase().includes(q)
  ));
};

load();
