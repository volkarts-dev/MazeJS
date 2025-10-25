const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

const KEY_B = 66;
const KEY_J = 74;

const DirVec = [
  [ 0, -1],
  [ 1,  0],
  [ 0,  1],
  [-1,  0],
];

const DirRev = [
  SOUTH,
  WEST,
  NORTH,
  EAST,
];

const BlockSize = 19;

const PivotOffset = [
  [Math.ceil(BlockSize / 2), 0],
  [BlockSize, Math.ceil(BlockSize / 2)],
  [Math.ceil(BlockSize / 2), BlockSize],
  [0, Math.ceil(BlockSize / 2)],
];

const BeamTime = 30;

// ************************************************************************************************

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
      options.push(WEST);
    }
    if (vec.x < BlockSize + 9 * BlockSize * 2) {
      options.push(EAST);
    }
    if (vec.y > 0) {
      options.push(NORTH);
    }
    if (vec.y < BlockSize + 9 * BlockSize * 2) {
      options.push(SOUTH);
    }
    return options;
  }

  isOutOfBounds(vec) {
    return vec.x < 0 || vec.x >= 400 || vec.y < 0 || vec.y >= 400;
  }
}

// ************************************************************************************************

class Player {
  static texPos = [
    [BlockSize * 0, BlockSize * 1],
    [BlockSize * 1, BlockSize * 1],
    [BlockSize * 2, BlockSize * 1],
    [BlockSize * 3, BlockSize * 1],
    [BlockSize * 1, BlockSize * 0],
  ];

  static boostTexPos = [
    [BlockSize * 0, BlockSize * 3],
    [BlockSize * 1, BlockSize * 3],
    [BlockSize * 2, BlockSize * 3],
    [BlockSize * 3, BlockSize * 3],
  ];

  static beamTexPos = [BlockSize * 0, BlockSize * 0];

  static boostTileOffset = [
    [0, BlockSize],
    [-BlockSize, 0],
    [0, -BlockSize],
    [BlockSize, 0],
  ]

  constructor() {
    this.pos = createVector(5 * BlockSize * 2, 10 * BlockSize * 2);
    this.dir = NORTH;
    this.energy = 100;
    this.erc = 0;
    this.boost = false;
    this.beaming = -1;
    this.dying = false;
    this.ttl = -1;
  }

  update(juncOpts) {
    if (!this.dying && (this.beaming == -1)) {
      if (!this.boost && (turnRequest !== null) &&
        ((turnRequest == DirRev[this.dir]) || (juncOpts && juncOpts.includes(turnRequest)))) {
        this.dir = turnRequest;
      }

      if (beamRequest) {
        if (this._drawEnergy(30)) {
          this.beaming = BeamTime;
        }
      }

      if (fireRequest) {
        fireRequest = false;

        if (this._drawEnergy(5)) {
          const pivot = p5.Vector.add(this.pos, PivotOffset[this.dir]);
          bullets.push(new Bullet(pivot, this.dir));
        }
      }

      this.boost = false;
      if (keyIsDown(KEY_B)) {
        if (this._drawEnergy(1)) {
          this.boost = true;
        }
      }

      if (!juncOpts || juncOpts.includes(this.dir)) {
        this._updatePos();
      }

      this._refreshEnery();
    }

    if (this.beaming > 0) {
      this.beaming--;
      if (this.beaming == Math.round(BeamTime / 2)) {
        this._jump();
      } else if (this.beaming == 0) {
        this.beaming = -1;
        beamRequest = false;
      }
    }

    if (this.ttl > 0) {
      this.ttl--;
    }
  }

  draw() {
    if (this.ttl == 0) {
      return;
    }

    if (this.beaming == -1) {
      const t = Player.texPos[this.dying ? 4 : this.dir];
      image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, t[0], t[1], BlockSize, BlockSize);

      if (!this.dying && this.boost) {
        const bt = Player.boostTexPos[this.dir];
        const bpos = p5.Vector.add(this.pos, Player.boostTileOffset[this.dir]);
        image(textureAtlas, bpos.x, bpos.y, BlockSize, BlockSize, bt[0], bt[1], BlockSize, BlockSize);
      }
    } else {
      const bt = Player.beamTexPos;
      image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, bt[0], bt[1], BlockSize, BlockSize);
    }
  }

  kill() {
    this.dying = true;
    this.ttl = 5;
  }

  testCollision(vec) {
    if (
      !this.dying &&
      (this.pos.x < (vec.x + BlockSize - 3)) &&
      (this.pos.x > (vec.x - BlockSize + 3)) &&
      (this.pos.y < (vec.y + BlockSize - 3)) &&
      (this.pos.y > (vec.y - BlockSize + 3))
    ) {
      return true;
    }
    return false;
  }

  _updatePos() {
    const fac = this.boost ? 3 : 1
    this.pos.x += DirVec[this.dir][0] * fac;
    this.pos.y += DirVec[this.dir][1] * fac;
  }

  _drawEnergy(amount) {
    if (this.energy < amount) {
      return false;
    }
    this.energy -= amount;
    this.erc = 0;
    return true;
  }

  _refreshEnery() {
    this.erc++;
    if (this.erc > 15) {
      this.erc = 0;
      this.energy++;
      if (this.energy > 100) {
        this.energy = 100;
      }
    }
  }

  _jump() {
    this.pos.x += DirVec[this.dir][0] * 100;
    this.pos.y += DirVec[this.dir][1] * 100;

    const end = 10 * BlockSize * 2;

    this.pos.x = clamp(this.pos.x, 0, end);
    this.pos.y = clamp(this.pos.y, 0, end);
  }
}

