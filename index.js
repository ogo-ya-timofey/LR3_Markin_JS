// server.js
const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Простая память: сессии и балансы
const sessions = {}; // sessionId → username
const accounts = { user1: 1000, attacker: 0 };

// Парсит x‑www‑form‑urlencoded и куки
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Главная страница (вход + уязвимая форма перевода)
app.get("/", (req, res) => {
  const sessionId = req.cookies.sessionId;
  const username = sessions[sessionId];

  if (!username) {
    res.send(`
      <h1>Добро пожаловать!</h1>
      <p>Залогиньтесь для демонстрации CSRF.</p>
      <form action="/login" method="post">
        <input name="username" value="user1">
        <input type="submit" value="Войти">
      </form>
    `);
    return;
  }

  // Уязвимая форма перевода (без CSRF‑токена!)
  res.send(`
    <h1>Добро пожаловать, ${username}!</h1>
    <p>Баланс: ${accounts[username]} условных единиц</p>
    <form action="/transfer" method="post">
      <p>Уязвимая форма перевода (без CSRF‑токена):</p>
      <label>Кому:</label>
      <input name="to" value="attacker">
      <label>Сумма:</label>
      <input name="amount" value="100">
      <input type="submit" value="Перевести">
    </form>
  `);
});

// Логин и создание сессии
app.post("/login", (req, res) => {
  const username = req.body.username || "user1";

  const sessionId = `sess_${username}`;
  sessions[sessionId] = username;
  if (!accounts[username]) accounts[username] = 1000;

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    sameSite: "Lax", // пока оставим, но в демке можно убрать для наглядности
  });

  res.redirect("/");
});

// Уязвимый endpoint перевода (без проверки CSRF)
app.post("/transfer", (req, res) => {
  const sessionId = req.cookies.sessionId;
  const from = sessions[sessionId];

  if (!from) {
    return res.status(401).send("Не авторизован");
  }

  const to = req.body.to || "attacker";
  const amount = parseInt(req.body.amount) || 0;

  console.log(`Transfer: ${from} → ${to}, amount=${amount}`);

  accounts[from] = (accounts[from] || 1000) - amount;
  accounts[to] = (accounts[to] || 0) + amount;

  res.send(`
    <h3>Перевод выполнен!</h3>
    <p>${from} → ${to}, сумма: ${amount}</p>
    <p>Баланс ${from}: ${accounts[from]}</p>
    <a href="/">Назад</a>
  `);
});

app.listen(PORT, () =>
  console.log(`Сервер запущен на http://localhost:${PORT}`)
);

module.exports = app;