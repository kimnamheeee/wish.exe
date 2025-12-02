let userInput = "";
let back_stars = [];
let loadingProgress = 0;
let loadingStartTime = 0;
let loadingDuration = 5000;

let isCallingLLM = false;
let emotionResult = null;
let hasCalledLLM = false;

let starColorIndex = 0;
let targetColor = null;

let starLumIndex = 0;
let targetLum = null;

let factLoading = null;


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

const LLM_API_URL = "https://p5-llm-server.vercel.app/api/llm"

const SYSTEM_PROMPT = `
You are an emotion classifier for an art installation.
Your ONLY job is to read the user's input text and classify it
into a SINGLE emotion ID from 0 to 5.

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
Return: {"emotion": 5}

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
    { x: width * 0.25, y: height * 0.30 },
    { x: width * 0.32, y: height * 0.34 },
    { x: width * 0.39, y: height * 0.38 },
    { x: width * 0.45, y: height * 0.44 },
    { x: width * 0.52, y: height * 0.48 },
    { x: width * 0.58, y: height * 0.51 },
    { x: width * 0.64, y: height * 0.56 }
  ];
  
  return base.map(s => ({
    ...s,
    color: { r: 255, g: 255, b: 255 },
    lum : 0
  }));
}

let mode = "main";      // "main" 또는 "intro"
let introFrame = 0;
let textCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
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

function backgroundStar() {
  background(0);

  if (frameCount % 40 === 0) {
    back_stars = [];

    for (let i = 0; i < 100; i++) {
      back_stars.push({
        x: random(width),
        y: random(height),
        size: random(2, 5),
        brightness: random(200, 255)
      });
    }
  }
  noStroke();
  for (let s of back_stars) {
    fill(s.brightness);
    ellipse(s.x, s.y, s.size, s.size);
  }
}

// 메인

function main_frame() {
  stroke(255);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  text('> Press Enter To Start <', width * 0.5, height * 0.8);
  textSize(100);
  text('Wish.exe', width * 0.5, height * 0.5);
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
}

function drag_stars(){
  renderMainStars()
}

function last(){
  //최종화면
  //QR 이미지
  radar_chart()
  reset()
  //일정시간 지나면 메인화면으로 전환
}

function radar_chart(){
  //레이더 차트
}

function reset(){
  //초기화버튼
}



