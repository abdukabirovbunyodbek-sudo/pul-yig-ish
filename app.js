
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAi-D250G8L_Bb_jPFyWoU2qGpjShR1JBw",
    authDomain: "pul-to-plash.firebaseapp.com",
    projectId: "pul-to-plash",
    storageBucket: "pul-to-plash.firebasestorage.app",
    messagingSenderId: "106295213712",
    appId: "1:106295213712:web:542d62399b7d8de149e215"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#auth-message");
const loginButton = document.querySelector("#login-button");
const registerButton = document.querySelector("#register-button");
const resetPassword = document.querySelector("#reset-password");

const telegramLink = "https://t.me/abdukabirov_08";

let loginAttempts = 0;

function showError(text) {
    message.textContent = text;
}

function showTelegramHelp() {
    message.textContent = "";

    const text = document.createElement("p");
    text.textContent =
        "3 marta noto‘g‘ri urinish bo‘ldi. Yordam olish uchun:";

    const link = document.createElement("a");
    link.href = telegramLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Telegram orqali yordam olish";

    message.append(text, link);
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (loginAttempts >= 3) {
        showTelegramHelp();
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Tekshirilmoqda...";

    try {
        await signInWithEmailAndPassword(auth, email, password);

        loginAttempts = 0;
        showError("Muvaffaqiyatli kirding! 🎉");

        // Saytingdagi asosiy sahifa kodini shu yerga ulash kerak.
        // Agar mavjud loyihangda ekranlarni almashtirish kodi bo‘lsa,
        // uni shu yerda chaqir.
    } catch (error) {
        loginAttempts++;

        if (loginAttempts >= 3) {
            showTelegramHelp();
        } else {
            showError(
                `Email yoki parol xato. Urinish: ${loginAttempts}/3`
            );
        }
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Hisobga kirish";
    }
});

registerButton.addEventListener("click", async function () {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("Avval email va parolingni kirit.");
        return;
    }

    if (password.length < 6) {
        showError("Parol kamida 6 ta belgidan iborat bo‘lsin.");
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showError("Hisob muvaffaqiyatli yaratildi! 🎉");
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            showError("Bu email bilan hisob avval yaratilgan.");
        } else {
            showError("Hisob yaratilmadi. Ma’lumotlarni tekshir.");
        }
    }
});

resetPassword.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showError("Parolni tiklash uchun avval emailingni yoz.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showError("Parolni tiklash havolasi emailingga yuborildi.");
    } catch (error) {
        showError("Emailni tekshir yoki keyinroq qayta urinib ko‘r.");
    }
});
