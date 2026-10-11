const elForm = document.querySelector("#goal-form");
const elName = document.querySelector("#goal-name");
const elTarget = document.querySelector("#goal-target");
const elGoalsList = document.querySelector("#goals-list");
const elTotalSaved = document.querySelector("#total-saved");
const elGoalCount = document.querySelector("#goal-count");
const elGoalsLabel = document.querySelector("#goals-label");
const elMessage = document.querySelector("#message");

let goals = [];

try {
    goals = JSON.parse(localStorage.getItem("pulGoals")) || [];
} catch {
    goals = [];
}

function saveGoals() {
    localStorage.setItem("pulGoals", JSON.stringify(goals));
}

function formatMoney(amount) {
    return Number(amount).toLocaleString("uz-UZ") + " so‘m";
}

function showMessage(text) {
    elMessage.textContent = text;
}

function renderGoals() {
    elGoalsList.replaceChildren();

    const totalSaved = goals.reduce(
        (sum, goal) => sum + goal.saved,
        0
    );

    elTotalSaved.textContent = formatMoney(totalSaved);
    elGoalCount.textContent = goals.length + " ta";
    elGoalsLabel.textContent = goals.length + " ta maqsad";

    if (goals.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent =
            "Hali maqsad qo‘shilmadi. Birinchi maqsadingni yarat! 🎯";

        elGoalsList.append(empty);
        return;
    }

    goals.forEach(function (goal) {
        const card = document.createElement("div");
        card.className = "goal-card";

        const top = document.createElement("div");
        top.className = "goal-top";

        const title = document.createElement("h4");
        title.textContent = goal.name;

        const percent = document.createElement("span");
        percent.className = "goal-percent";

        const progress = Math.min(
            100,
            Math.floor((goal.saved / goal.target) * 100)
        );

        percent.textContent = progress + "%";

        top.append(title, percent);

        const amounts = document.createElement("div");
        amounts.className = "goal-amounts";

        const savedText = document.createElement("span");
        savedText.textContent = "Yig‘ildi: ";

        const savedStrong = document.createElement("strong");
        savedStrong.textContent = formatMoney(goal.saved);
        savedText.append(savedStrong);

        const targetText = document.createElement("span");
        targetText.textContent = "Maqsad: " + formatMoney(goal.target);

        amounts.append(savedText, targetText);

        const track = document.createElement("div");
        track.className = "progress-track";

        const bar = document.createElement("div");
        bar.className = "progress-bar";
        bar.style.width = progress + "%";

        track.append(bar);

        const actions = document.createElement("div");
        actions.className = "goal-actions";

        const moneyInput = document.createElement("input");
        moneyInput.type = "number";
        moneyInput.min = "1";
        moneyInput.step = "1";
        moneyInput.placeholder = "Qo‘shiladigan pul";
        moneyInput.setAttribute("aria-label", goal.name + " uchun pul");

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "add-money-button";
        addButton.textContent = "+ Pul qo‘shish";

        addButton.addEventListener("click", function () {
            const amount = Number(moneyInput.value);

            if (!Number.isSafeInteger(amount) || amount <= 0) {
                showMessage("Iltimos, to‘g‘ri summa kiriting.");
                return;
            }

            if (!Number.isSafeInteger(goal.saved + amount)) {
                showMessage("Bu summa juda katta.");
                return;
            }

            goal.saved += amount;
            saveGoals();
            renderGoals();

            showMessage("Pul muvaffaqiyatli qo‘shildi! 💰");
        });

        actions.append(moneyInput, addButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Maqsadni o‘chirish";

        deleteButton.addEventListener("click", function () {
            const confirmed = confirm(
                "Ushbu maqsadni o‘chirmoqchimisiz?"
            );

            if (!confirmed) return;

            goals = goals.filter(function (item) {
                return item.id !== goal.id;
            });

            saveGoals();
            renderGoals();
            showMessage("Maqsad o‘chirildi.");
        });

        card.append(top, amounts, track, actions, deleteButton);
        elGoalsList.append(card);
    });
}

elForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = elName.value.trim();
    const target = Number(elTarget.value);

    if (!name) {
        showMessage("Maqsad nomini kiriting.");
        return;
    }

    if (!Number.isSafeInteger(target) || target <= 0) {
        showMessage("Kerakli summani to‘g‘ri kiriting.");
        return;
    }

    goals.push({
        id: Date.now() + Math.random(),
        name: name,
        target: target,
        saved: 0
    });

    saveGoals();
    renderGoals();

    elForm.reset();
    showMessage("Yangi maqsad qo‘shildi! 🎉");
});

renderGoals();