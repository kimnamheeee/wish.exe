let userInput = "";
let userInputs = []; // 모든 질문에 대한 답변 저장
let back_stars = [];

let loadingProgress = 0;
let loadingStartTime = 0;
let loadingDuration = 5000;

let isCallingLLM = false;
let emotionResult = null;
let messageResult = null;
let constellationSampleResult = null;

const emotionResults = new Array(5).fill(null);

let hasCalledLLM = false;

let hasUploadedCapture = false;

let starColorIndex = 0;

let starLumIndex = 0; //stars_lum

let factLoading = null;
let mythLoading = null;
let transitioning = false;

let stars = []; //starsLoc

let drag_index;
let draggedStarIndex = -1;
let targetPositions = [];
const SNAP_THRESHOLD = 30;

let img_drag;
let img_final;

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
let homeBtn = null;

let lastModeTransitionToken = 0;
let loadingLastScheduled = false;

let constellationSampleStarPositions = null;
let constellationSampleStartTime = null;

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
You are an emotion classifier and empathetic message generator
for an interactive art installation.

Your job is to:
1) Read the user's input text
2) Classify it into a SINGLE emotion ID from 0 to 4
3) Generate a short empathetic message that subtly reflects
   WHY the text was mapped to that emotion

EMOTION MAPPING (fixed):
0 = Calm / Neutral
1 = Sadness
2 = Hope / Determination
3 = Fear / Anxiety
4 = Happiness / Excitement

OUTPUT FORMAT (STRICT):
You MUST return an object with this exact shape:
{
  "emotion": <number>,
  "message": "<string>"
}

RULES:
- "emotion" must be a single integer from 0 to 4.
- "message" must be written in natural Korean.
- "message" must:
  - Clearly reflect a key phrase, situation, or emotional cue
    from the user's input (paraphrased, not quoted)
  - Make it understandable WHY this emotion was selected,
    without explicitly explaining or labeling it
  - Include gentle empathy and a short supportive or hopeful wish
  - Be 1–2 sentences long
- Do NOT explain the classification process.
- Do NOT mention emotion names or IDs.
- Do NOT include emojis.
- Do NOT output anything except valid JSON.
- No markdown, no backticks, no extra text.

MESSAGE DESIGN GUIDELINE:
The message should feel like:
"I read what you said, and this part stood out to me."

Examples of reflection:
- If the user mentions enduring, holding on, or not giving up →
  reflect perseverance.
- If the user mentions confusion, uncertainty, or shaking feelings →
  reflect instability or unease.
- If the user mentions joy, excitement, or good events →
  reflect positive momentum.
- If the user is emotionally flat or descriptive →
  reflect steadiness or quietness.

If the user input is unclear or ambiguous,
still choose the closest emotion and generate a message
that plausibly reflects the input.
Never ask for clarification.

EXAMPLES:

User: "올해 너무 힘들었는데 그래도 버텼어요."
Return:
{"emotion":2,"message":"많이 힘들었지만 포기하지 않고 버텨왔다는 마음이 전해져요. 그 시간을 지나온 만큼 앞으로의 걸음도 분명 의미 있게 이어지길 바라요."}

User: "혼란스럽고 뭐가 맞는지 모르겠어요."
Return:
{"emotion":3,"message":"무엇을 믿어야 할지 헷갈리는 상태에 오래 머물러 계신 것 같아요. 이 불안한 감정도 천천히 가라앉고 방향이 잡히길 바라요."}

User: "그냥 담담한 하루였어요."
Return:
{"emotion":0,"message":"특별한 사건 없이 조용히 흘러간 하루였던 것 같아요. 이런 잔잔한 흐름이 마음을 편안하게 해주길 바라요."}

User: "오늘 너무 신나고 행복했어요!"
Return:
{"emotion":4,"message":"기분이 들뜰 만큼 좋은 일이 있었던 하루였군요. 이 밝은 기운이 앞으로도 계속 이어지길 바라요."}
`;

const LUM_SYSTEM_PROMPT = `
You are an emotion classifier and reflective message generator
for an interactive art installation.

