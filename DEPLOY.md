# Vercel 배포 안내

## 1. 저장소 올리기

GitHub에 `mobile-poem` 폴더 안의 파일을 독립 저장소로 올리거나, 기존 저장소 안에 `mobile-poem` 폴더를 포함합니다. `server.js`, `app-core.js`, `vercel.json`, `package.json`, `public/` 전체가 필요합니다.

실제 `.env`, `exhibit.env`, 서비스 계정 키 파일, `node_modules`는 업로드하지 마세요. `.env.example`은 빈 설정 예제입니다.

## 2. Google Sheets 준비

- 스프레드시트에 새 탭 `mobile_poems`를 만듭니다. 기존 `test1`은 열 구조가 다르므로 사용하지 않습니다.
- A1:F1에 `id`, `timestamp`, `name`, `emotions`, `answers`, `poem`을 순서대로 입력합니다.
- Google 서비스 계정 이메일을 스프레드시트 편집자로 공유합니다.
- `SHEET_ID`는 주소의 `/d/` 뒤부터 `/edit` 앞까지의 문자열입니다. `gid`가 아닙니다.
- 새 Google Cloud 프로젝트라면 Google Sheets API 활성화가 필요합니다. 기존 서비스 계정을 재사용할 수도 있습니다.

## 3. Vercel에서 프로젝트 생성

Vercel에서 **Add New → Project**를 선택하고 GitHub 저장소를 Import합니다.

| 항목 | 설정 |
|---|---|
| Root Directory | 전체 프로젝트를 올렸다면 `mobile-poem` |
| Root Directory | mobile-poem 내부 파일만 독립 저장소로 올렸다면 저장소 루트 `./` |
| Framework Preset | Express 자동 감지 확인 |
| Install Command | 기본값 사용 (`npm install`) |
| Build Command | 별도 Override 설정하지 않음 |
| Output Directory | 별도 Override 설정하지 않음 |
| Node.js Version | 22.x (`package.json`에도 지정됨) |

`public`을 Root Directory나 Output Directory로 지정하지 마세요. 앱은 정적 사이트가 아니라 Express 서버와 함께 배포됩니다. `npm start`는 로컬 실행용이며 Vercel Build Command에 넣지 않습니다. Express 자동 감지가 안 되면 Root Directory에 `server.js`와 `package.json`이 있는지 확인합니다.

## 4. Environment Variables 등록

배포 화면 또는 Project Settings → Environment Variables에 다음 값을 넣습니다.

| Key | Value |
|---|---|
| `OPENAI_API_KEY` | 실제 OpenAI API 키 |
| `OPENAI_MODEL` | `gpt-4.1-mini` 또는 사용 가능한 호환 모델 |
| `GCP_CLIENT_EMAIL` | Google 서비스 계정 이메일 |
| `GCP_PRIVATE_KEY` | 서비스 계정 개인 키 전체 |
| `SHEET_ID` | 스프레드시트 ID |
| `SHEET_NAME` | `mobile_poems` |

운영 배포는 **Production** 환경에 등록합니다. Preview 배포에서도 실제 제출을 시험하려면 Preview에도 설정하되, 테스트용 시트를 따로 쓰면 운영 응답과 섞이지 않습니다.

개인 키는 `-----BEGIN PRIVATE KEY-----`와 `-----END PRIVATE KEY-----`를 포함합니다. 실제 줄바꿈 또는 문자 `\n`을 사용할 수 있고, 입력란에서 키 바깥을 큰따옴표로 감싸지 않습니다. `PORT`나 TD 설정은 필요 없습니다. 환경변수를 나중에 변경했다면 Redeploy해야 새 배포에 반영됩니다.

## 5. Deploy 및 QR 확인

1. Deploy를 누르고 완료되면 Vercel이 표시하는 **Production 도메인**을 엽니다. 예: `https://프로젝트이름.vercel.app` (실제 주소는 대시보드에서 확인).
2. `/health`에서 `{"ok":true}`를 확인합니다. 서버 실행 확인이며 외부 API 연결 검증은 아닙니다.
3. 실제 설문을 제출해 시가 표시되고 Sheets에 한 행이 저장되는지 확인합니다. 시 생성 API 비용이 발생합니다.
4. 결과 페이지 링크를 새로 열어 같은 시가 나오는지 확인합니다.
5. 공통 참여 QR에는 **Production 도메인의 첫 화면 `/`**를 넣습니다. Preview URL이나 개인 결과 URL을 넣지 않습니다.
6. 로그인하지 않은 브라우저와 휴대폰 LTE/5G에서 접속을 확인합니다. Vercel 로그인 화면이 나타나면 대상 Production 배포의 Deployment Protection 설정을 확인합니다.

## 실행 구조와 한계

- `server.js`: Vercel에 Express 앱을 export합니다. 로컬 `npm start`에서만 포트를 엽니다.
- `app-core.js`: 시 생성, Google Sheets 저장, 결과 조회를 담당합니다.
- `public/`: Vercel CDN에서 HTML/CSS/JS/포스터를 제공합니다. `express.static`은 로컬 실행용입니다.
- `vercel.json`: 함수 실행 시간을 120초로 설정하고 정적 페이지에도 보안 헤더를 적용합니다. 프로젝트에서 Fluid compute 및 허용 실행 시간을 확인하세요.
- 데이터는 Sheets에 저장하므로 Vercel 로컬 파일 저장소를 사용하지 않습니다.
- Vercel은 자동으로 여러 인스턴스를 실행할 수 있습니다. 현재 Map 기반 동시 요청 병합은 같은 인스턴스에만 적용됩니다. **다른 인스턴스로 동시에 들어온 동일 제출은 시가 중복 생성·저장될 수 있습니다.** 강한 중복 방지가 필요하면 외부 DB의 고유 키/공유 잠금을 추가해야 합니다.
- 시 생성이나 저장이 시간 초과되면 화면에서 재시도할 수 있습니다. 함수 로그에서 오류를 확인하세요.

## 문제 해결

| 증상 | 확인 |
|---|---|
| 정적 화면만 보이거나 API가 404 | Root Directory와 Express 감지 확인 |
| 서버 환경변수 설정 필요 | Production/Preview 중 해당 배포의 변수 설정 및 Redeploy |
| 제출 시 오류 | API 키, 모델 권한, Google 키 줄바꿈, 시트 편집 권한과 탭 이름 |
| 함수 시간 초과 | Functions 설정의 실행 제한과 외부 API 지연 확인 |
| QR 접속 시 Vercel 로그인 요구 | Production 도메인 사용 여부와 Deployment Protection 확인 |

## 공식 문서

- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [함수 실행 시간 설정](https://vercel.com/docs/functions/configuring-functions/duration)
- [환경변수](https://vercel.com/docs/environment-variables)
