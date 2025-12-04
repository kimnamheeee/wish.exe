
let points = [];
let dragImage_1;


function preload() {
  //나중에 for문으로 전체 image로딩 해도 좋을 것 같습니다.
  dragImage_1 = loadImage("images/dragImage_1.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
}

function draw() {
  background(30);

  let originalW = dragImage_1.width;
  let originalH = dragImage_1.height;

  let scaledW = width * 0.7;
  let scaledH = originalH * (scaledW / originalW);

  let cx = width / 2;
  let cy = height / 2;

  image(dragImage_1, cx, cy, scaledW, scaledH);

  noStroke();
  fill(255, 0, 0);
  for (let p of points) {
    let px = cx - scaledW / 2 + scaledW * p.rx;
    let py = cy - scaledH / 2 + scaledH * p.ry;
    circle(px, py, 8);
  }
}

function mousePressed() {
  let originalW = dragImage_1.width;
  let originalH = dragImage_1.height;

  let scaledW = width * 0.7;
  let scaledH = originalH * (scaledW / originalW);

  let cx = width / 2;
  let cy = height / 2;

  let left   = cx - scaledW / 2;
  let top    = cy - scaledH / 2;
  let right  = left + scaledW;
  let bottom = top + scaledH;

  if (mouseX >= left && mouseX <= right &&
      mouseY >= top && mouseY <= bottom) {

    let rx = (mouseX - left) / scaledW;   // 0~1
    let ry = (mouseY - top) / scaledH;    // 0~1

    points.push({ rx, ry });

    console.log(`{ rx: ${rx.toFixed(3)}, ry: ${ry.toFixed(3)} },`);
  }
}