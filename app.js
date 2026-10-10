
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

// Firebase sozlamalari
const firebaseConfig = {
  apiKey: "AIzaSyAi-D250G8l_Bb_jPFwPyU2qGpjShR1JBw",
  authDomain: "pul-to-plash.firebaseapp.com",
  projectId: "pul-to-plash",
  storageBucket: "pul-to-plash.firebasestorage.app",
  messagingSenderId: "106295213712",
  appId: "1:106295213712:web:542d62399b7d8de149e215"
};

// Firebase faqat bir marta ishga tushiriladi
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

// Pul summasini ko‘rsatish
function money(number) {
  return new Intl.NumberFormat("uz-UZ").format(number || 0) + " so‘m";
}

// HTML ichiga chiqariladigan matnni xavfsizlantirish
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// Xabar ko‘rsatish
function showMessage(message) {
  const toast = $("#toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

// Jami balans
function balance() {
  return transactions.reduce((sum, item) => {
    return sum + (
      item.type === "income"
        ? Number(item.amount)
        : -Number(item.amount)
    );
  }, 0);
}

// Kirish va ro‘yxatdan o‘tish rejimi
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

// Ro‘yxatdan o‘tish va tizimga kirish
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
    console.error("Kirish yoki ro‘yxatdan o‘tish xatosi:", error);

    const errors = {
      "auth/email-already-in-use":
        "Bu email allaqachon ro‘yxatdan o‘tgan.",
      "auth/invalid-email":
        "Email manzilini tekshir.",
      "auth/weak-password":
        "Parol kamida 6 ta belgidan iborat bo‘lsin.",
      "auth/invalid-credential":
        "Email yoki parol noto‘g‘ri.",
      "auth/network-request-failed":
        "Internet aloqasini tekshir.",
      "auth/operation-not-allowed":
        "Firebase’da Email/Password usulini yoqish kerak.",
      "auth/too-many-requests":
        "Juda ko‘p urinish bo‘ldi. Biroz kutib qayta urin."
    };

    $("#auth-message").textContent =
      errors[error.code] || `Xatolik: ${error.code || error.message}`;
  } finally {
    button.disabled = false;
  }
});

// Foydalanuvchi holatini tekshirish
onAuthStateChanged(auth, async currentUser => {
  if (stopProfile) stopProfile();
  if (stopMoney) stopMoney();
  if (stopTasks) stopTasks();

  stopProfile = null;
  stopMoney = null;
  stopTasks = null;

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
    day: "numeric",
    month: "long",
    weekday: "long"
  }).format(new Date());

  try {
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

    // Maqsad ma’lumotlarini kuzatish
    stopProfile = onSnapshot(
      profileRef,
      snapshot => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        goal = {
          name: data.goalName || "",
          amount: Number(data.goalAmount) || 0
        };

        render();
      },
      error => {
        console.error("Profilni o‘qish xatosi:", error);
        showMessage("Profilni yuklab bo‘lmadi.");
      }
    );

    // Pul harakatlarini kuzatish
    stopMoney = onSnapshot(
      query(
        collection(db, "users", user.uid, "transactions"),
        orderBy("createdAt", "desc")
      ),
      snapshot => {
        transactions = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        render();
      },
      error => {
        console.error("Pul tarixini yuklash xatosi:", error);
        showMessage("Pul tarixini yuklab bo‘lmadi.");
      }
    );

    // Kunlik vazifalarni kuzatish
    stopTasks = onSnapshot(
      query(
        collection(db, "users", user.uid, "tasks"),
        orderBy("createdAt", "desc")
      ),
      snapshot => {
        tasks = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        renderTasks();
      },
      error => {
        console.error("Vazifalarni yuklash xatosi:", error);
        showMessage("Vazifalarni yuklab bo‘lmadi.");
      }
    );
  } catch (error) {
    console.error("Foydalanuvchi ma’lumotlarini yuklash xatosi:", error);
    showMessage("Ma’lumotlarni yuklab bo‘lmadi. Firebase sozlamalarini tekshir.");
  }
});

