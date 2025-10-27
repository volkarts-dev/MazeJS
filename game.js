// SPDX-FileCopyrightText: © 1996,2025 Daniel Volk <mail@volkarts.com>
// SPDX-License-Identifier: GPL-3.0-only

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

const KEY_A = 65;
const KEY_Q = 81;

const TYPE_PLAYER = 1;
const TYPE_ENEMY = 2;

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

const PlayerTexPos = [
  [BlockSize * 0, BlockSize * 1],
  [BlockSize * 1, BlockSize * 1],
  [BlockSize * 2, BlockSize * 1],
  [BlockSize * 3, BlockSize * 1],
];

const BoostTexPos = [
  [BlockSize * 0, BlockSize * 3],
  [BlockSize * 1, BlockSize * 3],
  [BlockSize * 2, BlockSize * 3],
  [BlockSize * 3, BlockSize * 3],
];

const EnemyTexPos = [
  [BlockSize * 0, BlockSize * 2],
  [BlockSize * 1, BlockSize * 2],
  [BlockSize * 2, BlockSize * 2],
  [BlockSize * 3, BlockSize * 2],
];

const ExplodeTexPos = [
  [BlockSize * 0, BlockSize * 4],
  [BlockSize * 1, BlockSize * 4],
  [BlockSize * 2, BlockSize * 4],
  [BlockSize * 3, BlockSize * 4],
];

const BeamTexPos = [
  [BlockSize * 0, BlockSize * 0],
  [BlockSize * 1, BlockSize * 0],
  [BlockSize * 2, BlockSize * 0],
  [BlockSize * 3, BlockSize * 0],
];

const BoostTileOffset = [
  [0, BlockSize],
  [-BlockSize, 0],
  [0, -BlockSize],
  [BlockSize, 0],
]

const BeamTime = 15;
const ExplodeTime = 5;

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
          beamSound.play();
          this.beaming = BeamTime;
        } else {
          beamRequest = false;
        }
      }

      if (fireRequest) {
        fireRequest = false;

        shootSound.play();

        if (this._drawEnergy(5)) {
          const pivot = p5.Vector.add(this.pos, PivotOffset[this.dir]);
          bullets.push(new Bullet(pivot, this.dir, TYPE_PLAYER));
        }
      }

      this.boost = false;
      if (keyIsDown(KEY_A)) {
        if (this._drawEnergy(0.5)) {
          this.boost = true;

          if (!boostSound.isLooping()) {
            boostSound.loop();
          }
        }
      }

      if (!this.boost && boostSound.isLooping()) {
        boostSound.pause();
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

    let tex;

    if (this.beaming == -1) {
      if (!this.dying) {
        tex = PlayerTexPos[this.dir];
      } else {
        tex = ExplodeTexPos[frameIndex(this.ttl, ExplodeTime)];
      }
      image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, tex[0], tex[1], BlockSize, BlockSize);

      if (!this.dying && this.boost) {
        tex = BoostTexPos[this.dir];
        const bpos = p5.Vector.add(this.pos, BoostTileOffset[this.dir]);
        image(textureAtlas, bpos.x, bpos.y, BlockSize, BlockSize, tex[0], tex[1], BlockSize, BlockSize);
      }
    } else {
      const halfBeamTime = Math.floor(BeamTime / 2);
      if (this.beaming <= halfBeamTime) {
        tex = BeamTexPos[frameIndex(halfBeamTime - this.beaming, halfBeamTime)];
      } else {
        tex = BeamTexPos[frameIndex(this.beaming - halfBeamTime, halfBeamTime)];
      }
      image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, tex[0], tex[1], BlockSize, BlockSize);
    }
  }

  kill() {
    boostSound.pause();
    this.boost = false;
    this.dying = true;
    this.ttl = ExplodeTime;
  }

  reawaken() {
    this.dying = false;
    this.ttl = -1;
    this.energy = 100;
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
  constructor(pos) {
    this.pos = pos;
    this.dir = SOUTH;
    this.dying = false;
    this.ttl = -1;
  }

  update() {
    if (!this.dying) {
      if (Math.random() < (level / 1000)) {
        enemyShootSound.play();

        const pivot = p5.Vector.add(this.pos, PivotOffset[this.dir]);
        bullets.push(new Bullet(pivot, this.dir, TYPE_ENEMY));
      }

      this._updatePos();
    }

    if (this.ttl > 0) {
      this.ttl--;
    }
  }

  draw() {
    let tex;
    if (!this.dying) {
      tex = EnemyTexPos[this.dir];
    } else {
      tex = ExplodeTexPos[frameIndex(this.ttl, ExplodeTime)];
    }
    image(textureAtlas, this.pos.x, this.pos.y, BlockSize, BlockSize, tex[0], tex[1], BlockSize, BlockSize);
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
    this.ttl = ExplodeTime;
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
  constructor(pos, dir, sender) {
    this.pos = pos;
    this.dir = dir;
    this.sender = sender;
  }

  update() {
    const fac = (this.sender == TYPE_PLAYER) ? 10 : 3;
    this.pos.x += DirVec[this.dir][0] * fac;
    this.pos.y += DirVec[this.dir][1] * fac;
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
let pauseSound;
let shootSound;
let explodeSound;
let boostSound;
let beamSound;

let level;
let lives;
let score;
let highscore = localStorage.getItem("highscore") ?? 0;

let board;
let player;
let enemies;
let bullets;

let active = false;
let pause = false;
let turnRequest = null;
let fireRequest = false;
let beamRequest = false;

let hint = "";
let hintTimer = null;

function preload() {
  textureAtlas = loadImage("assets/maze.png");

  pauseSound = loadSound("assets/click.ogg");
  shootSound = loadSound("assets/shoot.ogg");
  enemyShootSound = loadSound("assets/enemy_shoot.ogg");
  explodeSound = loadSound("assets/explode.ogg");
  boostSound  = loadSound("assets/boost.ogg");
  beamSound = loadSound("assets/beam.ogg");
}

function setup() {
  createCanvas(1010, 815);
  noSmooth();

  frameRate(30);
  startLevel(1);
}

function draw() {
  if (active && !pause) {
    update();
  }

  scale(2);
  translate(5, 5, 0);

  background(0);

  board.draw();

  for (let i = 0; i < enemies.length; i++) {
    enemies[i].draw();
  }

  player.draw();

  for (let i = 0; i < bullets.length; i++) {
    bullets[i].draw();
  }

  drawInfo();
}

function drawInfo() {
  fill("gray");
  textSize(10);
  textCenter("Level", 20);
  textCenter("Lives", 60);
  textCenter("Energy", 100);
  textCenter("Score", 140);
  textCenter("Highscore", 200);

  fill("white");
  textSize(15);
  textCenter(level, 40);
  textCenter(lives, 80);
  textCenter(Math.round(player.energy), 120);
  textCenter(score, 160);
  textCenter(highscore, 220);

  textSize(10);

  if (pause) {
    textCenter("[Arrows] Direction", 320);
    textCenter("[SPACE] Fire", 335);
    textCenter("'A' Boost", 350);
    textCenter("'Q' Jump", 365);
    textCenter("[ESC] to continue", 380);
    fill('gray');
    textSize(5);
    textCenter("© 1996,2025 VolkArts", 390);
  } else {
    textCenter(hint, 380);
  }
}

function update() {
  if (player.ttl == 0) {
    active = false;
    lives--;
    if (lives == 0) {
      startLevel(1);
    } else {
      player.reawaken();
      resetPositions();
    }
    return;
  }

  if (enemies.length == 0) {
    active = false;
    startLevel(level + 1);
    return;
  }

  const playerJuncOpts = board.getJunctionOptions(player.pos);

  player.update(playerJuncOpts);

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];

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
      explodeSound.play();
      setTimeout(() => explodeSound.play(), 10);
      player.kill();
      enemy.kill();
    }

    const juncOpts = board.getJunctionOptions(enemy.pos);
    if (juncOpts) {
      enemy.decideNewDir(juncOpts, player.pos);
    }
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

      if ((bullet.sender == TYPE_PLAYER) && bullet.testCollision(enemy.pos)) {
        score += 10 + 5 * Math.floor(level / 5);

        if (score > highscore) {
          highscore = score;
          localStorage.setItem("highscore", highscore);
          showHint("New highscore", 3000);
        }

        explodeSound.play();
        enemy.kill();
        bullets.splice(i, 1);
        continue;
      }

      if ((bullet.sender == TYPE_ENEMY) && bullet.testCollision(player.pos)) {
        explodeSound.play();
        player.kill();
        bullets.splice(i, 1);
        continue;
      }
    }
  }
}

