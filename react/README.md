# Yeobiyo React 컴포넌트

`Yeobiyo.jsx` 한 파일이 개인 버전 전체(입력 폼 · 운임 구간 · 동승자 · 영수증 첨부 · A4 신청서 인쇄)를 담고 있습니다.
의존성은 `react`뿐이고 CSS 파일은 필요 없습니다 (컴포넌트가 직접 주입).

## 설치

```bash
npm create vite@latest yeobiyo -- --template react
cd yeobiyo && npm install
cp .../Yeobiyo.jsx src/
```

## 사용

```jsx
import Yeobiyo from './Yeobiyo';
import { FARE_TABLE, ALIASES } from './trip-data.js';

export default function App() {
  return (
    <Yeobiyo
      officeHead="전남광주통합특별시신안교육장"
      defaultOrg="○○교육지원청 행정지원과"
      defaultOrigin="목포"
      fareTable={FARE_TABLE}
      aliases={ALIASES}
    />
  );
}
```

### props

| prop | 기본값 | 설명 |
| --- | --- | --- |
| `officeHead` | 전남광주통합특별시신안교육장 | 신청서 하단 "○○ 귀하" |
| `defaultOrg` | `''` | 소속 초기값 (저장값이 있으면 그쪽 우선) |
| `defaultOrigin` | 목포 | 출발지 초기값 |
| `fareTable` | `[]` | `[[코드, 지역, 목적지명, 왕복운임], ...]` |
| `aliases` | `[]` | `[[별칭, 목적지명], ...]` |

## 동작

- 신청인 정보(소속·직급·성명·출발지)와 최근 출장 5건은 `localStorage`에 저장
- 출장지·날짜를 넣으면 운임 구간이 왕복 두 줄로 자동 생성, 직접 수정하면 자동 생성 중단
- 편도 구간은 운임표 왕복액의 1/2, 복귀 구간은 출발지 기준으로 조회
- 숙박비 상한: 서울 100,000 / 6대 광역시 80,000 / 그 밖 70,000 (1박)
- 동승자를 추가하면 운임 0원 신청서가 사람 수만큼 추가 생성
- 영수증은 Ctrl+V 붙여넣기 · 드래그&드롭 · 파일 선택, 카드 드래그로 순서 변경, 파일명에서 금액·구분 자동 인식
- 인쇄 시 `data-noprint` 영역은 숨고 신청서와 영수증 첨부 페이지만 A4로 출력

## 데스크톱 앱(설치파일)로 만들 때

Electron 또는 Tauri에 이 React 앱을 그대로 싣고 창을 띄우면 됩니다. 인쇄는 브라우저 `window.print()`를 그대로 사용합니다.
