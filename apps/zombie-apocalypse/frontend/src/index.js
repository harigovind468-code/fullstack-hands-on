import http from "node:http";

const PORT = process.env.PORT || 5173;
const BACKEND_URL =
  process.env.BACKEND_URL || "http://host.docker.internal:8001";

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Zombie Apocalypse</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #050505;
  color: white;
  font-family: Arial, sans-serif;
}

.game {
  max-width: 1100px;
  margin: auto;
  padding: 20px;
}

.title {
  text-align: center;
  font-size: 44px;
  font-weight: 900;
  color: #76ff03;
  text-shadow: 0 0 18px #76ff03;
  margin-bottom: 20px;
}

.hud {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.stat {
  background: #171717;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.stat span {
  display: block;
  font-size: 26px;
  font-weight: bold;
  margin-top: 5px;
}

.health span {
  color: #00e676;
}

.ammo span {
  color: #40c4ff;
}

.zombies span {
  color: #ff1744;
}

.score span {
  color: #ffd740;
}

.arena {
  position: relative;
  height: 500px;
  overflow: hidden;
  border: 2px solid #444;
  border-radius: 18px;

  background:
    radial-gradient(circle, #39434a 1px, transparent 1px),
    linear-gradient(#202525, #080909);

  background-size: 30px 30px, auto;
}

.player {
  position: absolute;
  left: 50%;
  bottom: 25px;
  transform: translateX(-50%);
  font-size: 75px;
  z-index: 5;
  transition: left .1s linear;
}

.zombie {
  position: absolute;
  font-size: 55px;
  z-index: 4;
  cursor: crosshair;
  transition: left .25s linear, top .25s linear;
  filter: drop-shadow(0 0 7px #ff1744);
}

.zombie.hit {
  animation: hit .2s;
}

@keyframes hit {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.5);
    filter: brightness(3);
  }

  100% {
    transform: scale(0);
  }
}

.bullet {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 12px #fff;
  z-index: 10;
}

.controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

button {
  border: none;
  border-radius: 10px;
  padding: 15px 25px;
  font-size: 17px;
  font-weight: bold;
  color: white;
  cursor: pointer;
}

button:hover {
  transform: scale(1.05);
}

.start {
  background: #00c853;
}

.shoot {
  background: #2979ff;
}

.attack {
  background: #d50000;
}

.message {
  margin-top: 18px;
  padding: 16px;
  text-align: center;
  background: #171717;
  border: 1px solid #444;
  border-radius: 10px;
  font-size: 19px;
  min-height: 55px;
}

.game-over {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(0,0,0,.78);
  z-index: 20;
}

.game-over h2 {
  font-size: 50px;
  color: #76ff03;
  text-shadow: 0 0 20px #76ff03;
}

.game-over.show {
  display: flex;
}

@media(max-width:700px) {

  .title {
    font-size: 30px;
  }

  .hud {
    grid-template-columns: repeat(2, 1fr);
  }

  .arena {
    height: 420px;
  }

}

</style>
</head>

<body>

<div class="game">

  <div class="title">
    🧟 ZOMBIE APOCALYPSE
  </div>

  <div class="hud">

    <div class="stat health">
      ❤️ HEALTH
      <span id="health">100</span>
    </div>

    <div class="stat ammo">
      🔫 AMMO
      <span id="ammo">10</span>
    </div>

    <div class="stat zombies">
      🧟 ZOMBIES
      <span id="zombies">5</span>
    </div>

    <div class="stat score">
      🏆 SCORE
      <span id="score">0</span>
    </div>

  </div>

  <div class="arena" id="arena">

    <div class="player" id="player">
      🧍🔫
    </div>

    <div class="game-over" id="gameOver">
      <h2 id="result">YOU WIN!</h2>
      <button class="start" onclick="startGame()">
        🔄 PLAY AGAIN
      </button>
    </div>

  </div>

  <div class="controls">

    <button class="start" onclick="startGame()">
      🎮 START GAME
    </button>

    <button class="shoot" onclick="shoot()">
      🔫 SHOOT
    </button>

    <button class="attack" onclick="attack()">
      🧟 ZOMBIE ATTACK
    </button>

  </div>

  <div class="message" id="message">
    Press START GAME to begin...
  </div>

</div>

<script>

let zombies = [];
let gameRunning = false;
let movementTimer = null;

const arena = document.getElementById("arena");


async function api(path, method = "GET") {

  try {

    const response = await fetch("/api" + path, {
      method
    });

    const data = await response.json();

    updateGame(data);

    return data;

  } catch (error) {

    document.getElementById("message").textContent =
      "❌ Backend connection failed";

  }

}


function updateGame(data) {

  if (data.health !== undefined)
    document.getElementById("health").textContent = data.health;

  if (data.ammo !== undefined)
    document.getElementById("ammo").textContent = data.ammo;

  if (data.zombies !== undefined)
    document.getElementById("zombies").textContent = data.zombies;

  if (data.score !== undefined)
    document.getElementById("score").textContent = data.score;

  if (data.message)
    document.getElementById("message").textContent = data.message;

}


function createZombies(count = 5) {

  zombies.forEach(z => z.element.remove());

  zombies = [];

  for (let i = 0; i < count; i++) {

    const zombie = document.createElement("div");

    zombie.className = "zombie";
    zombie.textContent = "🧟";

    const x = 50 + (Math.random() * 40 - 20);
    const y = 30 + Math.random() * 180;

    zombie.style.left = x + "%";
    zombie.style.top = y + "px";

    arena.appendChild(zombie);

    zombies.push({
      element: zombie,
      alive: true
    });

  }

}


function moveZombies() {

  if (!gameRunning)
    return;

  zombies.forEach(z => {

    if (!z.alive)
      return;

    const currentLeft =
      parseFloat(z.element.style.left);

    const currentTop =
      parseFloat(z.element.style.top);

    const newLeft =
      currentLeft + (50 - currentLeft) * 0.04;

    const newTop =
      currentTop + (390 - currentTop) * 0.035;

    z.element.style.left =
      Math.max(5, Math.min(90, newLeft)) + "%";

    z.element.style.top =
      Math.min(390, newTop) + "px";

  });

}


function startMovement() {

  clearInterval(movementTimer);

  movementTimer =
    setInterval(moveZombies, 150);

}


async function startGame() {

  const data =
    await api("/game/start", "POST");

  if (!data)
    return;

  gameRunning = true;

  document
    .getElementById("gameOver")
    .classList.remove("show");

  createZombies(data.zombies || 5);

  startMovement();

  document.getElementById("message").textContent =
    "🔥 Survive the apocalypse!";

}


async function shoot() {

  if (!gameRunning)
    return;

  const target =
    zombies.find(z => z.alive);

  if (!target) {
    return;
  }

  const data =
    await api("/game/shoot", "POST");

  if (!data)
    return;

  if (
    data.message &&
    (
      data.message.includes("eliminated") ||
      data.zombies < zombies.filter(z => z.alive).length
    )
  ) {

    target.alive = false;

    target.element.classList.add("hit");

    setTimeout(() => {

      target.element.remove();

    }, 200);

  }

  if (data.zombies === 0) {

    gameRunning = false;

    clearInterval(movementTimer);

    document.getElementById("result").textContent =
      "🏆 YOU WIN!";

    document
      .getElementById("gameOver")
      .classList.add("show");

  }

}


async function attack() {

  if (!gameRunning)
    return;

  const data =
    await api("/game/attack", "POST");

  if (!data)
    return;

  if (data.game_over) {

    gameRunning = false;

    clearInterval(movementTimer);

    document.getElementById("result").textContent =
      "💀 GAME OVER";

    document
      .getElementById("gameOver")
      .classList.add("show");

  }

}


document.addEventListener("keydown", event => {

  if (event.code === "Space") {

    event.preventDefault();

    shoot();

  }

});


api("/game");

</script>

</body>
</html>
`;

const server = http.createServer(async (req, res) => {

  if (req.url === "/" && req.method === "GET") {

    res.writeHead(200, {
      "Content-Type": "text/html"
    });

    res.end(html);

    return;
  }


  if (req.url.startsWith("/api/")) {

    const target =
      BACKEND_URL + req.url.substring(4);

    try {

      const response = await fetch(target, {
        method: req.method
      });

      const body =
        await response.text();

      res.writeHead(response.status, {
        "Content-Type": "application/json"
      });

      res.end(body);

    } catch (error) {

      res.writeHead(502, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        error: "Backend unavailable"
      }));

    }

    return;
  }


  res.writeHead(404);

  res.end("Not found");

});


server.listen(PORT, "0.0.0.0", () => {

console.log(`Zombie frontend running on port ${PORT}`);
});
