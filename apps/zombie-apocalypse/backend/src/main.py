from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI(title="Zombie Apocalypse Game API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

game = {
    "health": 100,
    "ammo": 10,
    "score": 0,
    "zombies": 5,
    "game_over": False
}


@app.get("/")
def root():
    return {
        "game": "Zombie Apocalypse",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/game")
def get_game():
    return game


@app.post("/game/start")
def start_game():
    game.update({
        "health": 100,
        "ammo": 10,
        "score": 0,
        "zombies": 5,
        "game_over": False
    })
    return game


@app.post("/game/shoot")
def shoot():
    if game["game_over"]:
        return {"message": "Game over", **game}

    if game["ammo"] <= 0:
        return {"message": "Out of ammo", **game}

    game["ammo"] -= 1

    if game["zombies"] > 0 and random.random() < 0.75:
        game["zombies"] -= 1
        game["score"] += 10
        message = "Zombie eliminated!"
    else:
        message = "Missed!"

    if game["zombies"] == 0:
        game["game_over"] = True
        message = "YOU WIN! All zombies eliminated!"

    return {"message": message, **game}


@app.post("/game/attack")
def zombie_attack():
    if game["game_over"]:
        return {"message": "Game over", **game}

    damage = random.randint(5, 20)
    game["health"] -= damage

    if game["health"] <= 0:
        game["health"] = 0
        game["game_over"] = True
        message = "GAME OVER! You were attacked."
    else:
        message = f"A zombie attacked you for {damage} damage!"

    return {"message": message, **game}
