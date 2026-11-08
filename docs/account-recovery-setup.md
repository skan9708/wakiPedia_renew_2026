# 계정 복구 기능 운영 준비

현재 구현: 선택형 휴대폰 인증 등록과 아이디(이메일) 찾기, 이메일 비밀번호 재설정 링크. 카카오 전용 계정은 카카오 로그인으로 안내한다. 기존 회원의 번호는 없으므로 본인이 로그인한 뒤 `내 정보`에서 번호를 인증해야 아이디 찾기에 사용할 수 있다.

## 발송 서비스 준비

### 휴대폰 인증 문자

Solapi 계정에서 발신번호를 등록·활성화하고 API Key와 API Secret을 발급받는다. 문자 발송에는 잔액이 필요하다. 발신번호 등록 및 요금은 [Solapi 안내](https://solapi.com/guides/sms-howtosend)를 따른다.

문자 요청은 번호별 1분에 1회, 24시간에 5회까지 허용한다. 로그인한 계정은 번호를 바꿔도 24시간에 5회까지만 요청할 수 있다. 접속 IP별 한도는 1시간 10회·24시간 30회이며, 서비스 전체 한도는 1시간 200회다. nginx가 설정한 `X-Real-IP`만 로컬 프록시에서 신뢰한다. 인증번호는 5분 후 만료되며 입력 오류는 5회까지만 허용한다.

### 재설정 이메일

AWS SES 서울 리전에서 발신 주소 또는 도메인을 검증한다. 임의의 회원 이메일로 보내려면 SES 샌드박스 해제도 필요하다. EC2의 `waki-ec2-role`에는 검증한 발신 신원만 대상으로 `ses:SendEmail` 권한을 추가한다. 별도 SMTP 키나 AWS 액세스 키를 서버에 넣지 않는다. [SES 신원 검증](https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html), [IAM 발송 권한](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html)

## 서버 환경변수

값은 Git 저장소에 넣지 않고 `/etc/waki.env`에만 설정한다. 설정 뒤 `waki.service`를 재시작한다. 값을 설정하지 않으면 각 발송 기능은 비활성화되고, 기존 회원가입·로그인은 계속 작동한다.

```text
SOLAPI_API_KEY=...
SOLAPI_API_SECRET=...
SOLAPI_SENDER=등록된_발신번호_숫자만
SES_FROM_EMAIL=검증한_발신주소
SES_REGION_NAME=ap-northeast-2
PUBLIC_SITE_URL=https://wakipedia.co.kr
```

활성화 전 개인정보처리방침의 문자 발송업체, 보유기간, 시행일을 실제 설정과 대조하고 공지한다. 복구용 번호는 마케팅 수신 동의와 별개이며 광고 발송에 사용할 수 없다.
현재 개인정보처리방침의 휴대폰 번호 선택 수집 시행 예정일은 **2026년 11월 16일**이므로 그 전에는 Solapi 환경변수를 설정해 기능을 켜지 않는다.

## 배포 점검

1. DB 백업을 만든 후 `python manage.py migrate`를 실행한다.
2. `python manage.py cleanup_recovery`를 하루 한 번 실행하도록 서버 작업을 등록한다. 이 명령은 29일보다 오래된 인증·요청 기록을 삭제한다.
3. 테스트 계정으로 번호 등록 → 아이디 찾기, 이메일 재설정 → 새 비밀번호 로그인, 카카오 전용 계정 안내를 확인한다.
4. 인증번호를 5번 틀렸을 때 차단되는지, 번호를 삭제한 뒤 아이디 찾기가 안 되는지 확인한다.
5. 예전 로그인 세션은 재설정한 계정에서만 무효화되어야 한다.

문자/이메일 발송 서비스가 없으면 `GET /api/auth/recovery/status/`는 각 기능을 `false`로 응답하며 화면에서 발송 버튼을 비활성화한다.
