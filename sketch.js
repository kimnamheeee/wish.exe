let userInput = "";
let back_stars = [];

let loadingProgress = 0;
let loadingStartTime = 0;
let loadingDuration = 5000;

let isCallingLLM = false;
let emotionResult = null;

const emotionResults = new Array(5).fill(null);

let hasCalledLLM = false;

let hasUploadedCapture = false;

let starColorIndex = 0;

let starLumIndex = 0; //stars_lum

let factLoading = null;
let mythLoading = null;
let transitioning = false;

let stars = []; //starsLoc

let draggedStarIndex = -1;
let targetPositions = [];
const SNAP_THRESHOLD = 30;

let intensityResult = null;
let isRadarAnimating = false;
let timer;

let font;

let dialogImage = null;
let inputImage = null;

//참가자들 별자리 저장
let captureLayer;
const MAX_USER_STARS = 5; //saveCurrentStar, renderSavedStars
let userStars = [];
let lastStarSaved = false;

let qrcode;
let qrcodeElement;
let resetScheduled = false;
let qrcodeLoadingElement;
let qrcodeSkeletonElement;
let uploadRequestId = 0;

let resetButtonImg = null;

const LARGE_TEXT_SIZE = 52;
const MEDIUM_TEXT_SIZE = 40;
const SMALL_TEXT_SIZE = 32;

function uploadCapture(base64) {
  if (!base64 || hasUploadedCapture) return;
  hasUploadedCapture = true;

  uploadRequestId += 1;
  const thisRequestId = uploadRequestId;

  if (qrcodeLoadingElement) qrcodeLoadingElement.style.opacity = 1;
  if (qrcodeSkeletonElement) qrcodeSkeletonElement.style.opacity = 1;

  fetch(UPLOAD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: base64 }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (thisRequestId !== uploadRequestId) return;

      qrcode.makeCode(data.url);
      qrcodeElement.style.opacity = 1;
      if (qrcodeLoadingElement) qrcodeLoadingElement.style.opacity = 0;
      if (qrcodeSkeletonElement) qrcodeSkeletonElement.style.opacity = 0;
    });
}

const baseStarImages = {};

const collectedEmotions = [];

const totalEmotions = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
};

const currentEmotions = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
};

const emotionMapping = {
  0: "차분함",
  1: "슬픔",
  2: "희망",
  3: "걱정",
  4: "행복",
};

const shapeMapping = {
  0: "원형의",
  1: "사각형의",
  2: "육각형의",
  3: "팔각형의",
  4: "오각형의",
};

const colorMapping = {
  0: "초록색",
  1: "파랑색",
  2: "분홍색",
  3: "보라색",
  4: "노랑색",
};

const lumMapping = {
  0: "희미하게",
  1: "은은하게",
  2: "또렷하게",
  3: "깊이",
  4: "강렬하게",
};

const LLM_API_URL = "https://p5-llm-server.vercel.app/api/llm";
const UPLOAD_API_URL = "https://p5-llm-server.vercel.app/api/upload";

const SYSTEM_PROMPT = `
You are an emotion classifier for an art installation.
Your ONLY job is to read the user's input text and classify it
into a SINGLE emotion ID from 0 to 4.

EMOTION MAPPING (fixed):
0 = Calm / Neutral
1 = Sadness
2 = Hope / Determination
3 = Fear / Anxiety
4 = Happiness / Excitement

RULES:
- ALWAYS return an object with this exact shape:
  {"emotion": <number>}
- <number> must be a single integer from 0 to 4.
- DO NOT include explanations, adjectives, reasoning, or additional text.
- DO NOT output anything except valid JSON.

If the user input is unclear, ambiguous, or overly complex,
still select the closest emotion ID.
Never ask for clarification.
Never output any natural language.

Your final answer MUST be valid JSON and nothing else.
No markdown.
No backticks.
No comments.
No text before or after the JSON.

Examples:
User: "올해 너무 힘들었는데 그래도 버텼어요."
Return: {"emotion": 2}

User: "혼란스럽고 뭐가 맞는지 모르겠어요."
Return: {"emotion": 3}

User: "그냥 담담한 하루였어요."
Return: {"emotion": 0}
`;

const LUM_SYSTEM_PROMPT = `
You are an emotion classifier for an art installation.
Your ONLY job is to read the user's input text and classify it
into (1) a SINGLE emotion ID, and (2) an intensity level.

OUTPUT SCHEMA (strict):
{"emotion": <number>, "intensity": <number>}

EMOTION MAPPING (fixed):
0 = Calm / Neutral
1 = Sadness
2 = Hope / Determination
3 = Fear / Anxiety
4 = Happiness / Excitement

INTENSITY SCALE:
0 = Weak / Subtle
1 = Moderate
2 = Strong / Intense
3 = Very Strong / Very Intense
4 = Extreme / Maximum

RULES:
- ALWAYS return a JSON object with BOTH keys:
  "emotion" and "intensity".
- <emotion> must be a single integer from 0 to 4.
- <intensity> must be a single integer from 0 to 4.
- DO NOT include explanations, adjectives, reasoning, or extra text.
- DO NOT output anything except valid JSON.
- DO NOT use markdown, backticks, or comments.

If the user input is unclear, ambiguous, or overly complex,
still select the closest emotion AND estimate intensity.
Never ask for clarification.
Never output natural language.

Examples:
User: "올해 너무 힘들었는데 그래도 버텼어요."
Return: {"emotion": 2, "intensity": 1}

User: "혼란스럽고 뭐가 맞는지 모르겠어요."
Return: {"emotion": 3, "intensity": 2}

User: "그냥 담담한 하루였어요."
Return: {"emotion": 0, "intensity": 0}
`;