function keyPressed() {
  if (!active) {
    if (keyCode == 32) {
      active = true;
      showHint("");
    }
    return;
  }

  if (keyCode == ESCAPE) {
    pauseSound.play();
    pause = !pause;
    showHint("");
    return;
  }

  if (pause) {
    return;
  }

  if (keyCode == 32) {
    fireRequest = true;
  } else if (keyCode == KEY_Q) {
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

// ************************************************************************************************

function startLevel(lvl) {
  level = lvl;
  if (level == 1) {
    lives = 3;
    score = 0;
  } else {
    lives += ((level % 5) == 0) ? 1 : 0;
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

  showHint("[SPACE] to start");
}

function resetPositions() {
  player.pos = createVector(5 * BlockSize * 2, 10 * BlockSize * 2);
  player.dir = NORTH;

  turnRequest = null;
  fireRequest = false;
  beamRequest = false;

  let i = 0;
  let h = Math.floor(enemies.length / 2);
  for (; i < h; i++) {
    enemies[i].pos = createVector(i * BlockSize * 2, 0 * BlockSize * 2);
    enemies[i].dir = SOUTH;
  }
  for (; i < enemies.length; i++) {
    enemies[i].pos = createVector((10 - h + i - h) * BlockSize * 2, 0 * BlockSize * 2);
    enemies[i].dir = SOUTH;
  }

  bullets = [];

  showHint("[SPACE] to start");
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

function textCenter(txt, y) {
  const w = textWidth(txt);
  text(txt, Math.round(450 - w / 2), y);
}

function showHint(h, timeout = -1) {
  if (hintTimer) {
    clearTimeout(hintTimer);
  }

  hint = h;
  hintTimer = null;

  if (timeout > 0) {
    setTimeout(() => {
      hintTimer = null;
      hint = "";
    }, timeout);
  }
}

function frameIndex(pos, time) {
  return Math.floor(pos / time * 3);
}
