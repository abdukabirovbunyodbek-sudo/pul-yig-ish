
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

function showMessage(text) {
    message.textContent = text;
}

function showTelegramHelp() {
    message.replaceChildren();

    const text = document.createElement("p");
    text.textContent =
        "3 ta noto‘g‘ri urinish amalga oshirildi. Yordam uchun:";

    const link = document.createElement("a");
    link.href = telegramLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Telegram orqali yordam olish";

    message.append(text, link);
}

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (loginAttempts >= 3) {
        showTelegramHelp();
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginButton.disabled = true;
    loginButton.textContent = "Tekshirilmoqda...";

    try {
        await signInWithEmailAndPassword(auth, email, password);

        loginAttempts = 0;
        showMessage("Hisobingizga muvaffaqiyatli kirdingiz! 🎉");

    } catch (error) {
        loginAttempts++;

        if (loginAttempts >= 3) {
            showTelegramHelp();
        } else {
            showMessage(
                `Email yoki parol noto‘g‘ri. Urinish: ${loginAttempts}/3`
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
        showMessage("Avval email va parolingizni kiriting.");
        return;
    }

    if (password.length < 6) {
        showMessage("Parol kamida 6 ta belgidan iborat bo‘lishi kerak.");
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Hisob yaratilmoqda...";

    try {
        await createUserWithEmailAndPassword(auth, email, password);

        showMessage("Hisobingiz muvaffaqiyatli yaratildi! 🎉");

    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            showMessage("Bu email bilan hisob allaqachon mavjud.");
        } else if (error.code === "auth/invalid-email") {
            showMessage("Email manzilingizni tekshiring.");
        } else {
            showMessage("Hisob yaratilmadi. Qayta urinib ko‘ring.");
        }
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Yangi hisob yaratish";
    }
});

resetPassword.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showMessage("Avval email manzilingizni kiriting.");
        emailInput.focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);

        showMessage(
            "Parolni tiklash bo‘yicha ko‘rsatma emailingizga yuborildi."
        );
    } catch (error) {
        showMessage(
            "Emailni tekshiring yoki keyinroq qayta urinib ko‘ring."
        );
    }
});