async function callLLM(systemPrompt, userText) {
  if (isCallingLLM) return;
  isCallingLLM = true;
  console.log("CALLING LLM");
  const res = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  await delay(10000);

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? "(no reply)";
  isCallingLLM = false;
  return reply;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let loadingTextIndex = 0;
let lastTextChange = 0;

const loadingMessages = [
  "당신의 이야기를 천천히 펼치는 중입니다",
  "올해를 돌아보는 작은 숨을 고르는 중이에요",
  "기억 속 별들을 하나씩 꺼내어 보고 있어요",
  "마음이 향했던 순간들을 가만히 정리하는 중입니다",
];

function loadingUI() {
  fill(255);
  textAlign(CENTER, CENTER);

  if (millis() - lastTextChange > 3000) {
    loadingTextIndex = floor(random(0, loadingMessages.length));
    lastTextChange = millis();
  }

  textSize(rh(MEDIUM_TEXT_SIZE));
  text(loadingMessages[loadingTextIndex], width / 2, height * 0.3);

  let dots = floor((millis() / 400) % 4);
  let dotString = ".".repeat(dots);

  textSize(rh(MEDIUM_TEXT_SIZE));
  text(dotString, width / 2, height * 0.38);
}

let revealedStars = 0;
let isRevealing = false;

let popQueue = [];

let hasStartedStarColoring = false;

function triggerPop(star) {
  star.popProgress = 0;
  popQueue.push(star);
}

function startStarReveal() {
  revealedStars = 0;
  isRevealing = true;

  revealNextStar();
}

function popEase(p) {
  return p < 0.3 ? map(p, 0, 0.3, 0, 1.4) : map(p, 0.3, 1, 1.4, 1);
}

function revealNextStar() {
  if (revealedStars >= stars.length) return;

  triggerPop(stars[revealedStars]);
  revealedStars++;

  setTimeout(revealNextStar, 500);
}

function renderMainStars() {
  for (let i = 0; i < revealedStars; i++) {
    let s = stars[i];

    if (s.popProgress < 1) {
      s.popProgress += 0.08;
      if (s.popProgress > 1) s.popProgress = 1;
    }

    let scale = popEase(s.popProgress);
    let sizeScale = s.sizeScale ?? 1;

    drawImageAspect(
      s.image,
      s.x,
      s.y,
      30 * scale * sizeScale,
      30 * scale * sizeScale
    );
  }
}

function renderQuestionText(txt) {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(rh(MEDIUM_TEXT_SIZE));

  text(txt, width / 2, height * 0.68);
}

function getUserInput() {
  if (inputBox) {
    userInput = inputBox.value();
    inputBox.remove();
    inputBox = null;
  }
}

let showInputWarning = false;
let inputWarningStartTime = 0;

function isInputEmpty() {
  if (!inputBox) return true;
  const value = inputBox.value().trim();
  return value === "";
}

function drawInputWarning() {
  if (!showInputWarning) return;

  const DURATION = 1500;
  if (millis() - inputWarningStartTime > DURATION) {
    showInputWarning = false;
    return;
  }

  const x = width / 2;
  const y = height * 0.9;

  push();
  fill(255, 80, 80);
  textAlign(CENTER, CENTER);
  textSize(rh(SMALL_TEXT_SIZE));
  text("내용을 입력한 뒤 Enter를 눌러주세요.", x, y);
  pop();
}

function renderAnswerInput() {
  image(inputImage, width / 2, height * 0.82, 700, 180);
  if (!inputBox) {
    inputBox = createInput("");

    let x = (width - 600) / 2;
    let y = height * 0.8;

    inputBox.position(x, y);
    inputBox.size(600, 60);

    inputBox.style("font-size", `${rh(SMALL_TEXT_SIZE)}px`);
    inputBox.style("color", "white");
    inputBox.style("text-align", "center");
    inputBox.style("background", "none");
    inputBox.style("outline", "none");
    inputBox.style("border", "none");
    inputBox.style("font-family", "pokemon");
    inputBox.attribute("placeholder", "여기에 입력하세요...");
    inputBox.attribute("required", "true");
  }

  drawInputWarning();
}

function stars_loc() {
  const STAR_COUNT = 11;

  const minY = height * 0.1;
  const maxY = height * 0.55;

  const stars = [];
  const MIN_DIST = 35;

  for (let i = 0; i < STAR_COUNT; i++) {
    let x, y;
    let safe = false;
    let attempts = 0;

    while (!safe && attempts < 200) {
      attempts++;

      x = random(width * 0.15, width * 0.85);
      y = random(minY, maxY);

      safe = true;
      for (let s of stars) {
        let d = dist(x, y, s.x, s.y);
        if (d < MIN_DIST) {
          safe = false;
          break;
        }
      }
    }

    stars.push({
      x,
      y,
      color: { r: 255, g: 255, b: 255 },
      lum: 0,
      popProgress: 1,
      sizeScale: 1,
      image: null,
    });
  }

  return stars;
}

let mode = "main"; // "main" 또는 "intro"
let introFrame = 0;
let textCount = 0;

const dragImage = Array.from({ length: 6 }, () => Array(2).fill(null));

let dragImage_1;
//let drageImage_n;
let titleImage;
let titleDescription;

const coloredStarImages = Array.from({ length: 5 }, () => Array(5).fill(null));
const lumStarImages = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => Array(5).fill(null))
);

function preload() {
  dragImage_1 = loadImage("images/constellation/dragImage_1.png");
  for (let i = 1; i <= 5; i++) {
    dragImage[i] = []; // 각 그룹 초기화

    for (let j = 1; j <= 2; j++) {
      dragImage[i][j] = loadImage(
        `images/constellation/dragImage_${i}_${j}.png`
      );
    }
  }
  titleImage = loadImage("images/title.png");
  titleDescription = loadImage("images/title_description.png");
  font = loadFont("fonts/pokemon.ttf");
  dialogImage = loadImage("images/dialog.png");
  inputImage = loadImage("images/input.png");
  resetButtonImg = loadImage("images/reset.png");
  for (let i = 0; i < 5; i++) {
    baseStarImages[i] = loadImage(`images/stars/${i}/star.png`);
  }
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      coloredStarImages[i][j] = loadImage(`images/stars/${i}/${j}/star.png`);
    }
  }
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      for (let k = 0; k < 5; k++) {
        lumStarImages[i][j][k] = loadImage(
          `images/stars/${i}/${j}/${k}/star.png`
        );
      }
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  captureLayer = createGraphics(windowWidth, windowHeight);
  captureLayer.imageMode(CENTER);

  qrcode = new QRCode(document.getElementById("qrcode"), {
    text: "",
    width: 128,
    height: 128,
  });
  qrcodeElement = document.getElementById("qrcode");
  qrcodeLoadingElement = document.getElementById("qrcode-loading");
  qrcodeSkeletonElement = document.getElementById("qrcode-skeleton");
  angleMode(DEGREES);
  textFont(font);
  stars = stars_loc();
}

function draw() {
  backgroundStar();

  switch (mode) {
    case "main":
      main_frame();
      break;
    case "intro":
      intro();
      break;
    case "loading_1":
      loading_1();
      break;
    case "description_1":
      description_1();
      break;
    case "question_1":
      question_1();
      break;
    case "description_2":
      description_2();
      break;
    case "loading_2":
      loading_2();
      break;
    case "question_2":
      question_2();
      break;
    case "loading_3":
      loading_3();
      break;
    case "description_3":
      description_3();
      break;
    case "question_3":
      question_3();
      break;
    case "question_4":
      question_4();
      break;
    case "drag_stars":
      drag_stars();
      break;
    case "loadingLast":
      loadingLast();
      break;
    case "last":
      last();
      break;
  }
}