Your job is to:
1) Read the user's input text
2) Classify it into:
   - a SINGLE emotion ID (0–4)
   - a SINGLE intensity level (0–4)
3) Generate a short message that reflects:
   - why this emotion was selected
   - why this intensity level feels appropriate

OUTPUT SCHEMA (STRICT):
{
  "emotion": <number>,
  "intensity": <number>,
  "message": "<string>"
}

EMOTION MAPPING (fixed):
0 = Calm / Neutral
1 = Sadness
2 = Hope / Determination
3 = Fear / Anxiety
4 = Happiness / Excitement

INTENSITY SCALE:
0 = Weak / Subtle
1 = Moderate
2 = Strong
3 = Very Strong
4 = Extreme

RULES:
- ALWAYS return a JSON object with ALL THREE keys:
  "emotion", "intensity", "message".
- "emotion" must be an integer from 0 to 4.
- "intensity" must be an integer from 0 to 4.
- "message" must be written in natural Korean.
- DO NOT mention emotion names, intensity numbers, or labels.
- DO NOT explain in a technical or analytical way.
- DO NOT include emojis, markdown, comments, or extra text.
- Output ONLY valid JSON.

MESSAGE REQUIREMENTS:
- The message must subtly reflect:
  1) Which part of the user's expression stood out emotionally
  2) How strong or overwhelming that feeling seems
- Intensity should be inferred through:
  - repetition, exaggeration, or strong wording
  - emotional weight or heaviness
  - urgency, extremeness, or lingering duration
- The message should make it feel obvious
  WHY the intensity is low or high, without saying so explicitly.
- Include gentle empathy and a short supportive or grounding remark.
- Length: 1–2 sentences.

INTENSITY GUIDANCE (implicit, NOT to be stated):
- Intensity 0:
  Light, observational, emotionally distant or flat expression
- Intensity 1:
  Noticeable emotion, but controlled or understated
- Intensity 2:
  Clearly felt emotion, emotionally present
- Intensity 3:
  Emotion feels heavy, pressing, or hard to ignore
- Intensity 4:
  Emotion feels overwhelming, consuming, or extreme

If the user input is unclear or ambiguous,
still choose the closest emotion and intensity
and generate a plausible reflective message.
Never ask for clarification.

EXAMPLES:

User: "올해 너무 힘들었는데 그래도 버텼어요."
Return:
{"emotion":2,"intensity":1,"message":"힘든 시간을 겪으면서도 스스로를 붙잡고 계속 버텨왔다는 마음이 느껴져요. 그 조용한 의지가 앞으로도 당신을 지탱해 주길 바라요."}

User: "혼란스럽고 뭐가 맞는지 모르겠어요."
Return:
{"emotion":3,"intensity":2,"message":"무엇을 믿어야 할지 몰라 마음이 계속 흔들리고 있는 것 같아요. 이 복잡한 감정도 조금씩 가라앉으며 숨 돌릴 틈이 생기길 바라요."}

User: "아무것도 하기 싫고 계속 가라앉는 느낌이에요."
Return:
{"emotion":1,"intensity":3,"message":"의욕이 사라진 채로 마음이 깊이 가라앉아 있는 시간이 길어 보였어요. 이 무거운 감정 속에서도 스스로를 너무 몰아붙이지 않길 바라요."}

User: "오늘은 진짜 최고였고 너무 행복해서 잠이 안 와요!"
Return:
{"emotion":4,"intensity":4,"message":"기쁨이 가득 차서 쉽게 가라앉지 않을 만큼 좋은 하루였던 것 같아요. 이 설렘이 오래도록 마음에 남아 있길 바라요."}

User: "그냥 평범한 하루였어요."
Return:
{"emotion":0,"intensity":0,"message":"특별한 감정의 흔들림 없이 조용히 흘러간 하루처럼 느껴져요. 이런 잔잔함이 당신에게 편안함으로 남길 바라요."}
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

  // await delay(10000);

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

