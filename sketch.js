let userInput = "";
let back_stars = [];
let loadingProgress = 0;
let loadingStartTime = 0;
let loadingDuration = 5000;

let isCallingLLM = false;
let emotionResult = null;
let hasCalledLLM = false;

let hasUploadedCapture = false;

let starColorIndex = 0;
let targetColor = null;

let starLumIndex = 0;
let targetLum = null;

let factLoading = null;
let transitioning = false;

let stars = [];
let draggedStarIndex = -1;
let targetPositions = [];
const SNAP_THRESHOLD = 60;

let isRadarAnimating = false;
let timer;

// //참가자들 별자리 저장
// const MAX_USER_STARS = 5;
// let userStars = [];
// let lastStarSaved = false;

let qrcode;
let qrcodeElement;
let resetScheduled = false;

function uploadCapture(base64) {
  if (!base64 || hasUploadedCapture) return;
  hasUploadedCapture = true;

  fetch(UPLOAD_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ image: base64 })
  })
  .then(res => res.json())
  .then(data => {
    console.log("업로드된 이미지 URL:", data.url);
    qrcode.makeCode(data.url);
    qrcodeElement.style.opacity = 1;
  });
}

const emotionColors = {
  0: { r:180, g:200, b:255 },
  1: { r:90,  g:90,  b:160 },
  2: { r:255, g:230, b:100 },
  3: { r:255, g:120, b:90  },
  4: { r:255, g:200, b:30  },
};

const emotionLums = {
  0: 13,
  1: 16,
  2: 19,
  3: 21,
  4: 24,
};


const collectedEmotions = [];

const totalEmotions = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
}

const currentEmotions = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
}

const LLM_API_URL = "https://p5-llm-server.vercel.app/api/llm"
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

  await delay(5000);

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? "(no reply)";
  isCallingLLM = false;
  return reply;
}

let factTexts = [
  `디즈니 영화 오프닝에서 배경 음악으로 사용되는 음악의 제목이 
  피노키오의 주제곡인 ‘When you wish upon a star’라는 사실을 알고 있었나요? 
  나무 인형 피노키오를 만든 제페토 할아버지가 밤하늘의 밝은 별을 보며 피노키오가 진짜 사람이 되기를 소원하자, 
  그 소원을 들은 요정들이 피노키오에게 생명을 불어넣어 주었죠.`
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function renderMainStars() {
  for (let s of stars) {
    const { r, g, b } = s.color;
    const l = s.lum || 0;
    fill(r, g, b);
    noStroke();
    ellipse(s.x, s.y, 10, 10);
    if (l > 0) {
      fill(r, g, b, 70);
      ellipse(s.x, s.y, l, l);
    }
    
  }
}

function renderQuestionText(txt) {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  
  text(txt, width / 2, height * 0.7);
}

function getUserInput() {
  if (inputBox) {
    userInput = inputBox.value();
    inputBox.remove();
    inputBox = null;
  }
}

function renderAnswerInput() {
  if (!inputBox) {
    inputBox = createInput("");   
    inputBox.attribute("placeholder", "여기에 답을 입력하세요...");
    
    inputBox.position(width/2 - 250, height * 0.8);
    inputBox.size(500, 60);

    inputBox.style("font-size", "22px");
    inputBox.style("padding", "12px 16px");
    inputBox.style("border", "2px solid rgba(255,255,255,0.3)");
    inputBox.style("border-radius", "12px");
    inputBox.style("background", "rgba(255,255,255,0.8)");
    inputBox.style("outline", "none");
  }
}


function stars_loc() {
  const base = [
    { x: width * 0.18, y: height * 0.72 },
    { x: width * 0.27, y: height * 0.48 },
    { x: width * 0.33, y: height * 0.31 },
    { x: width * 0.41, y: height * 0.57 },
    { x: width * 0.46, y: height * 0.40 },
    { x: width * 0.53, y: height * 0.66 },
    { x: width * 0.60, y: height * 0.29 },
    { x: width * 0.68, y: height * 0.51 },
    { x: width * 0.74, y: height * 0.37 },
    { x: width * 0.81, y: height * 0.60 },
    { x: width * 0.56, y: height * 0.19 },
  ];
  //각 별자리별로 필요한 별의 개수가 다르므로, 별자리 index와 별의 index를 통일해 각 별자리별로 별의 좌표를 입력해야 할 것 같습니다.
  
  return base.map(s => ({
    ...s,
    color: { r: 255, g: 255, b: 255 },
    lum : 0
  }));
}

let mode = "main";      // "main" 또는 "intro"
let introFrame = 0;
let textCount = 0;

let dragImage_1;
let titleImage;
let titleDescription;

function preload() {
  dragImage_1 = loadImage('images/dragImage_1.png');
  titleImage = loadImage('images/title.png');
  titleDescription = loadImage('images/title_description.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  qrcode = new QRCode(document.getElementById("qrcode"), {
    text: "",
    width: 128,
    height: 128
  });
  qrcodeElement = document.getElementById("qrcode");
  angleMode(DEGREES);
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
    case "question_1":
      question_1();
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
    case "question_3":
      question_3();
      break;
    case "question_4":
      question_4();
      break;
    case "drag_stars":
      drag_stars();
      break;
    case "last":
      last();
      break;
  }
}

