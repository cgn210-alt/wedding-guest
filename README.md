# 결혼식 하객 접수 앱

청첩장 배포 명단, 식장 방문 접수(축의금·식권), 명단 외 방문자 접수, 실시간 통계를 한 화면에서 관리합니다.
여러 기기에서 동시에 입력해도 모든 화면에 바로 반영됩니다.

- 주소: https://cgn210-alt.github.io/wedding-guest/
- 저장: Firebase Realtime Database (`wedding/data`), 개인 행사 자료이므로 별도 Firebase 프로젝트 사용
- 접근: 구글 로그인 + 마스터가 허용한 계정만 (마스터: `firebase-config.js`의 `MASTER_EMAIL`)

## 화면

- 접수: 이름 검색 → 눌러서 축의금·식권 입력 후 접수 완료. 명단에 없으면 "명단에 없는 방문자 접수".
- 명단: 그룹을 고르고 이름을 한 줄에 한 명씩 붙여 넣어 청첩장 받은 사람을 한꺼번에 등록. 그룹·상태별 조회와 수정.
- 통계: 청첩장 배포/방문/방문율, 명단 외 방문, 축의금 합계·평균, 식권 매수, 그룹별 표, 축의금 액수별 인원.
- 설정: 그룹 추가·이름 변경·삭제, 접수 담당자 계정 허용(마스터만), CSV(엑셀) 내보내기.

## 처음 설정 (한 번만)

1. https://console.firebase.google.com 에서 새 프로젝트 만들기 (예: `wedding-guest`)
2. Build > Realtime Database > 데이터베이스 만들기 (위치: 싱가포르, 잠금 모드)
3. Realtime Database > 규칙 탭에 `database.rules.json` 내용을 붙여 넣고 게시
4. Build > Authentication > 시작하기 > 로그인 방법 > Google 사용 설정
5. Authentication > 설정 > 승인된 도메인에 `cgn210-alt.github.io` 추가
6. 프로젝트 설정 > 내 앱 > 웹 앱 추가 → 나오는 설정값을 `firebase-config.js`에 붙여 넣기
7. GitHub에 `wedding-guest` 저장소를 만들고 이 폴더를 올린 뒤, Settings > Pages 에서 main 브랜치 배포
8. 마스터 계정으로 로그인 → 설정 탭에서 접수 담당자들의 구글 이메일 허용

`MASTER_EMAIL`을 바꾸려면 `firebase-config.js`와 `database.rules.json` 두 곳을 모두 고치고, 규칙을 Firebase 콘솔에 다시 게시해야 합니다.

## 주의

- 카카오톡 안의 브라우저에서는 구글 로그인이 막힙니다. 크롬이나 사파리로 열어 주세요.
- 행사 후 CSV로 내려받아 보관하고, 필요 없으면 Firebase 데이터를 지우는 것을 권장합니다.

## 수정 후 배포

`사이트-올리기.bat` 실행
