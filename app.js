
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase Console'dan olingan ma'lumotlarni shu yerga yozasan.
const firebaseConfig = {
  apiKey: "BU_YERGA_API_KEY",
  authDomain: "LOYIHA_ID.firebaseapp.com",
  projectId: "LOYIHA_ID",
  storageBucket: "LOYIHA_ID.firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = selector => document.querySelector(selector);

let user = null;
let goal = { name: "", amount: 0 };
let transactions = [];
let tasks = [];
let stopProfile = null;
let stopMoney = null;
let stopTasks = null;
let mode = "login";

function money(number) {
  return new Intl.NumberFormat("uz-UZ").format(number || 0) + " so‘m";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function showMessage(message) {
  $("#toast").textContent = message;
  $("#toast").classList.remove("hidden");
  setTimeout(() => $("#toast").classList.add("hidden"), 2500);
}

function balance() {
  return transactions.reduce((sum, item) => {
    return sum + (item.type === "income" ? item.amount : -item.amount);
  }, 0);
}

// Kirish va ro‘yxatdan o‘tish rejimini almashtirish
function setMode(newMode) {
  mode = newMode;
  $("#login-tab").classList.toggle("active", mode === "login");
  $("#signup-tab").classList.toggle("active", mode === "signup");
  $("#auth-title").textContent =
    mode === "login" ? "Xush kelibsan!" : "Yangi hisob yarat";
  $("#auth-submit").textContent =
    mode === "login" ? "Kirish" : "Ro‘yxatdan o‘tish";
  $("#auth-message").textContent = "";
}

$("#login-tab").addEventListener("click", () => setMode("login"));
$("#signup-tab").addEventListener("click", () => setMode("signup"));

$("#auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const button = $("#auth-submit");

  button.disabled = true;
  $("#auth-message").textContent = "";

  try {
    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    const errors = {
      "auth/email-already-in-use": "Bu email allaqachon ro‘yxatdan o‘tgan.",
      "auth/invalid-email": "Email manzilini tekshir.",
      "auth/weak-password": "Parol kamida 6 ta belgidan iborat bo‘lsin.",
      "auth/invalid-credential": "Email yoki parol noto‘g‘ri.",
      "auth/network-request-failed": "Internet aloqasini tekshir."
    };
    $("#auth-message").textContent =
      errors[error.code] || "Xatolik yuz berdi. Firebase sozlamalarini tekshir.";
  } finally {
    button.disabled = false;
  }
});

// Foydalanuvchi kirganda faqat uning ma’lumotlarini yuklash
onAuthStateChanged(auth, async currentUser => {
  if (stopProfile) stopProfile();
  if (stopMoney) stopMoney();
  if (stopTasks) stopTasks();

  user = currentUser;
  transactions = [];
  tasks = [];
  goal = { name: "", amount: 0 };

  if (!user) {
    $("#auth-page").classList.remove("hidden");
    $("#dashboard").classList.add("hidden");
    $("#user-area").classList.add("hidden");
    return;
  }

  $("#auth-page").classList.add("hidden");
  $("#dashboard").classList.remove("hidden");
  $("#user-area").classList.remove("hidden");
  $("#user-email").textContent = user.email || "";
  $("#today").textContent = new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric", month: "long", weekday: "long"
  }).format(new Date());

  const profileRef = doc(db, "users", user.uid);
  const profile = await getDoc(profileRef);

  if (!profile.exists()) {
    await setDoc(profileRef, {
      email: user.email,
      goalName: "",
      goalAmount: 0,
      createdAt: serverTimestamp()
    });
  }

  stopProfile = onSnapshot(profileRef, snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    goal = {
      name: data.goalName || "",
      amount: Number(data.goalAmount) || 0
    };
    render();
  });

  stopMoney = onSnapshot(
    query(collection(db, "users", user.uid, "transactions"),
      orderBy("createdAt", "desc")),
    snapshot => {
      transactions = snapshot.docs.map(item => ({
        id: item.id, ...item.data()
      }));
      render();
    }
  );

  stopTasks = onSnapshot(
    query(collection(db, "users", user.uid, "tasks"),
      orderBy("createdAt", "desc")),
    snapshot => {
      tasks = snapshot.docs.map(item => ({
        id: item.id, ...item.data()
      }));
      renderTasks();
    }
  );
});