function keyPressed() {
  // 메인 화면에서 Enter -> 인트로 시작
  if (keyCode === ENTER && mode === "main") {
    mode = "intro";
    introFrame = 0;
    textCount = 0;  // 인트로 시작할 때 문장 번호 초기화
  }
  // 인트로에서 Enter -> 다음 문장으로
  else if (keyCode === ENTER && mode === "intro") {
    if (textCount < 3) {
      textCount += 1;   // 0→1→2→3
    } else {
      mode = "question_1";  // 마지막 문장 보고 나면 다음 화면으로
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
      twinkleSpeed: random(0.01, 0.03)
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
      life: 60
    });
  }
}

function updateShootingStars() {
  for (let s of shootingStars) {
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 1;
  }
  shootingStars = shootingStars.filter(s => s.life > 0);
}

function drawShootingStars() {
  for (let s of shootingStars) {
    stroke(255, 255, 255, 200);
    strokeWeight(s.size);
    line(s.x, s.y, s.x - s.vx * 2, s.y - s.vy * 2);  
  }
  noStroke();
}

function backgroundStar() {
  background(0);

  if (back_stars.length === 0) initStars();

  noStroke();
  for (let s of back_stars) {
    const b = s.baseBrightness + sin(frameCount * s.twinkleSpeed + s.brightOffset) * 50;

    const sz = s.baseSize + sin(frameCount * s.twinkleSpeed + s.sizeOffset) * 0.5;

    fill(b);
    ellipse(s.x, s.y, sz, sz);
  }

  spawnShootingStar();
  updateShootingStars();
  drawShootingStars();
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
  drawImageAspect(titleImage, width * 0.5, height * 0.45, width, height);
  drawImageAspect(titleDescription, width * 0.5, height * 0.8, 400, height);
}

// 인트로

function intro() {
  introFrame++;

  // 0~120프레임 동안 페이드아웃
  let a = map(introFrame, 0, 120, 255, 0, true);
  
  noStroke();
  fill(0, 0, 0, a);
  rect(0, 0, width, height);

  intro_text()
  
}