// ************************************************************************************************

class Enemy {
  static texPos = [
    [BlockSize * 0, BlockSize * 2],
    [BlockSize * 1, BlockSize * 2],
    [BlockSize * 2, BlockSize * 2],
    [BlockSize * 3, BlockSize * 2],
    [BlockSize * 1, BlockSize * 0],
  ];

  constructor(pos) {
    this.pos = pos;
    this.dir = SOUTH;
    this.dying = false;
    this.ttl = -1;
  }

  update() {
    if (!this.dying) {
      this._updatePos();
    }
    if (this.ttl > 0) {
      this.ttl--;
    }
  }

  draw() {
    const t = Enemy.texPos[this.dying ? 4 : this.dir];
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
    this.ttl = 5;
  }

  testCollision(vec) {
    const pivot = p5.Vector.add(this.pos, PivotOffset[this.dir]);
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

// ************************************************************************************************

class Bullet {
  constructor(pos, dir) {
    this.pos = pos;
    this.dir = dir;
  }

  update() {
    this.pos.x += DirVec[this.dir][0] * 10;
    this.pos.y += DirVec[this.dir][1] * 10;
  }

  draw() {
    fill("white");
    noStroke();
    rect(this.pos.x - 1, this.pos.y - 1, 3, 3);
  }

  testCollision(vec) {
    if (
      (this.pos.x < (vec.x + BlockSize - 2)) &&
      (this.pos.x > (vec.x + 2)) &&
      (this.pos.y < (vec.y + BlockSize - 2)) &&
      (this.pos.y > (vec.y + 2))
    ) {
      return true;
    }
    return false;
  }
}

// ************************************************************************************************

let textureAtlas;

let level;
let points;

let board;
let player;
let enemies;
let bullets;

let active = false;
let pause = false;
let turnRequest = null;
let fireRequest = false;
let beamRequest = false;

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

  if (player.ttl == 0) {
    active = false;
    startLevel(1);
  }

  if (enemies.length == 0) {
    active = false;
    startLevel(level + 1);
  }

  const playerJuncOpts = board.getJunctionOptions(player.pos);

  if (active && !pause) {
    player.update(playerJuncOpts);
  }

  player.draw();

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

    if (active && !pause) {
      enemy.update();

      if (enemy.ttl == 0) {
        enemies.splice(i, 1);
        continue;
      }

      for (let e = 0; e < enemies.length; e++) {
        if (e == i) {
          continue;
        }
        if (enemy.testCollision(enemies[e].pos)) {
          enemy.turnAround();
          break;
        }
      }

      if (player.testCollision(enemy.pos)) {
        player.kill();
        enemy.kill();
      }

      const juncOpts = board.getJunctionOptions(enemy.pos);
      if (juncOpts) {
        enemy.decideNewDir(juncOpts, player.pos);
      }
    }

    enemy.draw();
  }

  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];

    bullet.update();

    if (board.isOutOfBounds(bullet.pos)) {
      bullets.splice(i, 1);
      continue;
    }

    for (let e = 0; e < enemies.length; e++) {
      const enemy = enemies[e];

      if (bullet.testCollision(enemy.pos)) {
        points += 10;
        enemy.kill();
        bullets.splice(i, 1);
        continue;
      }
    }

    bullet.draw();
  }

  fill("gray");
  textSize(10);
  text("Level:", 410, 18);
  text("Energy:", 410, 38);
  text("Points:", 410, 58);

  fill("white");
  textSize(15);
  text(level, 450, 20);
  text(Math.round(player.energy), 450, 40);
  text(points, 450, 60);
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

  if (pause) {
    return;
  }

  if (keyCode == 32) {
    fireRequest = true;
  }
  else if (keyCode == KEY_J) {
    beamRequest = true;
  } else if (keyCode == LEFT_ARROW) {
    turnRequest = WEST;
  } else if (keyCode == RIGHT_ARROW) {
    turnRequest = EAST;
  } else if (keyCode == UP_ARROW) {
    turnRequest = NORTH;
  } else if (keyCode == DOWN_ARROW) {
    turnRequest = SOUTH;
  }
}

function keyReleased() {
}

// ************************************************************************************************

function startLevel(lvl) {
  level = lvl;
  if (level == 1) {
    points = 0;
  }
  eneryRefresh = 0;

  turnRequest = null;
  fireRequest = false;
  beamRequest = false;

  board = new Board();
  player = new Player();

  enemies = [];
  for (let i = 0; i < 10; i++) {
    let e = i;
    if (i >= 5) e++;
    enemies.push(new Enemy(createVector(e * BlockSize * 2, 0)));
  }

  bullets = [];
}

function vec2Dir(vec) {
  if (Math.abs(vec.x) > Math.abs(vec.y)) {
    return vec.x < 0 ? WEST : EAST;
  } else {
    return vec.y < 0 ? NORTH : SOUTH;
  }
}

function clamp(num, min, max) {
  return (num <= min) ? min : ((num >= max) ? max : num);
}