function description_1() {
  renderLoadingText(
    `감정에 따라 탄생하는 별의 모양이 달라져요.\n2025년 가장 많은 노력을 들인 일은[${emotionMapping[emotionResult]}]과 연결되어 있네요.
    당신의 [${emotionMapping[emotionResult]}]을 [${shapeMapping[emotionResult]}] 별에 담아볼게요.`
  );
  renderMainStars();
  if (revealedStars >= stars.length) {
    mode = "question_2";
  }
}

function description_2() {
  renderMainStars();
  renderLoadingText(
    `감정에 따라 별이 제각기 다른 색으로 빛나기 시작해요.\n2025년에는 [${emotionMapping[emotionResult]}]을(를) 가장 자주 느끼셨네요.\n당신의 감정은 [${colorMapping[emotionResult]}]으로 빛날 거예요.`
  );
}

function description_3() {
  renderMainStars();
  renderLoadingText(
    `2025년의 스스로에게 [${emotionMapping[emotionResult]}]을 [${lumMapping[intensityResult]}] 갖고 있네요.\n당신의 감정은 [${lumMapping[intensityResult]}] 빛날 거예요.`
  );
}

function keyPressed() {
  // 메인 화면에서 Enter -> 인트로 시작
  if (keyCode === ENTER && mode === "main") {
    mode = "intro";
    introFrame = 0;
    textCount = 0; // 인트로 시작할 때 문장 번호 초기화
  }
  // 인트로에서 Enter -> 다음 문장으로
  else if (keyCode === ENTER && mode === "intro") {
    if (textCount < 4) {
      textCount += 1; // 0→1→2→3
    } else {
      mode = "question_1"; // 마지막 문장 보고 나면 다음 화면으로
    }
  } else if (keyCode === ENTER && mode === "question_1") {
    input_1();
  } else if (keyCode === ENTER && mode === "question_2") {
    input_2();
  } else if (keyCode === ENTER && mode === "question_3") {
    input_3();
  } else if (keyCode === ENTER && mode === "question_4") {
    input_4();
  }

  if (
    keyCode === ESCAPE ||
    (keyCode === BACKSPACE && !mode.startsWith("question_"))
  ) {
    handleBack();
    return false;
  }
}

function handleBack() {
  if (mode === "intro") {
    if (textCount > 0) {
      textCount -= 1;
    } else {
      mode = "main";
    }
  }
}

let shootingStars = [];
let NUM_STARS = 120;

function initStars() {
  back_stars = [];
  for (let i = 0; i < NUM_STARS; i++) {
    back_stars.push({
      x: random(width),
      y: random(height),
      baseSize: random(1, 3),
      sizeOffset: random(0, TWO_PI),
      baseBrightness: random(150, 255),
      brightOffset: random(0, TWO_PI),
      twinkleSpeed: random(0.01, 0.03),
    });
  }
}

function spawnShootingStar() {
  if (random() < 0.005) {
    shootingStars.push({
      x: random(width),
      y: random(height * 0.4),
      vx: random(8, 12),
      vy: random(3, 6),
      size: random(2, 4),
      life: 60,
    });
  }
}

function updateShootingStars() {
  for (let s of shootingStars) {
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 1;
  }
  shootingStars = shootingStars.filter((s) => s.life > 0);
}

function drawShootingStars() {
  push();
  for (let s of shootingStars) {
    stroke(255, 255, 255, 200);
    strokeWeight(s.size);
    line(s.x, s.y, s.x - s.vx * 2, s.y - s.vy * 2);
  }
  pop();
  noStroke();
}

function backgroundStar() {
  background(0);

  if (back_stars.length === 0) initStars();

  noStroke();
  for (let s of back_stars) {
    const b =
      s.baseBrightness + sin(frameCount * s.twinkleSpeed + s.brightOffset) * 50;

    const sz =
      s.baseSize + sin(frameCount * s.twinkleSpeed + s.sizeOffset) * 0.5;

    fill(b);
    ellipse(s.x, s.y, sz, sz);
  }

  spawnShootingStar();
  updateShootingStars();
  drawShootingStars();

  if (mode === "main") {
    renderSavedStars();
  }
}

// 메인

function drawImageAspect(img, x, y, maxW, maxH) {
  let iw = img.width;
  let ih = img.height;

  let ratio = min(maxW / iw, maxH / ih);
  let newW = iw * ratio;
  let newH = ih * ratio;

  image(img, x, y, newW, newH);
}

function main_frame() {
  stroke(255);
  fill(255);
  renderSavedStars();

  drawImageAspect(titleImage, width * 0.5, height * 0.45, width, height);
  drawImageAspect(titleDescription, width * 0.5, height * 0.8, 400, height);
}

function renderLoadingText(textString) {
  if (!dialogImage) return;

  const textStr = String(textString ?? "");
  const lines = textStr.split("\n");

  const paddingX = 64;
  const paddingY = 16;

  textSize(rh(SMALL_TEXT_SIZE));
  textAlign(LEFT, TOP);

  let maxLineWidth = 0;
  for (let line of lines) {
    const w = textWidth(line);
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const bubbleWidth = maxLineWidth + paddingX * 2;

  const lineHeight = rh(SMALL_TEXT_SIZE) + 8;
  const textHeight = lines.length * lineHeight;

  const bubbleHeight = textHeight + paddingY * 2;

  const cx = width / 2;
  const cy = height * 0.8;

  image(dialogImage, cx, cy, bubbleWidth, bubbleHeight + 350);

  fill(0);
  textAlign(CENTER);

  const startY = cy - bubbleHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    text(lines[i], cx, startY + i * lineHeight);
  }
}

// 인트로

function intro() {
  introFrame++;

  // 0~120프레임 동안 페이드아웃
  let a = map(introFrame, 0, 120, 255, 0, true);

  noStroke();
  fill(0, 0, 0, a);
  rect(0, 0, width, height);

  intro_text();
}

function intro_text() {
  fill(255);
  textAlign(CENTER, CENTER);

  textSize(rh(MEDIUM_TEXT_SIZE));
  text("--> Next (Press Enter)", width * 0.8, height * 0.9);
  text("<-- Back (Backspace)", width * 0.2, height * 0.9);

  textSize(rh(LARGE_TEXT_SIZE));

  if (textCount === 0) {
    text(
      "누구나 한 번쯤은 밤하늘을 올려다보며\n간절한 소원을 빌어본 순간이 있을 겁니다.",
      width * 0.5,
      height * 0.5
    );
  } else if (textCount === 1) {
    text(
      "하늘에서 지상으로 내리는 별똥별은\n" +
        "신들이 사람들의 소원을 듣고 있는 순간이라는 믿음처럼,\n" +
        "사람들은 오래 전부터 드넓게 펼쳐진 밤하늘이\n" +
        "신들의 영역과 관련된 통로라고 생각해왔습니다.",
      width * 0.5,
      height * 0.5
    );
  } else if (textCount === 2) {
    text(
      "그러나 어두운 밤하늘의 길잡이가 되어준 별에게 비는 소원은\n" +
        "길을 잃지 않고 신들에게 닿을지도 모르죠.",
      width * 0.5,
      height * 0.5
    );
  } else if (textCount === 3) {
    text(
      "올 한 해를 되돌아보며 의미있는 순간들을 담아보세요.\n" +
        "지나간 시간들이 자취로 남아 앞으로를 향한 소원을 이루어줄 테니까요.",
      width * 0.5,
      height * 0.5
    );
  } else if (textCount === 4) {
    renderStarInfo();
  }
}