function intro_text() {
  stroke(255);
  fill(255);
  textAlign(CENTER, CENTER);

  textSize(15);
  text("-> Next (Press Enter)", width * 0.8, height * 0.9);

  // 본문 텍스트
  textSize(24);

  if (textCount === 0) {
    text(
      "누구나 한 번쯤은 밤하늘을 올려다보며\n간절한 소원을 빌어본 순간이 있을 겁니다.",
      width * 0.5,
      height * 0.7
    );
  } else if (textCount === 1) {
    text(
      "하늘에서 지상으로 내리는 별똥별은\n" +
      "신들이 사람들의 소원을 듣고 있는 순간이라는 믿음처럼,\n" +
      "사람들은 오래 전부터 드넓게 펼쳐진 밤하늘이\n" +
      "신들의 영역과 관련된 통로라고 생각해왔습니다.",
      width * 0.5,
      height * 0.6
    );
  } else if (textCount === 2) {
    text(
      "그러나 어두운 밤하늘의 길잡이가 되어준 별에게 비는 소원은\n" +
      "길을 잃지 않고 신들에게 닿을지도 모르죠.",
      width * 0.5,
      height * 0.6
    );
  } else if (textCount === 3) {
    text(
      "올 한 해를 되돌아보며 의미있는 순간들을 담아보세요.\n" +
      "지나간 시간들이 자취로 남아 앞으로를 향한 소원을 이루어줄 테니까요.",
      width * 0.5,
      height * 0.6
    );
  }
}

//질문 1

let inputBox;

function question_1() {
  renderQuestionText("2025년에 시간과 에너지를 가장 많이 투자한 일은 무엇이었나요?\n그 일의 성과는 어떠했나요?");

  renderAnswerInput();
}


function keyTyped() {
  if (mode === "question_1" && key !== "Enter") {
    userInput += key;
  }
}

function input_1() {
  getUserInput();
  mode = "loading_1";
  loadingStartTime = millis();
  stars = [];
  loadingProgress = 0;
}


function loading_1() {
  let elapsed = millis() - loadingStartTime;

  fill(255);
  textSize(24);
  textAlign(CENTER, CENTER);
  text("생각을 정리하는 중...", width / 2, height / 2 - 200);

  fill(255, 210);
  rect(40, height - 180, width - 80, 140, 20);

  fill(40);
  textAlign(LEFT, TOP);
  textSize(18);
  text(factTexts[0], 60, height - 160, width - 120);


  if (elapsed < loadingDuration) {
    let dots = floor((elapsed / 300) % 4);
    text("⋆".repeat(dots), width / 2, height / 2 - 160);
    return;
  }

  if (stars.length === 0) {
    stars = stars_loc();
  }

  loadingProgress += 0.01;
  if (loadingProgress > 1) loadingProgress = 1;

  for (let i = 0; i < stars.length * loadingProgress; i++) {
    let s = stars[i];
    fill(255);
    ellipse(s.x, s.y, 10, 10);
  }

  if (loadingProgress >= 1) mode = "question_2";
}


//질문 2

function question_2(){
  renderMainStars()
  renderQuestionText("2025년에 가장 많이 했던 생각은 무엇인가요?\n2025년에 가장 자주 했던 말은 무엇인가요?");
  renderAnswerInput()
}

function input_2(){
  getUserInput();
  mode = "loading_2";
  emotionResult = null;
  factLoading = about_stars()
}

function loading_2(){
  renderMainStars()

  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(SYSTEM_PROMPT, userInput).then(async result => {
      try {
        emotionResult = JSON.parse(result).emotion;
        totalEmotions[emotionResult]+=10;
        collectedEmotions.push(emotionResult);
        targetColor = emotionColors[emotionResult];
      } catch (e) {
        console.error("JSON parse error:", result);
      }
      isCallingLLM = false; 
    });
  }

  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);

  text(factLoading, width / 2, height * 0.8);

  if (targetColor !== null) {
    startStarColoring(emotionResult);
  }
}

function startStarColoring(emotionId) {
  targetColor = emotionColors[emotionId];
  starColorIndex = 0;

  colorNextStar();
}

function colorNextStar() {
  if (starColorIndex >= stars.length) {
    mode = "question_3";
    return;
  }

  stars[starColorIndex].color = { ...targetColor };
  starColorIndex++;

  setTimeout(colorNextStar, 1000);
}



