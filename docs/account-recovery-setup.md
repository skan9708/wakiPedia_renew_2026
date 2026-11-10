# 계정 복구 기능 운영 준비

현재 구현: 이메일 가입 인증번호 확인, 선택형 휴대폰 인증 등록과 아이디(이메일) 찾기, 이메일 비밀번호 재설정 링크. 메일 발송 설정이 완료되면 신규 이메일 가입에 인증이 필수가 된다. 카카오 전용 계정은 카카오 로그인으로 안내한다. 기존 회원의 번호는 없으므로 본인이 로그인한 뒤 `내 정보`에서 번호를 인증해야 아이디 찾기에 사용할 수 있다. 휴대폰 번호는 입력만으로 등록되지 않으며 소유 인증을 마쳐야 아이디 찾기에 사용할 수 있다.

## 발송 서비스 준비

### 휴대폰 인증 문자

Solapi 계정에서 발신번호를 등록·활성화하고 API Key와 API Secret을 발급받는다. 문자 발송에는 잔액이 필요하다. 발신번호 등록 및 요금은 [Solapi 안내](https://solapi.com/guides/sms-howtosend)를 따른다.

문자 요청은 번호별 1분에 1회, 24시간에 5회까지 허용한다. 로그인한 계정은 번호를 바꿔도 24시간에 5회까지만 요청할 수 있다. 접속 IP별 한도는 1시간 10회·24시간 30회이며, 서비스 전체 한도는 1시간 200회다. nginx가 설정한 `X-Real-IP`만 로컬 프록시에서 신뢰한다. 인증번호는 5분 후 만료되며 입력 오류는 5회까지만 허용한다.

### 가입 인증 및 재설정 이메일

AWS SES 서울 리전에서 발신 주소 또는 도메인을 검증한다. 임의의 회원 이메일로 보내려면 SES 샌드박스 해제도 필요하다. EC2의 `waki-ec2-role`에는 검증한 발신 신원만 대상으로 `ses:SendEmail` 권한을 추가한다. 별도 SMTP 키나 AWS 액세스 키를 서버에 넣지 않는다. [SES 신원 검증](https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html), [IAM 발송 권한](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html)

관리자 권한으로 AWS 콘솔에서 다음 순서로 진행한다.

1. 리전을 `ap-northeast-2`(서울)로 선택한다. SES → **Verified identities** → **Create identity**에서 처음 사용할 발신 주소 `wakipedia1682@gmail.com`을 등록하고, 해당 받은편지함의 AWS 확인 링크를 클릭한다. 회사 도메인 발신 주소를 쓰려면 대신 `wakipedia.co.kr`을 검증하고 필요한 DNS 레코드를 등록한다.
2. SES → **Account dashboard**에서 샌드박스 상태를 확인하고 **Request production access**를 신청한다. 메일 유형은 **Transactional**, 웹사이트는 `https://wakipedia.co.kr`이다. 승인 전에는 검증되지 않은 회원 주소로 재설정 메일을 보낼 수 없다.
3. IAM → Roles → `waki-ec2-role` → **Add permissions** → **Create inline policy**의 JSON 탭에 아래 정책을 넣는다. 발신 주소를 바꾸면 `Resource`의 이메일 주소도 함께 바꾼다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SendWakipediaAccountEmail",
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:ap-northeast-2:112361949141:identity/wakipedia1682@gmail.com"
    }
  ]
}
```

신원 검증·샌드박스 해제·IAM 권한을 확인한 뒤에만 `/etc/waki.env`에 `SES_FROM_EMAIL=wakipedia1682@gmail.com`을 넣고 `waki.service`를 재시작한다. 이때 이메일 비밀번호 재설정과 이메일 가입 인증이 함께 활성화된다. 가입 인증번호는 10분 유효하며, 이메일당 1분에 1회·24시간에 5회, IP당 1시간에 10회·24시간에 30회, 전체 서비스 1시간에 200회까지 요청할 수 있다. 입력 오류는 5회까지만 허용하고, 인증번호는 가입에 사용한 이메일과 일치할 때 한 번만 사용된다.

## 서버 환경변수

값은 Git 저장소에 넣지 않고 `/etc/waki.env`에만 설정한다. 설정 뒤 `waki.service`를 재시작한다. 값을 설정하지 않으면 각 발송 기능은 비활성화되고, 기존 회원가입·로그인은 계속 작동한다. 메일 발송을 켜면 신규 이메일 가입은 인증번호 확인이 필수가 되므로, 메일 수신·스팸함·반송을 먼저 시험한다.

```text
SOLAPI_API_KEY=...
SOLAPI_API_SECRET=...
SOLAPI_SENDER=등록된_발신번호_숫자만
SES_FROM_EMAIL=검증한_발신주소
SES_REGION_NAME=ap-northeast-2
PUBLIC_SITE_URL=https://wakipedia.co.kr
```

활성화 전 개인정보처리방침의 이메일·문자 발송업체, 보유기간, 시행일을 실제 설정과 대조하고 공지한다. 현재 개정 방침의 시행 예정일은 **2026년 11월 16일**이므로 새 이메일 인증과 선택형 휴대폰 인증은 그 전에는 켜지 않는다. 복구용 번호는 마케팅 수신 동의와 별개이며 광고 발송에 사용할 수 없다.

## 배포 점검

1. DB 백업을 만든 후 `python manage.py migrate`를 실행한다. 이메일 인증 테이블과 인증 시각 필드가 추가된다.
2. `python manage.py cleanup_recovery`를 하루 한 번 실행하도록 서버 작업을 등록한다. 이 명령은 29일보다 오래된 이메일·휴대폰 인증 및 요청 기록을 삭제한다.
   운영 서버에는 `waki-recovery-cleanup.timer`가 등록되어 있으며 매일 03:15 UTC(한국 시간 12:15)에 실행된다. 상태 확인: `sudo systemctl list-timers waki-recovery-cleanup.timer`.
3. 테스트 계정으로 가입 이메일 인증 → 가입 완료, 이메일 재설정 → 새 비밀번호 로그인, 카카오 전용 계정 안내를 확인한다. 문자 발송 기능을 별도로 켠 뒤에만 번호 등록 → 아이디 찾기를 시험한다.
4. 인증번호를 5번 틀렸을 때 차단되는지, 번호를 삭제한 뒤 아이디 찾기가 안 되는지 확인한다.
5. 예전 로그인 세션은 재설정한 계정에서만 무효화되어야 한다.

문자/이메일 발송 서비스가 없으면 `GET /api/auth/recovery/status/`는 각 기능을 `false`로 응답하며 화면에서 발송 버튼을 비활성화한다. 이메일 발송이 준비되면 `signupEmailVerificationEnabled`가 `true`가 되고 이메일 가입 시 인증번호가 필수가 된다.

메일 발송 설정 전 UI 검토용 주소: `https://wakipedia.co.kr/auth/signup?previewEmailVerification=1`. 인증 영역과 입력 칸을 보여주지만 발송과 가입 제출은 비활성화된다. 일반 가입 화면에는 미리보기가 표시되지 않는다.
