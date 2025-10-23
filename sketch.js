function setup() {
  createCanvas(1000, 1000);
  background(0);

  scale(4);
  translate(1, 1, 0);
  drawBoard();
}

function draw() {
}

function drawBoard() {
  noFill();
  stroke("magenta");
  strokeWeight(1);
  rect(0, 0, 190, 190);

  fill("magenta");
  strokeWeight(0);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      rect(10 + x * 20, 10 + y * 20, 10, 10);
    }
  }
}