function about_stars(){
  //별자리와 관련한 사실들을 리스트로 만들어 random추출하기
  abouts = ["별자리 , 천문학 에서 특정 그룹 중 하나적어도 이름을 붙인 사람들이 상상했던 별들은\n 하늘에서 눈에 띄는 물체나 생물의 형태를 이룬다고 믿었습니다.",
    "별자리는 고대 바빌로니아인들이 유목 생활을 하며 밤하늘의 별에 모양을 붙이기 시작한 데서 유래했습니다.",
    "자신의 생일날에 자신의 탄생 별자리를 볼 수가 없습니다. 생일에서 6개월 정도 전후에만 밤하늘에서 찾아볼 수 있습니다.",
    "국제천문연맹은 1928년, 황도 12궁을 포함한 88개의 별자리를 공식적으로 확정지었습니다.",
    "가장 큰 별자리는 밤하늘의 면적 중 3.16%를 차지하는 바다뱀 자리입니다.",
    "가장 작은 별자리는 남쪽 하늘의 가장 인기 있는 별자리 중 하나인 남십자자리입니다.",
    "밤하늘에서 가장 밝은 별은 큰개자리에 있는 시리우스입니다."
  ]
  const fact = random(abouts);
  return fact;
  //fact 전달
}


//질문 3

function question_3(){
  renderMainStars()
  renderQuestionText("지나간 2025년의 하루로 돌아갈 수 있다면,\n그날의 자신에게 어떤 말을 해주고 싶나요?");
  renderAnswerInput()
}

function input_3(){
  getUserInput();
  emotionResult = null;
  hasCalledLLM = false;  
  mode = "loading_3";
}

function loading_3(){
  renderMainStars()

  if (!hasCalledLLM) {
    hasCalledLLM = true;
    callLLM(SYSTEM_PROMPT, userInput).then(async result => {
      try {
        emotionResult = JSON.parse(result).emotion;
        collectedEmotions.push(emotionResult);
        totalEmotions[emotionResult]+=10;
        targetLum = emotionLums[emotionResult];
      } catch (e) {
        console.error("JSON parse error:", result);
      }
      isCallingLLM = false; 
    });
  }

  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);

  const fact = stars_myth();
  text(fact, width / 2, height * 0.8);

  if (targetLum !== null) {
    stars_lum(emotionResult);
  }

}

function stars_lum(emotionId) {
  targetLum = emotionLums[emotionId];
  starLumIndex = 0;

  lumNextStar();
}

function lumNextStar() {
  if (starLumIndex >= stars.length) {
    mode = "question_4";
    return;
  }

  stars[starLumIndex].lum = targetLum;
  starLumIndex++;

  setTimeout(lumNextStar, 1000);
}


function stars_myth(){
  //별자리와 관련한 신화들을 리스트로 만들어 random추출하기
  myth_list = [`<오리온에 관한 신화>
    달의 여신 아르테미스를 사랑한 대가로 그녀의 화살에 맞아 죽음을 당한 사냥꾼 오리온의 별자리.
    그러나 아르테미스가 그에게 화살을 쏜 것은 둘의 결혼을 반대한 오빠 아폴론의 계략 탓이었다.`]
  const myth = random(myth_list);
  return myth;
}


//질문 4(소원)


function question_4(){
  renderMainStars()
  renderQuestionText("2025년의 나날을 기억하며, 다가오는 2026년에 이루고 싶은 소망은 무엇인가요?");
  renderAnswerInput()
}

function input_4(){
  getUserInput();
  mode = "drag_stars";
  hasCalledLLM = false; 
  emotionResult = null;

  const normTargets = createStarsTargets(drag_index);
  targetPositions = normTargets.map(t => getTargetScreenPos(t));
}


let drag_index = 0;
// 질문1에서 생성되는 별자리 및 별 개수의 인덱스와 동일
// 프로토타입용으로 현재 0으로 임의로 설정