$("#logout").addEventListener("click", () => signOut(auth));

// Maqsadni saqlash
$("#goal-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!user) return;

  const name = $("#goal-name").value.trim();
  const amount = Number($("#goal-amount").value);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    showMessage("Maqsad nomi va summasini to‘g‘ri kiriting.");
    return;
  }

  try {
    await updateDoc(doc(db, "users", user.uid), {
      goalName: name,
      goalAmount: amount
    });
    showMessage("Maqsading saqlandi! 🎯");
  } catch {
    showMessage("Maqsadni saqlab bo‘lmadi.");
  }
});

// Pul qo‘shish yoki xarajat yozish
$("#money-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!user) return;

  const type = $("#money-type").value;
  const amount = Number($("#money-amount").value);
  const note = $("#money-note").value.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    showMessage("Summani to‘g‘ri kiriting.");
    return;
  }

  if (type === "expense" && amount > balance()) {
    showMessage("Xarajat jamg‘armangdan ko‘p bo‘lishi mumkin emas.");
    return;
  }

  try {
    await addDoc(collection(db, "users", user.uid, "transactions"), {
      type,
      amount,
      note,
      createdAt: serverTimestamp()
    });
    $("#money-amount").value = "";
    $("#money-note").value = "";
    showMessage(type === "income" ? "Pul qo‘shildi! 💰" : "Xarajat yozildi.");
  } catch {
    showMessage("Pul harakatini saqlab bo‘lmadi.");
  }
});

// Kunlik vazifa qo‘shish
$("#task-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!user) return;

  const title = $("#task-input").value.trim();
  if (!title) return;

  try {
    await addDoc(collection(db, "users", user.uid, "tasks"), {
      title,
      done: false,
      createdAt: serverTimestamp()
    });
    $("#task-input").value = "";
    showMessage("Vazifa qo‘shildi! ✅");
  } catch {
    showMessage("Vazifa saqlanmadi.");
  }
});

// Maqsad, summa va tarixni ekranga chiqarish
function render() {
  const total = balance();
  const target = goal.amount;
  const percent = target > 0
    ? Math.min(100, Math.round(total / target * 100))
    : 0;

  $("#balance").textContent = money(total);
  $("#goal-total").textContent = money(target);
  $("#remaining").textContent = money(Math.max(0, target - total));
  $("#goal-name").value = goal.name;
  $("#goal-amount").value = target || "";
  $("#percent").textContent = percent + "% bajarildi";
  $("#progress-text").textContent = money(total) + " / " + money(target);
  $("#progress-bar").style.width = percent + "%";

  const history = $("#history");
  history.innerHTML = "";
  $("#no-history").classList.toggle("hidden", transactions.length > 0);

  transactions.slice(0, 30).forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const note = item.note || (item.type === "income" ? "Pul qo‘shildi" : "Xarajat");
    const date = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString("uz-UZ")
      : "Yangi yozuv";

    row.innerHTML = `
      <div class="history-note">
        ${escapeHTML(note)}
        <small>${escapeHTML(date)}</small>
      </div>
      <strong class="${item.type === "income" ? "income" : "expense"}">
        ${item.type === "income" ? "+" : "−"}${escapeHTML(money(item.amount))}
      </strong>`;
    history.appendChild(row);
  });
}

// Vazifalarni chiqarish
function renderTasks() {
  const list = $("#task-list");
  list.innerHTML = "";
  $("#no-tasks").classList.toggle("hidden", tasks.length > 0);

  tasks.forEach(task => {
    const row = document.createElement("div");
    row.className = "task-item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);

    checkbox.addEventListener("change", async () => {
      try {
        await updateDoc(doc(db, "users", user.uid, "tasks", task.id), {
          done: checkbox.checked
        });
      } catch {
        showMessage("Vazifani yangilab bo‘lmadi.");
      }
    });

    const text = document.createElement("span");
    text.textContent = task.title;

    const remove = document.createElement("button");
    remove.className = "delete";
    remove.textContent = "×";
    remove.title = "Vazifani o‘chirish";

    remove.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "users", user.uid, "tasks", task.id));
        showMessage("Vazifa o‘chirildi.");
      } catch {
        showMessage("Vazifani o‘chirib bo‘lmadi.");
      }
    });

    row.append(checkbox, text, remove);
    list.appendChild(row);
  });
}