// Hisobdan chiqish
$("#logout").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Hisobdan chiqish xatosi:", error);
    showMessage("Hisobdan chiqib bo‘lmadi.");
  }
});

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
  } catch (error) {
    console.error("Maqsadni saqlash xatosi:", error);
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
    await addDoc(
      collection(db, "users", user.uid, "transactions"),
      {
        type,
        amount,
        note,
        createdAt: serverTimestamp()
      }
    );

    $("#money-amount").value = "";
    $("#money-note").value = "";

    showMessage(
      type === "income"
        ? "Pul qo‘shildi! 💰"
        : "Xarajat yozildi."
    );
  } catch (error) {
    console.error("Pul harakatini saqlash xatosi:", error);
    showMessage("Pul harakatini saqlab bo‘lmadi.");
  }
});

// Kunlik vazifa qo‘shish
$("#task-form").addEventListener("submit", async event => {
  event.preventDefault();

  if (!user) return;

  const title = $("#task-input").value.trim();

  if (!title) {
    showMessage("Vazifa nomini yoz.");
    return;
  }

  try {
    await addDoc(
      collection(db, "users", user.uid, "tasks"),
      {
        title,
        done: false,
        createdAt: serverTimestamp()
      }
    );

    $("#task-input").value = "";
    showMessage("Vazifa qo‘shildi! ✅");
  } catch (error) {
    console.error("Vazifani saqlash xatosi:", error);
    showMessage("Vazifa saqlanmadi.");
  }
});

// Maqsad, balans va pul tarixini chiqarish
function render() {
  const total = balance();
  const target = goal.amount;

  const percent = target > 0
    ? Math.min(100, Math.round(total / target * 100))
    : 0;

  $("#balance").textContent = money(total);
  $("#goal-total").textContent = money(target);
  $("#remaining").textContent = money(Math.max(0, target - total));

  // Saqlangan maqsadni inputlarga chiqarish
  $("#goal-name").value = goal.name;
  $("#goal-amount").value = target || "";

  $("#percent").textContent = percent + "% bajarildi";
  $("#progress-text").textContent =
    money(total) + " / " + money(target);

  $("#progress-bar").style.width = percent + "%";

  const history = $("#history");

  history.innerHTML = "";

  $("#no-history").classList.toggle(
    "hidden",
    transactions.length > 0
  );

  transactions.slice(0, 30).forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    const note = item.note ||
      (item.type === "income" ? "Pul qo‘shildi" : "Xarajat");

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
      </strong>
    `;

    history.appendChild(row);
  });
}

// Vazifalarni ekranga chiqarish
function renderTasks() {
  const list = $("#task-list");

  list.innerHTML = "";

  $("#no-tasks").classList.toggle(
    "hidden",
    tasks.length > 0
  );

  tasks.forEach(task => {
    const row = document.createElement("div");

    row.className =
      "task-item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);
    checkbox.setAttribute("aria-label", "Vazifa bajarildi");

    checkbox.addEventListener("change", async () => {
      if (!user) return;

      try {
        await updateDoc(
          doc(db, "users", user.uid, "tasks", task.id),
          { done: checkbox.checked }
        );
      } catch (error) {
        console.error("Vazifani yangilash xatosi:", error);
        showMessage("Vazifani yangilab bo‘lmadi.");
      }
    });

    const text = document.createElement("span");
    text.textContent = task.title;

    const remove = document.createElement("button");

    remove.className = "delete";
    remove.textContent = "×";
    remove.title = "Vazifani o‘chirish";
    remove.setAttribute("aria-label", "Vazifani o‘chirish");

    remove.addEventListener("click", async () => {
      if (!user) return;

      try {
        await deleteDoc(
          doc(db, "users", user.uid, "tasks", task.id)
        );

        showMessage("Vazifa o‘chirildi.");
      } catch (error) {
        console.error("Vazifani o‘chirish xatosi:", error);
        showMessage("Vazifani o‘chirib bo‘lmadi.");
      }
    });

    row.append(checkbox, text, remove);
    list.appendChild(row);
  });
}