function createStarsTargets(drag_index){
  const targets = [
    [{ rx: 0.743, ry: 0.234 },
  { rx: 0.664, ry: 0.175 },
  { rx: 0.543, ry: 0.338 },
  { rx: 0.548, ry: 0.460 },
  { rx: 0.657, ry: 0.542 },
  { rx: 0.697, ry: 0.668 },
  { rx: 0.875, ry: 0.679 },
  { rx: 0.914, ry: 0.592 },
  { rx: 0.207, ry: 0.608 },
  { rx: 0.256, ry: 0.773 },
  { rx: 0.061, ry: 0.894 },]
  ]

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
  if (mode === "drag_stars"){
    for (let i = 0; i<stars.length; i++){
      let s = stars[i];
      let d = dist(mouseX, mouseY, s.x, s.y);
      if (d < 25) {
        draggedStarIndex = i;
        break;
      }
    }
  } else if (mode === "last") {
    const btnX = width - width * 0.15;
    const btnY = 100;
    const btnW = width * 0.1;
    const btnH = height * 0.1;

    if (mouseX > btnX && mouseX < btnX + btnW &&
        mouseY > btnY && mouseY < btnY + btnH) {
      hardResetToMain();
    }
  }
}

function mouseDragged(){
  if (mode === "drag_stars" && draggedStarIndex !== -1) {
    stars[draggedStarIndex].x = mouseX;
    stars[draggedStarIndex].y = mouseY;
  }
}

function mouseReleased(){
  draggedStarIndex = -1;
}

function checkStarsComplete() {
  if (!targetPositions || targetPositions.length === 0) return false;

  const usedStars = new Set();  
  let matched = 0;

  for (let t of targetPositions) {
    let found = false;

    for (let i = 0; i < stars.length; i++) {
      if (usedStars.has(i)) continue;   

      const s = stars[i];
      const d = dist(s.x, s.y, t.x, t.y);
      if (d < SNAP_THRESHOLD) {
        s.x = t.x;
        s.y = t.y;
      }

      if (d <= SNAP_THRESHOLD) {
        usedStars.add(i);  
        matched++;
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }
  }

  return matched === targetPositions.length;
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
    textSize(24);
    text("이미지를 불러오는 중입니다...", width / 2, height / 2);
  }
}

function getDragImageXBounds() {
  const scaledW = width * 0.7;
  const cx = width / 2;
  
  const startX = Math.floor(cx - scaledW / 2);  // 시작 x좌표
  const endX = Math.floor(cx + scaledW / 2);    // 끝 x좌표
  
  return { startX, endX, centerX: cx, width: scaledW };
}

function drag_stars(){
  draw_dragImage();
  renderMainStars();
  renderStarsTargets();
  renderDragInstruction();

  if (checkStarsComplete() && !transitioning)  {
    transitioning = true;
    goToLastMode();
  }
}

async function goToLastMode() {
  await delay(3000); // 3초 기다림
  mode = "last";
}

function renderDragInstruction() {
  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);

  text('별을 움직여 소원을 담은 별자리를 완성시켜주세요.', width / 2, height * 0.8);

}

function renderStarsTargets() {
  if (!targetPositions || targetPositions.length === 0) return;

//   noStroke();
//   fill(255, 255, 255, 180); // 약간 투명한 흰색 원

//   for (let t of targetPositions) {
//     ellipse(t.x, t.y, 20, 20);   // 지름 20 원
//   }
}

function last(){
  //최종화면
  backgroundStar();
  draw_dragImage();
  renderMainStars();

  // renderStarsLines(stars);

  // if (!lastStarSaved){
  //   saveCurrentStar();
  //   lastStarSaved = true;
  // }

  // userInput을 text로 표시

  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);
  text(userInput, width / 2, height * 0.8);

  let cropped = get(getDragImageXBounds().startX, 0, getDragImageXBounds().width, windowHeight);
  let base64 = cropped.canvas.toDataURL("image/png");
  uploadCapture(base64);

  if (!isRadarAnimating) isRadarAnimating = true;
  
  if (isRadarAnimating) {
    updateRadarValues();
  }

  radar_chart()
  reset(); //일정시간 지나면 메인화면으로 전환
}