function drawTooltip(textStr, x, y, direction = "up") {
  push();
  const padding = 8;
  textSize(rh(SMALL_TEXT_SIZE));
  textAlign(LEFT, TOP);

  // 여러 줄 텍스트 처리
  const lines = textStr.split("\n");
  const lineHeight = textAscent() + textDescent() + 4;
  const maxWidth = Math.max(...lines.map((line) => textWidth(line.trim())));
  const totalHeight = lines.length * lineHeight;

  rectMode(CORNER);
  noStroke();
  fill(0, 180);

  const rectX = x - maxWidth / 2 - padding;
  const rectY = direction === "down" ? y + 20 : y - totalHeight - padding - 20;
  const rectW = maxWidth + padding * 2;
  const rectH = totalHeight + padding * 2;

  rect(rectX, rectY, rectW, rectH, 6);

  fill(255);
  let currentY = rectY + padding;
  for (let i = 0; i < lines.length; i++) {
    text(lines[i].trim(), x - maxWidth / 2, currentY);
    currentY += lineHeight;
  }
  pop();
}

function renderStarInfo() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(rh(LARGE_TEXT_SIZE));

  const lineHeight = rh(LARGE_TEXT_SIZE) + 10;
  const imageSize = rh(50);
  const gap = rh(80);
  const imageGap = rh(30);

  const totalHeight = lineHeight + 3 * (lineHeight + gap) + lineHeight * 2;
  let currentY = height / 2 - totalHeight / 2 + lineHeight / 2;

  text(
    "3개의 질문에 따라 당신만의 별자리가 완성될 거예요.\n",
    width / 2,
    currentY
  );
  currentY += lineHeight;

  text("첫 번째 질문으로 별의 모양이,\n", width / 2, currentY);
  currentY += lineHeight;

  const imagesPerRow = 5;
  const totalImageWidth =
    imagesPerRow * imageSize + (imagesPerRow - 1) * imageGap;
  let imageStartX = width / 2 - totalImageWidth / 2 + imageSize / 2;

  for (let i = 0; i < 5; i++) {
    const imgX = imageStartX + i * (imageSize + imageGap);
    imageMode(CENTER);

    const img = baseStarImages[i];
    let iw = img.width;
    let ih = img.height;
    let ratio = min(imageSize / iw, imageSize / ih);
    let drawW = iw * ratio;
    let drawH = ih * ratio;

    drawImageAspect(img, imgX, currentY, imageSize, imageSize);

    if (
      mouseX >= imgX - drawW / 2 &&
      mouseX <= imgX + drawW / 2 &&
      mouseY >= currentY - drawH / 2 &&
      mouseY <= currentY + drawH / 2
    ) {
      drawTooltip(emotionMapping[i], imgX, currentY);
    }
  }
  currentY += lineHeight + gap;

  text("두 번째 질문으로 별의 색상이,\n", width / 2, currentY);
  currentY += lineHeight;

  imageStartX = width / 2 - totalImageWidth / 2 + imageSize / 2;
  for (let i = 0; i < 5; i++) {
    const imgX = imageStartX + i * (imageSize + imageGap);
    imageMode(CENTER);

    const img = coloredStarImages[4][i];
    let iw = img.width;
    let ih = img.height;
    let ratio = min(imageSize / iw, imageSize / ih);
    let drawW = iw * ratio;
    let drawH = ih * ratio;

    drawImageAspect(img, imgX, currentY, imageSize, imageSize);

    if (
      mouseX >= imgX - drawW / 2 &&
      mouseX <= imgX + drawW / 2 &&
      mouseY >= currentY - drawH / 2 &&
      mouseY <= currentY + drawH / 2
    ) {
      drawTooltip(emotionMapping[i], imgX, currentY);
    }
  }
  currentY += lineHeight + gap;

  text("세 번째 질문으로 별의 밝기가 결정될 거예요.\n", width / 2, currentY);
  currentY += lineHeight;

  imageStartX = width / 2 - totalImageWidth / 2 + imageSize / 2;
  for (let i = 0; i < 5; i++) {
    const scale = 1.5 + i * 0.15;
    const imgX = imageStartX + i * (imageSize + imageGap);
    imageMode(CENTER);

    const img = lumStarImages[4][4][i];
    let iw = img.width;
    let ih = img.height;
    let ratio = min((imageSize * scale) / iw, (imageSize * scale) / ih);
    let drawW = iw * ratio;
    let drawH = ih * ratio;

    drawImageAspect(img, imgX, currentY, imageSize * scale, imageSize * scale);

    if (
      mouseX >= imgX - drawW / 2 &&
      mouseX <= imgX + drawW / 2 &&
      mouseY >= currentY - drawH / 2 &&
      mouseY <= currentY + drawH / 2
    ) {
      drawTooltip(lumMapping[i], imgX, currentY);
    }
  }
  currentY += lineHeight + gap;
  textSize(rh(SMALL_TEXT_SIZE));
  fill(128);
  text(
    "각 별 위에 마우스를 올리면 별의 정보를 확인할 수 있어요.\n",
    width / 2,
    currentY
  );
}

//질문 1

let inputBox;

function question_1() {
  renderQuestionText(
    "2025년에 시간과 에너지를 가장 많이 투자한 일은 무엇이었나요?\n그 일의 성과는 어떠했나요?"
  );

  renderAnswerInput();
}

function keyTyped() {
  if (mode === "question_1" && key !== "Enter") {
    userInput += key;
  }
}

function input_1() {
  if (isInputEmpty()) {
    showInputWarning = true;
    inputWarningStartTime = millis();
    return;
  }
  showInputWarning = false;
  getUserInput();
  mode = "loading_1";
  loadingStartTime = millis();
  loadingProgress = 0;
}