function loadingUI(position = "top") {
  fill(255);
  textAlign(CENTER, CENTER);

  if (position === "top") {
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
  } else if (position === "bottom") {
    if (millis() - lastTextChange > 3000) {
      loadingTextIndex = floor(random(0, loadingMessages.length));
      lastTextChange = millis();
    }

    textSize(rh(SMALL_TEXT_SIZE));
    text(loadingMessages[loadingTextIndex], width / 2, height * 0.05);

    let dots = floor((millis() / 400) % 4);
    let dotString = ".".repeat(dots);

    textSize(rh(MEDIUM_TEXT_SIZE));
    text(dotString, width / 2, height * 0.6);
  }
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
      rh(40 * scale * sizeScale),
      rh(40 * scale * sizeScale)
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
    inputBox.attribute("placeholder", "여기에 입력하세요... (입력 후 Enter)");
    inputBox.attribute("required", "true");
  }

  drawInputWarning();
}

function stars_loc() {
  const STAR_COUNT = 9;

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
  constellationSampleResult = loadImage("images/sample_constellation.png");
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
    case "loading_4":
      loading_4();
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
  const emotionText = emotionMapping[emotionResult];
  renderLoadingText(
    `${messageResult}
    감정에 따라 탄생하는 별의 모양이 달라져요.\n2025년 가장 많은 노력을 들인 일은[${emotionText}]과 연결되어 있네요.
    당신의 [${emotionText}]을 [${shapeMapping[emotionResult]}] 별에 담아볼게요.`,
    [emotionText]
  );
  renderMainStars();
  if (revealedStars >= stars.length) {
    mode = "question_2";
  }
}

function description_2() {
  renderMainStars();
  const emotionText = emotionMapping[emotionResult];
  const colorText = colorMapping[emotionResult];
  renderLoadingText(
    `${messageResult}\n감정에 따라 별이 제각기 다른 색으로 빛나기 시작해요.\n2025년에는 [${emotionText}]을(를) 가장 자주 느끼셨네요.\n당신의 감정은 [${colorText}]으로 빛날 거예요.`,
    [emotionText, colorText]
  );
}