function updateRadarValues() {
  for (let key in currentEmotions) {
    currentEmotions[key] = lerp(
      currentEmotions[key],
      totalEmotions[key],
      0.05
    );

    if (abs(currentEmotions[key] - totalEmotions[key]) < 0.1) {
      currentEmotions[key] = totalEmotions[key];
    }
  }

  if (Object.keys(currentEmotions).every(k => currentEmotions[k] === totalEmotions[k])) isRadarAnimating = false;
}


// function saveCurrentStar() {
//   if (!stars || stars.length == 0) return;

//   const user = stars.map(s => ({
//     x: s.x,
//     y: s.y,
//     color: { ...s.color },
//     lum: s.lum
//   }));

//   userStars.push(user);

//   if (userStars.length > MAX_USER_STARS) {
//     userStars.shift();
//   }
// }

// function renderStarsLines(starsArray) {
//   if (!starsArray || starsArray.length < 2) return;

//   noFill();
//   stroke(255, 255, 255, 180);
//   strokeWeight(2);

//   beginShape();
//   for (let s of starsArray) {
//     vertex(s.x, s.y);
//   }
//   endShape();
// }

// function renderSavedStars() {
//   if (!userStars || userStars.length === 0) return;

//   for (let user of userStars){
//     if (!user || user.length < 2) continue;

//     noFill();
//     stroke(255, 255, 255, 40);   
//     strokeWeight(1);
//     beginShape();
//     for (let p of user) {
//       vertex(p.x, p.y);
//     }
//     endShape();

//     // 점
//     noStroke();
//     for (let p of user) {
//       fill(255, 255, 255, 70);
//       ellipse(p.x, p.y, 4, 4);
//     }
//   }
// }


function radar_chart(){
  //레이더 차트
  stroke(200);
  strokeWeight(1);
  let x = width * 0.12;
  let y = height * 0.8;

  for (let i = 0; i < 6; i++) {
    let r1 = 100;
    let r2 = 20

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
  fill('#FDBE02');
  beginShape();
  vertex(x + dx1, y + dy1);
  vertex(x + dx2, y + dy2);
  vertex(x + dx3, y + dy3);
  vertex(x + dx4, y + dy4);
  vertex(x + dx5, y + dy5);
  vertex(x + dx1, y + dy1);
  endShape();

  text('Calm', x+100, y-30);
  text('Sadness', x+50, y+100);
  text('Hope', x-80, y+100);
  text('Fear', x-130, y-30);
  text('Happiness', x-15, y-107);
}

function reset(){

  fill(255);
  const btnX = width - width * 0.15;
  const btnY = 100;
  const btnW = width * 0.1;
  const btnH = height * 0.1;

  rect(btnX, btnY, btnW, btnH, 10);

  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('처음으로', btnX + btnW / 2, btnY + btnH / 2);
  text('15초 후 자동으로 처음 화면으로 돌아갑니다.', btnX + btnW / 2, (btnY + btnH / 2) * 0.5);
  if (!resetScheduled) {
    resetScheduled = true;
    timer = setTimeout(() => {
      hardResetToMain();
    }, 15000);
  }
}


function hardResetToMain() {
  clearTimeout(timer);
  userInput = "";
  back_stars = [];
  loadingProgress = 0;
  loadingStartTime = 0;

  hasUploadedCapture = false;
  qrcodeElement.style.opacity = 0;

  isCallingLLM = false;
  emotionResult = null;
  hasCalledLLM = false;

  starColorIndex = 0;
  targetColor = null;

  starLumIndex = 0;
  targetLum = null;

  factLoading = null;

  stars = [];
  draggedStarIndex = -1;
  targetPositions = [];

  collectedEmotions.length = 0;

  transitioning = false;
  resetScheduled = false;
  // lastStarSaved = false;

  mode = "main";
}