function loading_1() {
  loadingUI();
  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(SYSTEM_PROMPT, userInput).then(async (result) => {
      try {
        emotionResult = JSON.parse(result).emotion;
        emotionResults[0] = emotionResult;
        collectedEmotions.push(emotionResult);
        totalEmotions[emotionResult] += 10;
        stars.forEach((s) => {
          s.image = baseStarImages[emotionResult];
        });
      } catch (e) {
        console.error("JSON parse error:", result);
      }
      isCallingLLM = false;
    });
  }
  if (emotionResults[0] !== null) {
    mode = "description_1";
    hasCalledLLM = false;
    startStarReveal();
  }

  renderLoadingText(`디즈니 영화 오프닝에서 배경 음악으로 사용되는 음악의 제목이 
    피노키오의 주제곡인 ‘When you wish upon a star’라는 사실을 알고 있었나요? 
    나무 인형 피노키오를 만든 제페토 할아버지가 밤하늘의 밝은 별을 보며 피노키오가 진짜 사람이 되기를 소원하자, 
    그 소원을 들은 요정들이 피노키오에게 생명을 불어넣어 주었죠.`);
}

//질문 2

function question_2() {
  renderMainStars();
  renderQuestionText(
    "2025년에 가장 많이 했던 생각은 무엇인가요?\n2025년에 가장 자주 했던 말은 무엇인가요?"
  );
  renderAnswerInput();
}

function input_2() {
  if (isInputEmpty()) {
    showInputWarning = true;
    inputWarningStartTime = millis();
    return;
  }
  showInputWarning = false;
  getUserInput();
  mode = "loading_2";
  emotionResult = null;
  factLoading = about_stars();
}

function loading_2() {
  renderMainStars();

  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(SYSTEM_PROMPT, userInput).then(async (result) => {
      try {
        emotionResult = JSON.parse(result).emotion;
        emotionResults[1] = emotionResult;
        totalEmotions[emotionResult] += 10;
        collectedEmotions.push(emotionResult);
      } catch (e) {
        console.error("JSON parse error:", result);
      }
      isCallingLLM = false;
    });
  }

  renderLoadingText(factLoading);

  if (emotionResults[1] !== null && !hasStartedStarColoring) {
    hasStartedStarColoring = true;
    startStarColoring();
    mode = "description_2";
  }
}

function startStarColoring() {
  starColorIndex = 0;

  colorNextStar();
}

function colorNextStar() {
  if (starColorIndex >= stars.length) {
    mode = "question_3";
    return;
  }

  let img = coloredStarImages[emotionResults[0]][emotionResults[1]];
  stars[starColorIndex].image = img;
  triggerPop(stars[starColorIndex]);
  starColorIndex++;

  setTimeout(colorNextStar, 500);
}

function about_stars() {
  //별자리와 관련한 사실들을 리스트로 만들어 random추출하기
  abouts = [
    "별자리 , 천문학 에서 특정 그룹 중 하나적어도 이름을 붙인 사람들이 상상했던 별들은\n 하늘에서 눈에 띄는 물체나 생물의 형태를 이룬다고 믿었습니다.",
    "별자리는 고대 바빌로니아인들이 유목 생활을 하며 밤하늘의 별에 모양을 붙이기 시작한 데서 유래했습니다.",
    "자신의 생일날에 자신의 탄생 별자리를 볼 수가 없다는 것을 아셨나요?.\n 자신의 탄생 별자리는 생일에서 6개월 정도 전후에만 밤하늘에서 찾아볼 수 있습니다.",
    "국제천문연맹은 1928년, 황도 12궁을 포함한 88개의 별자리를 공식적으로 확정지었습니다.",
    "가장 큰 별자리는 밤하늘의 면적 중 3.16%를 차지하는 바다뱀 자리입니다.",
    "가장 작은 별자리는 남쪽 하늘의 가장 인기 있는 별자리 중 하나인 남십자자리입니다.",
    "밤하늘에서 가장 밝은 별은 큰개자리에 있는 시리우스입니다.",
  ];
  const fact = "- 별자리와 관련한 사실 -\n" + random(abouts);
  return fact;
}

//질문 3

function question_3() {
  renderMainStars();
  renderQuestionText(
    "지나간 2025년의 하루로 돌아갈 수 있다면,\n그날의 자신에게 어떤 말을 해주고 싶나요?"
  );
  renderAnswerInput();
}

function input_3() {
  if (isInputEmpty()) {
    showInputWarning = true;
    inputWarningStartTime = millis();
    return;
  }
  showInputWarning = false;
  getUserInput();
  emotionResult = null;
  hasCalledLLM = false;
  mode = "loading_3";
  mythLoading = stars_myth();
}

function loading_3() {
  renderMainStars();

  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(LUM_SYSTEM_PROMPT, userInput).then(async (result) => {
      try {
        emotionResult = JSON.parse(result).emotion;
        intensityResult = JSON.parse(result).intensity;
        emotionResults[2] = emotionResult;
        collectedEmotions.push(emotionResult);
        totalEmotions[emotionResult] += 10;
      } catch (e) {
        console.error("JSON parse error:", result);
      }
      isCallingLLM = false;
    });
  }

  renderLoadingText(mythLoading);

  if (emotionResults[2] !== null) {
    startStarLum();
    mode = "description_3";
  }
}

function startStarLum() {
  starLumIndex = 0;

  lumNextStar();
}

function lumNextStar() {
  if (starLumIndex >= stars.length) {
    mode = "question_4";
    return;
  }

  let img =
    lumStarImages[emotionResults[0]][emotionResults[1]][intensityResult];
  stars[starLumIndex].image = img;
  stars[starLumIndex].sizeScale = 2;
  triggerPop(stars[starLumIndex]);
  starLumIndex++;

  setTimeout(lumNextStar, 500);
}

