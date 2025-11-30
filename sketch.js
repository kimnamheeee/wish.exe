let mode = "main";      // "main" 또는 "intro"
let introFrame = 0;
let textCount = 0;

function setup() {
  createCanvas(1920 * 0.4, 1080 * 0.4);
}

function draw() {
  backgroundStar(80);

  if (mode === "main") {
    main_frame();
  } else if (mode === "intro") {
    intro();
  } else if (mode === "question_1"){
    //question_1()
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
  }
}

function backgroundStar(){
  background(0);

  for (i = 0; i < 100; i++){
    let x = random(width);
    let y = random(height);
    fill(random(200, 256));
    noStroke();
    ellipse(x, y, random(1, 3), random(1, 3));  
  }
}

function main_frame() {
  stroke(255);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  text('> Press Enter To Start <', width * 0.5, height * 0.8);
  textSize(100);
  text('Wish.exe', width * 0.5, height * 0.5);
}

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

function question_1(){
  //별의 위치 지정하는 질문 
  input_1()
}

function input_1(){
  //텍스트 입력받고
  //LLM 실행
}

function loading_1(){
  stars_loc()
  //디즈니 관련 내용 설명
}

function stars_loc(){
  //별 n개 생성
}

//질문 2

function question_2(){
  //stars_loc()의 정보 받아오기
  //별의 색상 지정하는 질문
  input_2()
}

function input_2(){
  //텍스트 입력받고
  //LLM 실행
}

function loading_2(){
  stars_col()
  about_stars()
}

function stars_col(){
  //별 색상 정하기
  //stars_loc의 정보받아오기
  //색 입히기
}

function about_stars(){
  //별자리와 관련한 사실들을 리스트로 만들어 random추출하기
  abouts = []
  fact = abouts[random(0, len(abouts))]
  //fact 전달
}


//질문 3

function question_3(){
  //stars_col()의 정보 받아오기
  //별의 밝기 지정하는 질문
  input_3()
}

function input_3(){
  //텍스트 입력받고
  //LLM 실행
}

function loading_3(){
  stars_lum()
  stars_myth()
}

function stars_lum(){
  //별 밝기 정하기
  //stars_col의 정보받아오기
  //밝기 입히기
}

function stars_myth(){
  //별자리와 관련한 신화들을 리스트로 만들어 random추출하기
  myth_list = []
  myth = abouts[random(0, len(abouts))]
  //fact 전달
}

//질문 4(소원)
function question_4(){
  //stars_lum의 정보받아오기
  input_4()
}

function input_4(){
  //텍스트 입력받고
  //LLM 실행
}

function drag_stars(){
  //소원에 따른 별자리 출력
  //별 드래그앤 드랍
  //페이드아웃
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



