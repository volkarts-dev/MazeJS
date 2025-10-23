const dirVec = {
  "N": [ 0, -1],
  "O": [ 1,  0],
  "S": [ 0,  1],
  "W": [-1,  0],
}

const dirRev = {
  "N": "S",
  "O": "W",
  "S": "N",
  "W": "O",
}

class Board {
  constructor() {
  }

  draw() {
    noFill();
    stroke("magenta");
    strokeWeight(1);
    rect(-1, -1, 400, 400);

    fill("magenta");
    strokeWeight(0);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        rect(19 + x * 38, 19 + y * 38, 19, 19);
      }
    }
  }

  isAtJunction(vec) {
    return ((vec.x % 38) == 0) && ((vec.y % 38) == 0);
  }
}

class Player {
  static texPos = {
    "N": [ 0, 19],
    "O": [19, 19],
    "S": [38, 19],
    "W": [57, 19],
  };

  constructor() {
    this.pos = createVector(5 * 38, 10 * 38);
    this.dir = "N";
  }

  update() {
    this.pos.x += dirVec[this.dir][0];
    this.pos.y += dirVec[this.dir][1];
  }

  draw() {
    const t = Player.texPos[this.dir];
    image(textureAtlas, this.pos.x, this.pos.y, 19, 19, t[0], t[1], 19, 19);
  }
}

class Enemy {
  static texPos = {
    "N": [ 0, 38],
    "O": [19, 38],
    "S": [38, 38],
    "W": [57, 38],
  };
  static texPosKeys = Object.keys(Enemy.texPos);

  constructor(pos) {
    this.pos = pos;
    this.dir = "S";
  }

  update() {
    this.pos.x += dirVec[this.dir][0];
    this.pos.y += dirVec[this.dir][1];
  }

  draw() {
    const t = Enemy.texPos[this.dir];
    image(textureAtlas, this.pos.x, this.pos.y, 19, 19, t[0], t[1], 19, 19);
  }

  decideNewDir() {
    const oldRevDir = dirRev[this.dir];
    do {
      this.dir = Enemy.texPosKeys[Enemy.texPosKeys.length * Math.random() << 0];
    } while (this.dir == oldRevDir);
  }
}











let textureAtlas;

let board;
let player;
let enemies;

let pause = true;

function preload() {
  textureAtlas = loadImage('/assets/maze.png');
}

function setup() {
  createCanvas(1000, 1000);

  startLevel(1);
}

function draw() {
  scale(2);
  translate(5, 5, 0);

  if (!pause) {
    player.update();
  }
  player.draw();

  for (let i = 0; i < enemies.length; i++) {
    if (!pause) {
      enemies[i].update();
      if (board.isAtJunction(enemies[i].pos)) {
        enemies[i].decideNewDir();
      }
    }
    enemies[i].draw();
  }
}

function keyPressed() {
  if (keyCode == ESCAPE) {
    pause = true;
    return;
  }

  pause = false;

}

function startLevel(level) {
  board = new Board();
  player = new Player();

  enemies = [];
  for (let i = 0; i < 10; i++) {
    let e = i;
    if (i >= 5) e++;
    enemies.push(new Enemy(createVector(e * 38, 0)));
  }





  scale(2);
  translate(5, 5, 0);
  background(0);
  board.draw();
}
