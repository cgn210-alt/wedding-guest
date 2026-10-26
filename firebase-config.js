// 결혼식 하객 접수 앱 Firebase 설정
// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에 나오는 값을 그대로 붙여 넣으세요.
var FIREBASE_CONFIG = {
  apiKey:            "",
  authDomain:        "",
  databaseURL:       "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

// 마스터 — 항상 접속 가능하며, 앱에서 다른 접수 담당자 계정을 허용/해제할 수 있습니다
// MASTER_EMAIL 은 database.rules.json 의 값과 같아야 합니다
var MASTER_EMAIL = "cgn210@cgnmail.net";

// 화면 상단 제목
var APP_TITLE = "결혼식 하객 접수";