function stars_myth() {
  //별자리와 관련한 신화들을 리스트로 만들어 random추출하기
  myth_list = [
    `- 오리온자리에 관한 신화 -
    오리온자리는 달의 여신 아르테미스를 사랑한 대가로 그녀의 화살에 맞아 죽음을 당한 사냥꾼 오리온의 별자리입니다.
    안타까운 것은, 아르테미스가 그에게 화살을 쏜 이유는 둘의 결혼을 반대한 오빠 아폴론의 계략 때문이라는 것입니다.`,
    `- 백조자리에 관한 신화 -
    백조자리는 한여름 밤, 머리 위로 높이 지나가는 십자가 모양이 별자리입니다.
    이러한 백조자리는 제우스가 백조로 변신한 모습이라는 사실, 아셨나요?
    제우스는 스파르타의 왕 틴다레오스의 아내, 레다가 백조를 사랑한다는 정보를 듣고 백조로 탈바꿈하여 그녀와 사랑을 나눕니다.
    그때 제우스의 모습이 백조자리가 되었답니다.`,
    `- 전갈자리에 관한 신화 - 
    사냥꾼인 오리온의 자만심 가득한 말에 화가 난 헤라가 오리온을 죽이려고 전갈을 풀어놓았습니다.
    이 전갈은 비록 오리온을 죽이지는 못했지만, 오리온을 죽였다는 공로로 하늘의 별자리가 되었습니다.
    그렇기에 동쪽하늘에서 전갈자리가 떠오를 때면 오리온자리는 서쪽하늘로 달아나 져버립니다.`,
    `- 물병자리에 관한 신화 -
    물병자리는 독수리에게 납치당해 신들에게 술을 따르는 일을 하게 된 트로이의 왕자, 가니메데입니다.
    미소년 가니메데는 독수리로 변한 제우스에게 납치 당해 술을 따르는 일을 하게 되었습니다.`,
    `- 거문고자리에 관한 신화 -
    오르페우스는 자신의 아름다운 아내, 에우리디케를 살리기 위해 지하세계의 왕 하데스와 페르세포네 앞에서 거문고를 연주합니다.
    이에 감동받은 페르세포네가 에우리디케를 데려가도 좋다고 허락하면서, 땅 위에 이를 때까지 뒤를 돌아보지 말라고 경고합니다.
    그러나 오르페우스가 땅위에 다다를 무렵, 에우리디케가 뒤따라오는지 걱정이 되어 뒤를 돌아보았고, 
    그 순간 에우리디케는 다시는 돌아올 수 없는 어둠 속으로 사라지게 되었습니다. 그 후 오르페우스는 실의에 빠져 결국 죽고 맙니다.
    주인을 잃은 거문고에서는 슬프고 아름다운 음악이 계속 흘러나왔고, 제우스는 이 음악에 매료되어 거문고를 하늘로 올려 영원히 그의 음악을 기억하게 하였습니다.`,
    `- 물고기자리에 관한 신화 -
    물고기자리의 두 물고기는 미의 여신 아프로디테와 아들 에로스가 변신한 것입니다. 
    아프로디테와 에로스가 강의 정취를 즐기고 있을 때 괴물 티폰이 나타났고, 깜짝 놀란 두 신은 물고기로 변신하여 강물에 뛰어들었습니다.
    그 두 신의 모습이 하늘의 물고기자리가 되었답니다.`,
  ];
  const myth = random(myth_list);
  return myth;
}

//질문 4(소원)

function question_4() {
  renderMainStars();
  renderQuestionText(
    "2025년의 나날을 기억하며, 다가오는 2026년에 이루고 싶은 소망은 무엇인가요?"
  );
  renderAnswerInput();
}

function input_4() {
  if (isInputEmpty()) {
    showInputWarning = true;
    inputWarningStartTime = millis();
    return;
  }
  showInputWarning = false;
  getUserInput();
  mode = "drag_stars";
  hasCalledLLM = false;
  emotionResult = null;

  const normTargets = createStarsTargets(drag_index);
  targetPositions = normTargets.map((t) => {
    const pos = getTargetScreenPos(t);
    return {
      ...pos,
      occupied: false,
    };
  });
  for (let s of stars) {
    s.locked = false;
    s.lockedTargetIndex = null;
    s.dragged = false;
  }
}

let drag_index = 0;
// 질문1에서 생성되는 별자리 및 별 개수의 인덱스와 동일
// 프로토타입용으로 현재 0으로 임의로 설정

function createStarsTargets(drag_index) {
  const targets = [
    [
      // for test
      { rx: 0.743, ry: 0.234 },
      { rx: 0.664, ry: 0.175 },
      { rx: 0.543, ry: 0.338 },
      { rx: 0.548, ry: 0.46 },
      { rx: 0.657, ry: 0.542 },
      { rx: 0.697, ry: 0.668 },
      { rx: 0.875, ry: 0.679 },
      { rx: 0.914, ry: 0.592 },
      { rx: 0.207, ry: 0.608 },
      { rx: 0.256, ry: 0.773 },
      { rx: 0.061, ry: 0.894 },
    ],
    [
      //dragImage[1][1]
      { rx: 0.388, ry: 0.393 },
      { rx: 0.774, ry: 0.186 },
      { rx: 0.662, ry: 0.418 },
      { rx: 0.461, ry: 0.541 },
      { rx: 0.298, ry: 0.693 },
      { rx: 0.133, ry: 0.765 },
      { rx: 0.615, ry: 0.728 },
      { rx: 0.747, ry: 0.893 },
    ],
    [
      //dragImage[2][1]
      { rx: 0.57, ry: 0.457 },
      { rx: 0.604, ry: 0.796 },
      { rx: 0.859, ry: 0.868 },
      { rx: 0.912, ry: 0.493 },
      { rx: 0.434, ry: 0.295 },
      { rx: 0.283, ry: 0.123 },
      { rx: 0.081, ry: 0.177 },
    ],
    [
      //dragImage[3][1]
      { rx: 0.402, ry: 0.194 },
      { rx: 0.252, ry: 0.295 },
      { rx: 0.38, ry: 0.526 },
      { rx: 0.458, ry: 0.586 },
      { rx: 0.566, ry: 0.691 },
      { rx: 0.502, ry: 0.802 },
      { rx: 0.615, ry: 0.386 },
      { rx: 0.764, ry: 0.492 },
      { rx: 0.92, ry: 0.473 },
    ],
    [
      //dragImage[4][1]
      { rx: 0.833, ry: 0.239 },
      { rx: 0.812, ry: 0.321 },
      { rx: 0.456, ry: 0.393 },
      { rx: 0.315, ry: 0.379 },
      { rx: 0.18, ry: 0.393 },
      { rx: 0.109, ry: 0.372 },
      { rx: 0.292, ry: 0.577 },
      { rx: 0.558, ry: 0.717 },
      { rx: 0.608, ry: 0.661 },
    ],
    [
      //dragImage[5][1]
      { rx: 0.463, ry: 0.141 },
      { rx: 0.505, ry: 0.393 },
      { rx: 0.595, ry: 0.545 },
      { rx: 0.737, ry: 0.524 },
      { rx: 0.95, ry: 0.44 },
      { rx: 0.248, ry: 0.514 },
      { rx: 0.409, ry: 0.67 },
      { rx: 0.315, ry: 0.864 },
      { rx: 0.065, ry: 0.455 },
    ],
  ];

  return targets[drag_index];
}

function getTargetScreenPos(target) {
  let originalW = dragImage_1.width;
  let originalH = dragImage_1.height;

  let scaledW = width * 0.7;
  let scaledH = originalH * (scaledW / originalW);

  let cx = width / 2;
  let cy = height / 2;

  let x = cx - scaledW / 2 + scaledW * target.rx;
  let y = cy - scaledH / 2 + scaledH * target.ry;

  return { x, y };
}

