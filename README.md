# HWP2TEXT.js
- HWP 내용을 Text 로 추출하는 Javascript 모듈
- HWP Document File V1.0 V1.5 V2.0 V2.1 V3.0 지원
- HWP Document File V5.0 미지원(지원예정)

# 기획
- HWP 파일 내부의 텍스트를 추출하여 웹으로 볼 수 있는 모둘 개발.

# 기능
- 표는 원본과 비슷하게 구현
- 포함이미지를 문서에 출력(bmp, gif)
- 하이퍼텍스트 부분은 링크/책갈피 등으로 활용.
- 글자 색상 적용
- 글자 속성 (일부) 적용
  - 이텔릭, 진하게, 밑줄, 위첨자, 아래첨자 => 적용
  - 외곽선, 그림자, 글꼴에 어울리는 빈칸 => 미적용
  
# 보완
- 문단읽기는 재귀호출로 처리했으나 스텍오버플로 이슈로 반복문 처리함
  - 첫문단리스트만 반복처리 내부에서 새로운 문단리스트(특수문자관련) 읽을 시 재귀호출함.
- HWP 문서 버전 V2.1의 그림영역(특수코드:11)은 정확한 정보가 없어 임의 보정함.

# 미완 
- 암호화 부분은 해결할 수 없음.
  - 문서양식만 공개되었을 뿐 문서꾸밈 관련은 공개되지 않았음.
- 필드코드영역(특수코드:5)의 정확한 디테일을 작성하지 않음.
  - 해당 문서를 발견하지 못함. (샘플을 얻지 못함.)
- 그림(특수코드:11)은 해당 디테일 문서구조(그리기 관련)를 적용해보려 했으나 문서내용을 해독하기 어려움이 있어 결국 포기함.
  - 큭수코드11 자료구조에 그림영역의 크기가 정의 되어 있으므로 해당 크기로 다음 읽을 부분을 이동하는 것으로 처리함.
- 추가정보블럭은 본문 텍스트 추출과는 관련이 없으므로 제대로 처리하지 않음.
  - <del>그림포함의 경우 추가정보블럭에 그림정보가 포함되지만 현재 처리하지 않음.</del>
  - bmp, gif 는 문서에 출력, pcx 는 변환처리가 필요하여 보류중.
  - 하이퍼텍스트정보는 링크 또는 책갈피 처리함.
  - 프리젠테이션설정정보 등 이외 설정은 의미 파악이 어려워 강제 스킵함.
  - 추가정보블럭#2 영역은 패스함.(때문에 바이트수가 다 읽히지 않은 경우가 존재함.)

# 이미지
- 문서정보
  > ![hwp01](https://github.com/Hyunee7/HWP2TEXT.js/blob/main/images/HWP01.jpg?raw=true)
- 이미지포함 본문
  > ![hwp02](https://github.com/Hyunee7/HWP2TEXT.js/blob/main/images/HWP02.jpg?raw=true)
- 책갈피&하이퍼링크 처리
  > ![hwp04](https://github.com/Hyunee7/HWP2TEXT.js/blob/main/images/HWP04.jpg?raw=true)
- 글자색 속성 적용
  > ![hwp05](https://github.com/Hyunee7/HWP2TEXT.js/blob/main/images/HWP05.jpg?raw=true)
- 표 처리
  > ![hwp06](https://github.com/Hyunee7/HWP2TEXT.js/blob/main/images/HWP06.jpg?raw=true)