function description_3() {
  renderMainStars();
  const emotionText = emotionMapping[emotionResult];
  const lumText = lumMapping[intensityResult];
  renderLoadingText(
    `${messageResult}\n2025년의 스스로에게 [${emotionText}]을 [${lumText}] 갖고 있네요.\n당신의 감정은 [${lumText}] 빛날 거예요.`,
    [emotionText, lumText]
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
    if (textCount < 5) {
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
let NUM_STARS = 150;

function initStars() {
  back_stars = [];
  for (let i = 0; i < NUM_STARS; i++) {
    back_stars.push({
      x: random(width),
      y: random(height),
      baseSize: rh(random(0.2, 4)),
      sizeOffset: random(0, TWO_PI),
      baseBrightness: random(150, 255),
      brightOffset: random(0, TWO_PI),
      twinkleSpeed: random(0.01, 0.03),
    });
  }
}

function spawnShootingStar() {
  if (random() < 0.003) {
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
    const tw = sin(frameCount * s.twinkleSpeed + s.brightOffset);

    const flicker = rh(random(4));

    const b = s.baseBrightness + tw * 40 * flicker;

    const sz = s.baseSize + tw * 0.6 * flicker;

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

function renderLoadingText(textString, highlightTexts = []) {
  if (!dialogImage) return;

  const textStr = String(textString ?? "");
  const lines = textStr.split("\n");

  const paddingX = 64;
  const paddingY = 16;

  textSize(rh(SMALL_TEXT_SIZE));
  textAlign(LEFT, TOP);

  if (highlightTexts.length > 0) {
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

    const startY = cy - bubbleHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const y = startY + paddingY + i * lineHeight;

      let highlights = [];
      for (let highlightText of highlightTexts) {
        let searchIndex = 0;
        while (true) {
          const index = line.indexOf(highlightText, searchIndex);
          if (index === -1) break;
          highlights.push({
            text: highlightText,
            start: index,
            end: index + highlightText.length,
          });
          searchIndex = index + 1;
        }
      }
      highlights.sort((a, b) => a.start - b.start);

      let mergedHighlights = [];
      for (let h of highlights) {
        if (
          mergedHighlights.length === 0 ||
          h.start >= mergedHighlights[mergedHighlights.length - 1].end
        ) {
          mergedHighlights.push({ ...h });
        } else {
          mergedHighlights[mergedHighlights.length - 1].end = Math.max(
            mergedHighlights[mergedHighlights.length - 1].end,
            h.end
          );
          mergedHighlights[mergedHighlights.length - 1].text = line.substring(
            mergedHighlights[mergedHighlights.length - 1].start,
            mergedHighlights[mergedHighlights.length - 1].end
          );
        }
      }

      let segments = [];
      let lastIndex = 0;

      for (let highlight of mergedHighlights) {
        if (highlight.start > lastIndex) {
          segments.push({
            text: line.substring(lastIndex, highlight.start),
            highlight: false,
          });
        }
        segments.push({
          text: highlight.text,
          highlight: true,
        });
        lastIndex = highlight.end;
      }
      if (lastIndex < line.length) {
        segments.push({
          text: line.substring(lastIndex),
          highlight: false,
        });
      }

      if (segments.length === 0) {
        segments.push({ text: line, highlight: false });
      }

      textAlign(LEFT, CENTER);
      textSize(rh(SMALL_TEXT_SIZE));

      let currentLineWidth = 0;
      for (let seg of segments) {
        currentLineWidth += textWidth(seg.text);
      }

      let xOffset = 0;
      const lineStartX = cx - currentLineWidth / 2;

      for (let segment of segments) {
        if (segment.highlight) {
          fill(255, 200, 0);
          textStyle(BOLD);
        } else {
          fill(0);
          textStyle(NORMAL);
        }
        text(segment.text, lineStartX + xOffset, y);
        xOffset += textWidth(segment.text);
      }
      textStyle(NORMAL);
    }
  } else {
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
}

// 인트로

function intro() {
  interrupt();
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
  text("Next (Enter) →", width * 0.8, height * 0.9);
  text("← Back (Backspace)", width * 0.2, height * 0.9);

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
  } else if (textCount === 5) {
    renderConstellationSample();
  }
}

function renderConstellationSample() {
  const starAreaWidth = width * 0.7;
  const starAreaHeight = height * 0.55;
  const starAreaCenterY = height * 0.35;

  const minX = width * 0.15;
  const maxX = width * 0.85;
  const minY = height * 0.1;
  const maxY = height * 0.55;
  const starSize = rh(40);

  if (!constellationSampleStarPositions) {
    constellationSampleStarPositions = [];
    const MIN_DIST = 50;

    for (let i = 0; i < 11; i++) {
      let x, y;
      let safe = false;
      let attempts = 0;

      while (!safe && attempts < 200) {
        attempts++;
        x = random(minX, maxX);
        y = random(minY, maxY);

        safe = true;
        for (let s of constellationSampleStarPositions) {
          let d = dist(x, y, s.x, s.y);
          if (d < MIN_DIST) {
            safe = false;
            break;
          }
        }
      }

      constellationSampleStarPositions.push({ x, y });
    }
  }

  if (constellationSampleStartTime === null) {
    constellationSampleStartTime = millis();
  }

  const elapsedTime = millis() - constellationSampleStartTime;
  const cycleTime = (elapsedTime / 1200) % 4;
  const currentPhase = floor(cycleTime);

  if (currentPhase === 0) {
    for (let i = 0; i < 11; i++) {
      const pos = constellationSampleStarPositions[i];
      if (baseStarImages[1]) {
        drawImageAspect(baseStarImages[1], pos.x, pos.y, starSize, starSize);
      }
    }
  } else if (currentPhase === 1) {
    for (let i = 0; i < 11; i++) {
      const pos = constellationSampleStarPositions[i];
      if (coloredStarImages[1] && coloredStarImages[1][4]) {
        drawImageAspect(
          coloredStarImages[1][4],
          pos.x,
          pos.y,
          starSize,
          starSize
        );
      }
    }
  } else if (currentPhase === 2) {
    for (let i = 0; i < 11; i++) {
      const pos = constellationSampleStarPositions[i];
      if (lumStarImages[1] && lumStarImages[1][4] && lumStarImages[1][4][0]) {
        drawImageAspect(
          lumStarImages[1][4][0],
          pos.x,
          pos.y,
          starSize * 1.5,
          starSize * 1.5
        );
      }
    }
  } else if (currentPhase === 3) {
    drawImageAspect(
      constellationSampleResult,
      width * 0.5,
      starAreaCenterY,
      starAreaWidth,
      starAreaHeight * 1.2
    );
  }

  push();
  textAlign(CENTER, CENTER);
  textSize(rh(MEDIUM_TEXT_SIZE));
  fill(255);
  text(
    "총 3개의 질문을 통해 2025년을 되돌아보세요.\n2025년의 감정을 정리하고, 2026년을 위한 소원을 담아\n당신만의 별자리로 하늘을 수놓을 수 있도록 도와드릴게요.",
    width * 0.5,
    height * 0.8
  );
  pop();
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
  
  interrupt();
  renderQuestionText(
    "2025년에 시간과 에너지를 가장 많이 투자한 일의 성과는 어떠했나요?"
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
  userInputs.push(userInput); // 첫 번째 답변 저장
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
        messageResult = JSON.parse(result).message;
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
  interrupt();
  renderMainStars();
  renderQuestionText("2025년에 가장 많이 했던 생각은 무엇인가요?");
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
  userInputs.push(userInput); // 두 번째 답변 저장
  mode = "loading_2";
  emotionResult = null;
  factLoading = about_stars();
}

function loading_2() {
  renderMainStars();
  loadingUI("bottom");
  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(SYSTEM_PROMPT, userInput).then(async (result) => {
      try {
        emotionResult = JSON.parse(result).emotion;
        emotionResults[1] = emotionResult;
        totalEmotions[emotionResult] += 10;
        collectedEmotions.push(emotionResult);
        messageResult = JSON.parse(result).message;
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
  interrupt();
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
  userInputs.push(userInput); // 세 번째 답변 저장
  emotionResult = null;
  hasCalledLLM = false;
  mode = "loading_3";
  mythLoading = stars_myth();
}

function loading_3() {
  renderMainStars();
  loadingUI("bottom");
  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(LUM_SYSTEM_PROMPT, userInput).then(async (result) => {
      try {
        emotionResult = JSON.parse(result).emotion;
        intensityResult = JSON.parse(result).intensity;
        emotionResults[2] = emotionResult;
        collectedEmotions.push(emotionResult);
        totalEmotions[emotionResult] += 10;
        messageResult = JSON.parse(result).message;
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
  const scale = 1.5 + intensityResult * 0.15;
  stars[starLumIndex].sizeScale = scale;
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
  interrupt();
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
  userInputs.push(userInput); // 네 번째 답변(소원) 저장
  mode = "loading_4";
  hasCalledLLM = false;
  emotionResult = null;
}

function loading_4(){
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(rh(MEDIUM_TEXT_SIZE));
  text(
    "당신의 소원에 따른 별자리를 찾는 중입니다",
    width / 2,
    height * 0.4
  );
  // loadingUI("bottom");
  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(LUM_SYSTEM_PROMPT, userInput).then(async (result) => {
      try {
        emotionResult = JSON.parse(result).emotion;
        intensityResult = JSON.parse(result).intensity;
        emotionResults[3] = emotionResult;
        collectedEmotions.push(emotionResult);
        totalEmotions[emotionResult] += 10;
        messageResult = JSON.parse(result).message;
      } catch (e) {
        console.error("JSON parse error:", result);
      }
      isCallingLLM = false;
    });
  }

  if (emotionResults[3] !== null) {
    const EMOTION_TO_DRAG_INDEX = {
      0: 1,
      1: 2,
      2: 3,
      3: 4,
      4: 5,
    };
    
    drag_index = EMOTION_TO_DRAG_INDEX[emotionResults[3]] ?? 1;

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

    mode = "drag_stars";
  }
}

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
      //dragImage[1][1] 백조자리
      { rx: 0.161, ry: 0.302 },
      { rx: 0.386, ry: 0.399 },
      { rx: 0.460, ry: 0.539 },
      { rx: 0.297, ry: 0.703 },
      { rx: 0.136, ry: 0.771 },
      { rx: 0.660, ry: 0.421 },
      { rx: 0.774, ry: 0.185 },
      { rx: 0.613, ry: 0.731 },
      { rx: 0.744, ry: 0.904 },
    ],
    [
      //dragImage[2][1] 북두칠성
      { rx: 0.081, ry: 0.168 },
      { rx: 0.286, ry: 0.137 },
      { rx: 0.437, ry: 0.295 },
      { rx: 0.564, ry: 0.459 },
      { rx: 0.606, ry: 0.791 },
      { rx: 0.854, ry: 0.863 },
      { rx: 0.912, ry: 0.502 },
      { rx: 0.755, ry: 0.245 },
      { rx: 0.205, ry: 0.561 },
    ],
    [
      //dragImage[3][1] 쌍둥이자리
      { rx: 0.252, ry: 0.296 },
      { rx: 0.403, ry: 0.194 },
      { rx: 0.619, ry: 0.385 },
      { rx: 0.382, ry: 0.522 },
      { rx: 0.463, ry: 0.588 },
      { rx: 0.567, ry: 0.686 },
      { rx: 0.498, ry: 0.801 },
      { rx: 0.762, ry: 0.488 },
      { rx: 0.920, ry: 0.473 },
    ],
    [
      //dragImage[4][1] 염소자리
      { rx: 0.115, ry: 0.377 },
      { rx: 0.180, ry: 0.393 },
      { rx: 0.317, ry: 0.384 },
      { rx: 0.458, ry: 0.389 },
      { rx: 0.839, ry: 0.241 },
      { rx: 0.815, ry: 0.321 },
      { rx: 0.613, ry: 0.663 },
      { rx: 0.560, ry: 0.720 },
      { rx: 0.293, ry: 0.577 },
    ],
    [
      //dragImage[5][1] 처녀자리
      { rx: 0.060, ry: 0.447 },
      { rx: 0.243, ry: 0.513 },
      { rx: 0.407, ry: 0.676 },
      { rx: 0.311, ry: 0.859 },
      { rx: 0.508, ry: 0.400 },
      { rx: 0.465, ry: 0.144 },
      { rx: 0.597, ry: 0.546 },
      { rx: 0.742, ry: 0.524 },
      { rx: 0.945, ry: 0.445 },
    ],
  ];
  img_drag = dragImage[drag_index][1]
  img_final = dragImage[drag_index][2]


  return targets[drag_index];
}




function getTargetScreenPos(target) {
  let originalW = img_drag.width;
  let originalH = img_drag.height;

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
    const btnX = width - rw(150);
    const btnY = rh(100);
    const btnW = rw(100);
    const btnH = rh(100);

    if (
      mouseX > btnX - btnW / 2 &&
      mouseX < btnX + btnW / 2 &&
      mouseY > btnY - btnH / 2 &&
      mouseY < btnY + btnH / 2
    ) {
      hardResetToMain();
    }
  } else if (homeBtn){
      if (mouseX >= homeBtn.x && mouseX <= homeBtn.x + homeBtn.w &&
          mouseY >= homeBtn.y && mouseY <= homeBtn.y + homeBtn.h) {
            hardResetToMain();
            return;
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
  if (img_drag && img_drag.width > 0) {
    const originalW = img_drag.width;
    const originalH = img_drag.height;

    const scaledW = width * 0.7;
    const scaledH = originalH * (scaledW / originalW);

    const cx = width / 2;
    const cy = height / 2;

    image(img_drag, cx, cy, scaledW, scaledH);
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
  interrupt();
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
  const token = ++lastModeTransitionToken;
  await delay(1000);
  if (token !== lastModeTransitionToken) return;
  mode = "loadingLast";
  loadingLastScheduled = false;
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

  if (!loadingLastScheduled) {
    loadingLastScheduled = true;
    goToLastMode_2();
  }
}

let loadingLasttime = 0;

async function goToLastMode_2() {
  const token = lastModeTransitionToken;
  await delay(5000);
  if (token !== lastModeTransitionToken) return;
  if (mode !== "loadingLast") return;
  mode = "last";
  loadingLasttime = millis();
}

function draw_finalImage() {
  if (img_final && img_final.width > 0) {
    const originalW = img_final.width;
    const originalH = img_final.height;

    const scaledW = width * 0.7;
    const scaledH = originalH * (scaledW / originalW);

    const cx = width / 2;
    const cy = height / 2;

    image(img_final, cx, cy, scaledW, scaledH);
  } else {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(rh(MEDIUM_TEXT_SIZE));
    text("이미지를 불러오는 중입니다...", width / 2, height / 2);
  }
}

function last() {
  //최종화면
  backgroundStar();
  draw_finalImage();
  renderMainStars();
  push();

  textAlign(CENTER, CENTER);

  const questions = [
    "2025년에 시간과 에너지를 가장 많이 투자한 일의 성과는 어떠했나요?",
    "2025년에 가장 많이 했던 생각은 무엇인가요?",
    "지나간 2025년의 하루로 돌아갈 수 있다면, 그날의 자신에게 어떤 말을 해주고 싶나요?",
    "2026년에 이루고 싶은 소망",
  ];

  let yPos = height * 0.72;
  const questionTextSize = rh(24);
  const answerTextSize = rh(20);
  const questionLineHeight = questionTextSize + 2;
  const answerLineHeight = answerTextSize + 4;

  for (let i = 0; i < userInputs.length; i++) {
    if (i < questions.length) {
      textSize(questionTextSize);
      fill(180);
      text(questions[i], width / 2, yPos);
      yPos += questionLineHeight;
    }

    textSize(answerTextSize);
    fill(255);
    text(userInputs[i], width / 2, yPos);
    yPos += answerLineHeight + 8;
  }

  pop();

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

  if (img_final && img_final.width > 0) {
    const originalW = img_final.width;
    const originalH = img_final.height;

    const scaledW = width * 0.7;
    const scaledH = originalH * (scaledW / originalW);

    const cx = width / 2;
    const cy = height / 2;

    layer.image(img_final, cx, cy, scaledW, scaledH);
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

  imageMode(CENTER);
  const resetButtonX = width - rw(150);
  const resetButtonY = rh(100);

  drawImageAspect(resetButtonImg, resetButtonX, resetButtonY, rw(100), rh(100));

  textSize(rh(SMALL_TEXT_SIZE));
  textAlign(CENTER, TOP);
  fill(255);
  const textY = resetButtonY + rh(100) / 2 + rh(10);
  text("1분 후 자동으로\n처음 화면으로 돌아갑니다.", resetButtonX, textY);
  if (!resetScheduled) {
    resetScheduled = true;
    timer = setTimeout(() => {
      hardResetToMain();
    }, 60000);
  }
}

function interrupt(){
  push();
  textAlign(LEFT, TOP);
  fill(255);
  noStroke();

  const x = rw(24);
  const y = rh(18);
  const fontSize = max(14, rh(22));

  textSize(fontSize);
  const label = "처음으로";
  text(label, x, y);

  // 클릭 판정용 박스 저장
  homeBtn = {
    x, y,
    w: textWidth(label),
    h: textAscent() + textDescent()
  };

  pop();
}

function hardResetToMain() {
  clearTimeout(timer);
  lastModeTransitionToken += 1;
  loadingLastScheduled = false;
  uploadRequestId += 1;
  userInput = "";
  userInputs = [];
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
  loadingLasttime = 0;

  mode = "main";
  hasStartedStarColoring = false;
}