function mousePressed() {
  if (mode === "drag_stars") {
    for (let i = 0; i < stars.length; i++) {
      let s = stars[i];

      let d = dist(mouseX, mouseY, s.x, s.y);
      if (d < 20) {
        draggedStarIndex = i;

        if (s.locked) {
          s.locked = false;
          if (typeof s.lockedTargetIndex === "number") {
            const t = targetPositions[s.lockedTargetIndex];
            if (t) t.occupied = false;
          }
          s.lockedTargetIndex = null;
        }
        break;
      }
    }
  } else if (mode === "last") {
    const btnX = width - width * 0.15;
    const btnY = 100;
    const btnW = width * 0.1;
    const btnH = height * 0.1;

    if (
      mouseX > btnX &&
      mouseX < btnX + btnW &&
      mouseY > btnY &&
      mouseY < btnY + btnH
    ) {
      hardResetToMain();
    }
  }
}

function snapIfStarClose() {
  if (draggedStarIndex === -1) return;
  if (!targetPositions || targetPositions.length === 0) return;

  const s = stars[draggedStarIndex];

  for (let i = 0; i < targetPositions.length; i++) {
    const t = targetPositions[i];

    if (t.occupied && s.lockedTargetIndex !== i) continue;

    const d = dist(s.x, s.y, t.x, t.y);
    if (s.dragged && d <= SNAP_THRESHOLD) {
      // if (
      //   typeof s.lockedTargetIndex === "number" &&
      //   s.lockedTargetIndex !== i
      // ) {
      //   const old = targetPositions[s.lockedTargetIndex];
      //   if (old) old.occupied = false;
      // }

      s.x = t.x;
      s.y = t.y;
      s.locked = true;
      s.lockedTargetIndex = i;
      t.occupied = true;

      draggedStarIndex = -1;
      break;
    }
  }
}

function mouseDragged() {
  if (mode === "drag_stars" && draggedStarIndex !== -1) {
    const s = stars[draggedStarIndex];
    s.dragged = true;
    if (!s.locked) {
      s.x = mouseX;
      s.y = mouseY;
      snapIfStarClose();
    }
  }
}

function mouseReleased() {
  draggedStarIndex = -1;
}

