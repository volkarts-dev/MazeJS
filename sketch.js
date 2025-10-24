const DirVec = {
  "N": [ 0, -1],
  "E": [ 1,  0],
  "S": [ 0,  1],
  "W": [-1,  0],
}

const DirRev = {
  "N": "S",
  "E": "W",
  "S": "N",
  "W": "E",
}

const BlockSize = 19;

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
        rect(BlockSize + x * BlockSize * 2, BlockSize + y * BlockSize * 2, BlockSize, BlockSize);
      }
    }
  }

  getJunctionOptions(vec) {
    if (((vec.x % (BlockSize * 2)) != 0) || ((vec.y % (BlockSize * 2)) != 0))
      return null;
    let options = [];
    if (vec.x > 0) {
      options.push("W");
    }
    if (vec.x < BlockSize + 9 * BlockSize * 2) {
      options.push("E");
    }
    if (vec.y > 0) {
      options.push("N");
    }
    if (vec.y < BlockSize + 9 * BlockSize * 2) {
      options.push("S");
    }
    return options;
  }
}

class Player {
  static texPos = {
    "N": [BlockSize * 0, BlockSize * 1],
    "E": [BlockSize * 1, BlockSize * 1],
    "S": [BlockSize * 2, BlockSize * 1],
    "W": [BlockSize * 3, BlockSize * 1],
    "dying": [BlockSize * 1, BlockSize * 0],
  };

  constructor() {
    this.pos = createVector(5 * BlockSize * 2, 10 * BlockSize * 2);
    this.dir = "N";
    this.dying = false;
    this.ttl = -1;
  }

  update(juncOpts) {
    if (!juncOpts || juncOpts.includes(this.dir)) {
      this.pos.x += DirVec[this.dir][0];
      this.pos.y += DirVec[this.dir][1];
    }
  }

  draw() {
    const t = Player.texPos[this.dying ? "dying" : this.dir];
    image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, t[0], t[1], BlockSize, BlockSize);
  }

  kill() {
    this.dying = true;
    this.ttl = 30;
  }

  control(juncOpts) {
    if (this.dying) {
      return;
    }

    if (turnRequest && ((turnRequest == DirRev[this.dir]) || (juncOpts && juncOpts.includes(turnRequest)))) {
      this.dir = turnRequest;
    }
  }
}

class Enemy {
  static texPos = {
    "N": [BlockSize * 0, BlockSize * 2],
    "E": [BlockSize * 1, BlockSize * 2],
    "S": [BlockSize * 2, BlockSize * 2],
    "W": [BlockSize * 3, BlockSize * 2],
    "dying": [BlockSize * 1, BlockSize * 0],
  };

  static pivot = {
    "N": [Math.ceil(BlockSize / 2), 0],
    "E": [BlockSize, Math.ceil(BlockSize / 2)],
    "S": [Math.ceil(BlockSize / 2), BlockSize],
    "W": [0, Math.ceil(BlockSize / 2)],
  };

  constructor(pos) {
    this.pos = pos;
    this.dir = "S";
    this.dying = false;
    this.ttl = -1;
  }

  update() {
    this._updatePos();
    if (this.ttl > 0) {
      this.ttl--;
    }
  }

  draw() {
    const t = Enemy.texPos[this.dying ? "dying" : this.dir];
    image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, t[0], t[1], BlockSize, BlockSize);
  }

  decideNewDir(options, targetPos) {
    const targetDir = vec2Dir(p5.Vector.sub(targetPos, this.pos));
    if (options.includes(targetDir)) {
      // if its an option add the targetDir again to give it a higher chance
      options.push(targetDir);
      options.push(targetDir);
    }
    const oldRevDir = DirRev[this.dir];
    do {
      this.dir = options[Math.floor(options.length * Math.random())];
    } while (this.dir == oldRevDir);
  }

  turnAround() {
    this.dir = DirRev[this.dir];
    this._updatePos();
  }

  kill() {
    this.dying = true;
    this.ttl = 30;
  }

  testCollision(vec) {
    const pivot = p5.Vector.add(this.pos, Enemy.pivot[this.dir]);
    if (
      (pivot.x <= (vec.x + BlockSize)) &&
      (pivot.x >= vec.x) &&
      (pivot.y <= (vec.y + BlockSize)) &&
      (pivot.y >= vec.y)
    ) {
      return true;
    }
    return false;
  }

  _updatePos() {
    this.pos.x += DirVec[this.dir][0];
    this.pos.y += DirVec[this.dir][1];
  }
}











let textureAtlas;

let board;
let player;
let enemies;

let active = true;
let pause = true;
let fireRequest = false;
let turnRequest = null;

function preload() {
  textureAtlas = loadImage('/assets/maze.png');
}

function setup() {
  createCanvas(1000, 1000);
  noSmooth();

  frameRate(30);
  startLevel(1);
}

function draw() {
  scale(2);
  translate(5, 5, 0);

  background(0);
  board.draw();

  const playerJuncOpts = board.getJunctionOptions(player.pos);

  if (active && !pause) {
    player.update(playerJuncOpts);
  }

  player.control(playerJuncOpts);

  player.draw();

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    if (active && !pause) {
      enemy.update();

      for (let e = 0; e < enemies.length; e++) {
        if (e == i) {
          continue;
        }
        if (enemy.testCollision(enemies[e].pos)) {
          enemy.turnAround();
          break;
        }
      }

      if (enemy.testCollision(player.pos)) {
        // TODO player death
      }

      const juncOpts = board.getJunctionOptions(enemy.pos);
      if (juncOpts) {
        enemy.decideNewDir(juncOpts, player.pos);
      }
    }

    enemy.draw();
  }
}

function keyPressed() {
  if (!active) {
    if (keyCode == 32) {
      active = true;
    }
    return;
  }

  if (keyCode == ESCAPE) {
    pause = !pause;
    return;
  }

  pause = false;

  if (keyCode == 32) {
    fireRequest = true;
  }
  else if (keyCode == LEFT_ARROW) {
    turnRequest = "W";
  } else if (keyCode == RIGHT_ARROW) {
    turnRequest = "E";
  } else if (keyCode == UP_ARROW) {
    turnRequest = "N";
  } else if (keyCode == DOWN_ARROW) {
    turnRequest = "S";
  }
}

function keyReleased() {
}

function startLevel(level) {
  board = new Board();
  player = new Player();

  enemies = [];
  for (let i = 0; i < 10; i++) {
    let e = i;
    if (i >= 5) e++;
    enemies.push(new Enemy(createVector(e * BlockSize * 2, 0)));
  }
}

function vec2Dir(vec) {
  if (Math.abs(vec.x) > Math.abs(vec.y)) {
    return vec.x < 0 ? "W" : "E";
  } else {
    return vec.y < 0 ? "N" : "S";
  }
}