function checkStarsComplete() {
  if (!targetPositions || targetPositions.length === 0) return false;

  for (let t of targetPositions) {
    let found = false;

    for (let s of stars) {
      if (!s.locked) continue;

      const d = dist(s.x, s.y, t.x, t.y);
      if (d < SNAP_THRESHOLD) {
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }
  }

  return true;
}

function draw_dragImage() {
  if (dragImage_1 && dragImage_1.width > 0) {
    const originalW = dragImage_1.width;
    const originalH = dragImage_1.height;

    const scaledW = width * 0.7;
    const scaledH = originalH * (scaledW / originalW);

    const cx = width / 2;
    const cy = height / 2;

    image(dragImage_1, cx, cy, scaledW, scaledH);
  } else {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(rh(MEDIUM_TEXT_SIZE));
    text("이미지를 불러오는 중입니다...", width / 2, height / 2);
  }
}

function getDragImageXBounds() {
  const scaledW = width * 0.7;
  const cx = width / 2;

  const startX = Math.floor(cx - scaledW / 2); // 시작 x좌표
  const endX = Math.floor(cx + scaledW / 2); // 끝 x좌표

  return { startX, endX, centerX: cx, width: scaledW };
}

function drag_stars() {
  draw_dragImage();
  renderMainStars();
  renderStarsTargets();
  renderDragInstruction();

  if (checkStarsComplete() && !transitioning) {
    transitioning = true;
    goToLastMode();
  }
}

let lastEnteredAt = 0; //last 모드 진입 시각

async function goToLastMode() {
  await delay(1000);
  mode = "loadingLast";
  lastEnteredAt = millis();
}

function renderDragInstruction() {
  push();
  textSize(rh(MEDIUM_TEXT_SIZE));
  textAlign(CENTER, CENTER);
  fill(255);

  const dialogX = width / 12;
  const dialogY = height * 0.1;
  const dialogSize = 150;

  drawImageAspect(dialogImage, dialogX, dialogY, dialogSize, dialogSize);

  fill(0);
  textSize(rh(SMALL_TEXT_SIZE));
  text("주의사항", dialogX, dialogY - 5);

  const warningText = `-주의사항-\n
1. 별을 마우스로 클릭한 뒤, 클릭한 상태로 별자리 선 위의 점 위치로 별을 가져다 놓아주세요.\n
2. 모든 별을 마우스로 한 번 이상 클릭해야 합니다.\n
3. 만약 별자리가 완성된 것처럼 보이나 다음 화면으로 넘어가지 않는다면, 모든 별들을 한 번씩 마우스로 건드려 보세요.\n
4. 오류가 발생한다면 -처음으로- 글씨를 클릭해주시길 바랍니다.`;

  if (
    mouseX >= dialogX - dialogSize / 2 &&
    mouseX <= dialogX + dialogSize / 2 &&
    mouseY >= dialogY - dialogSize / 2 &&
    mouseY <= dialogY + dialogSize / 2
  ) {
    drawTooltip(warningText, width / 2, dialogY + 50, "down");
  }

  fill(255);
  text(
    "별을 움직여 소원을 담은 별자리를 완성시켜주세요.",
    width / 2,
    height * 0.9
  );

  pop();
}

function renderStarsTargets() {
  if (!targetPositions || targetPositions.length === 0) return;

  //   noStroke();
  //   fill(255, 255, 255, 180); // 약간 투명한 흰색 원

  //   for (let t of targetPositions) {
  //     ellipse(t.x, t.y, 20, 20);   // 지름 20 원
  //   }
}

function loadingLast() {
  backgroundStar();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(rh(MEDIUM_TEXT_SIZE));
  text(
    "당신의 별자리가 완성되었습니다. 잠시만 기다려 주세요...",
    width / 2,
    height * 0.4
  );

  let dots = floor((millis() / 400) % 4);
  let dotString = ".".repeat(dots);

  textSize(rh(MEDIUM_TEXT_SIZE));
  text(dotString, width / 2, height * 0.5);

  goToLastMode_2();
}

let loadingLasttime = 0;

async function goToLastMode_2() {
  await delay(5000);
  mode = "last";
  loadingLasttime = millis();
}

function last() {
  //최종화면
  backgroundStar();
  draw_dragImage();
  renderMainStars();

  textSize(rh(MEDIUM_TEXT_SIZE));
  textAlign(CENTER, CENTER);
  fill(255);
  text(userInput, width / 2, height * 0.8);

  if (!hasUploadedCapture) {
    let cropped = get(
      getDragImageXBounds().startX,
      0,
      getDragImageXBounds().width,
      windowHeight
    );
    let base64 = cropped.canvas.toDataURL("image/png");
    uploadCapture(base64);
  }

  if (!lastStarSaved) {
    saveCurrentStar();
    lastStarSaved = true;
  }

  if (!isRadarAnimating) isRadarAnimating = true;

  if (isRadarAnimating) {
    updateRadarValues();
  }

  radar_chart();
  reset(); //일정시간 지나면 메인화면으로 전환
}

function updateRadarValues() {
  for (let key in currentEmotions) {
    currentEmotions[key] = lerp(currentEmotions[key], totalEmotions[key], 0.05);

    if (abs(currentEmotions[key] - totalEmotions[key]) < 0.1) {
      currentEmotions[key] = totalEmotions[key];
    }
  }

  if (
    Object.keys(currentEmotions).every(
      (k) => currentEmotions[k] === totalEmotions[k]
    )
  )
    isRadarAnimating = false;
}

function drawForCapture(layer) {
  layer.clear();

  if (dragImage_1 && dragImage_1.width > 0) {
    const originalW = dragImage_1.width;
    const originalH = dragImage_1.height;

    const scaledW = width * 0.7;
    const scaledH = originalH * (scaledW / originalW);

    const cx = width / 2;
    const cy = height / 2;

    layer.image(dragImage_1, cx, cy, scaledW, scaledH);
  }

  for (let s of stars) {
    if (!s.image) continue;

    const iw = s.image.width;
    const ih = s.image.height;
    if (iw <= 0 || ih <= 0) continue;

    const sizeScale = s.sizeScale ?? 1;
    const maxW = 30 * sizeScale;
    const maxH = 30 * sizeScale;
    const ratio = Math.min(maxW / iw, maxH / ih);
    const w = iw * ratio;
    const h = ih * ratio;

    layer.image(s.image, s.x, s.y, w, h);
  }
}

function captureStarImage() {
  drawForCapture(captureLayer);

  const bounds = getDragImageXBounds();
  const cropimage = captureLayer.get(
    bounds.startX,
    0,
    bounds.width,
    windowHeight
  );

  return cropimage;
}

function saveCurrentStar() {
  const userImg = captureStarImage();
  userStars.push(userImg);

  if (userStars.length > MAX_USER_STARS) {
    userStars.shift();
  }
}

function renderSavedStars() {
  if (!userStars || userStars.length === 0) return;

  for (let i = 0; i < userStars.length; i++) {
    const backImg = userStars[i];
    if (!backImg) continue;
    const backX = width * (0.05 + (i + 1) * 0.15);

    const distFromCenter = Math.abs(i - 2);
    let yValues = {
      0: 0.2,
      1: 0.8,
      2: 0.5,
    };
    const backY = height * yValues[distFromCenter];

    push();
    tint(255, 180);
    const drawW = backImg.width * 0.4;
    const drawH = backImg.height * 0.4;
    image(backImg, backX, backY, drawW, drawH);
    pop();
  }
}

function radar_chart() {
  //레이더 차트
  stroke(200);
  strokeWeight(1);
  let x = width * 0.12;
  let y = height * 0.8;

  for (let i = 0; i < 6; i++) {
    let r1 = 100;
    let r2 = 20;

    let dx = r1 * cos(i * 72 - 90);
    let dy = r1 * sin(i * 72 - 90);

    line(x, y, x + dx, y + dy);

    for (let j = 0; j < 5; j++) {
      let dxax = r2 * cos(i * 72 - 90);
      let dyax = r2 * sin(i * 72 - 90);

      let nextdxax = r2 * cos((i + 1) * 72 - 90);
      let nextdyax = r2 * sin((i + 1) * 72 - 90);

      line(x + dxax, y + dyax, x + nextdxax, y + nextdyax);

      r2 = r2 + 20;
    }
  }

  let dx1 = currentEmotions[0] * cos(72 - 90);
  let dy1 = currentEmotions[0] * sin(72 - 90);

  let dx2 = currentEmotions[1] * cos(2 * 72 - 90);
  let dy2 = currentEmotions[1] * sin(2 * 72 - 90);

  let dx3 = currentEmotions[2] * cos(3 * 72 - 90);
  let dy3 = currentEmotions[2] * sin(3 * 72 - 90);

  let dx4 = currentEmotions[3] * cos(4 * 72 - 90);
  let dy4 = currentEmotions[3] * sin(4 * 72 - 90);

  let dx5 = currentEmotions[4] * cos(5 * 72 - 90);
  let dy5 = currentEmotions[4] * sin(5 * 72 - 90);

  noStroke();
  fill("#FDBE02");
  beginShape();
  vertex(x + dx1, y + dy1);
  vertex(x + dx2, y + dy2);
  vertex(x + dx3, y + dy3);
  vertex(x + dx4, y + dy4);
  vertex(x + dx5, y + dy5);
  vertex(x + dx1, y + dy1);
  endShape();

  text("Calm", x + 100, y - 30);
  text("Sadness", x + 50, y + 100);
  text("Hope", x - 80, y + 100);
  text("Fear", x - 130, y - 30);
  text("Happiness", x - 15, y - 107);
}

function reset() {
  fill(255);
  textAlign(CENTER, CENTER);

  const col = FlexColumn({
    x: width - rw(250),
    y: rh(100),
    width: rw(200),
    align: "center",
    gap: rh(-24),
  });

  imageMode(CENTER);
  col.add(
    () => {
      drawImageAspect(resetButtonImg, 0, 0, rw(100), rh(100));
    },
    rh(100),
    rw(100)
  );

  textSize(rh(SMALL_TEXT_SIZE));
  const textW = textWidth("1분 후 자동으로처음 화면으로 돌아갑니다.");
  col.add(
    () => {
      text("1분 후 자동으로\n처음 화면으로 돌아갑니다.", 0, 0);
    },
    rh(30),
    textW
  );
  if (!resetScheduled) {
    resetScheduled = true;
    timer = setTimeout(() => {
      hardResetToMain();
    }, 60000);
  }
}

// function interrupt(){
//   text("처음으로", width*0.1, height*0.1)
//   hardResetToMain();
// }

function hardResetToMain() {
  clearTimeout(timer);
  uploadRequestId += 1;
  userInput = "";
  back_stars = [];

  loadingProgress = 0;
  loadingStartTime = 0;

  hasUploadedCapture = false;
  qrcodeElement.style.opacity = 0;
  if (qrcodeLoadingElement) qrcodeLoadingElement.style.opacity = 0;
  if (qrcodeSkeletonElement) qrcodeSkeletonElement.style.opacity = 0;

  isCallingLLM = false;
  hasCalledLLM = false;

  emotionResult = null;
  intensityResult = null;
  emotionResults.fill(null);

  starColorIndex = 0;

  starLumIndex = 0;

  factLoading = null;

  stars = stars_loc();
  revealedStars = 0;
  isRevealing = false;

  draggedStarIndex = -1;
  targetPositions = [];

  collectedEmotions.length = 0;

  transitioning = false;
  resetScheduled = false;
  lastStarSaved = false;

  lastEnteredAt = 0;

  mode = "main";
  hasStartedStarColoring = false;
}
