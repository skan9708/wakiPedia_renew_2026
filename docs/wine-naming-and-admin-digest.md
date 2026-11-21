# 새 와인 이름 기준과 관리자 승인 알림

## 확인된 와인 카탈로그 기준

- 대표 와인은 **영문 이름과 한글 이름**을 함께 둔다. 이름에는 빈티지 **연도**를 넣지 않는다. `Vintage`처럼 제품군을 나타내는 단어 자체는 남긴다.
- 품종이 와인 이름에 쓰일 때는 카탈로그의 통일된 한글 표기를 사용한다. 예: `카베르네 쇼비뇽`, `카브레네 소비뇽` → `카베르네 소비뇽`.
- 와인 **종류·원산지·품종**은 이름과 별도 필드로 저장한다. 검색에는 기존 이름 및 검색 별칭을 활용한다.
- 빈티지나 병 크기만 다른 같은 제품은 별도 대표 항목으로 늘리지 않는다. 다만 **제품군 또는 품종이 다르면** 이름이 비슷해도 별개일 수 있다. 이름만 보고 자동 통합하지 않는다.
- 중복 의심 후보는 관리자에게 보여주고, 병 라벨·사진·제품명·종류·원산지·품종 등을 확인한 다음 통합하거나 별개로 둔다. 통합할 때는 기존 리뷰와 사진, 좋아요, 즐겨찾기 및 주소를 보존한다.

위 내용은 기존 카탈로그 반영 기록과 중복 검토 기록에서 확인한 범위다. 모든 생산자명 표기, 지역명 포함 여부, 영문 대소문자 방식에 대한 확정된 공통 규칙은 기록에서 확인되지 않았다. 따라서 그런 부분은 자동으로 고치지 않는다.

## 신규 등록 자동 보정

등록 화면은 입력 중에 저장될 한글·영문 이름을 미리 보여준다. 서버는 등록 시에도 같은 보정을 적용한 다음 기존 와인과 비교한다.

1. 독립된 네 자리 빈티지 연도(`19xx`, `20xx`)와 괄호·공백의 잔여물을 제거한다. 제품명에 포함된 다른 숫자(`35 South`, `Bin 389`)와 `Vintage` 같은 제품군 표현은 유지한다.
2. 검증된 품종 오타만 카탈로그 표기로 바꾼다. 직접 입력한 품종 필드에도 같은 명시적 오타 목록을 적용한다.
3. 확실하지 않은 이름은 임의로 바꾸거나 자동 통합하지 않는다. 비슷한 와인은 기존 관리자 중복 승인 화면에서 판단한다.

오타 목록은 `backend/wine/naming.py`의 `GRAPE_SPELLINGS`에서 관리한다. 새 오타를 추가할 때는 다른 품종이나 고유 제품명을 손상하지 않는지 테스트한다. 이미 등록된 전체 와인 이름은 이 기능으로 일괄 수정하지 않는다.

## 저녁 승인 대기 메일

`send_pending_approvals_digest` 명령은 중복 의심 와인, 신규 원산지, 신규 품종의 **현재 승인 대기 건수**를 묶어 관리자에게 보낸다. 대기 건수가 0이면 보내지 않는다. 수신자는 `ADMIN_DIGEST_EMAILS`에 쉼표로 지정한 주소이며, 설정하지 않으면 활성 관리자 계정의 이메일이다.

`ops/systemd/waki-pending-approvals.timer`는 매일 **한국 시간 오후 7시(UTC 10:00)**에 한 번 실행하도록 작성했다. `--dry-run`으로 건수와 수신자 수를 먼저 확인할 수 있다. 실제 발송에는 운영 서버의 SES 또는 SMTP 설정이 필요하다. 관리자 알림만 먼저 켜려면 `/etc/waki.env`에 `ADMIN_DIGEST_SES_FROM_EMAIL=검증된_발신주소`와 `ADMIN_DIGEST_EMAILS=받을_주소`를 설정한다. 이 설정은 회원가입 이메일 인증이나 비밀번호 재설정을 켜지 않는다. SES 샌드박스 상태라면 받을 주소도 같은 리전에서 검증해야 한다. 발신·수신 검증, EC2 역할의 `ses:SendEmail` 권한 및 시험 발송을 확인하기 전에는 타이머를 활성화하지 않는다. 설정 후에는 서비스와 타이머 파일을 `/etc/systemd/system/`에 설치하고 `sudo systemctl daemon-reload`, `sudo systemctl enable --now waki-pending-approvals.timer`를 실행한다. `systemctl list-timers waki-pending-approvals.timer`와 `journalctl -u waki-pending-approvals.service`로 상태를 확인한다.

### 2026-11-17 운영 설정과 남은 AWS 작업

운영 서버의 `/etc/waki.env`에는 `ADMIN_DIGEST_EMAILS`와 `ADMIN_DIGEST_SES_FROM_EMAIL`을 모두 `wakipedia1682@gmail.com`으로 설정했다. 예약 파일은 설치했지만 **비활성화** 상태다. EC2 역할 `waki-ec2-role`의 SES 조회·신원 생성·시험 발송 시도는 모두 `AccessDenied`였다. 서버 자격 증명으로 IAM 정책을 추가할 수 없으므로 AWS 계정 관리자 콘솔에서 아래 두 단계를 완료해야 한다.

1. AWS 콘솔에서 **서울(ap-northeast-2)** 리전의 Amazon SES → **Verified identities** → **Create identity**로 `wakipedia1682@gmail.com`을 등록한다. 받은편지함의 검증 메일 링크를 클릭하고 상태가 **Verified**인지 확인한다. 발신자와 수신자가 같은 주소라면 SES 샌드박스 상태에서도 이 요약 메일의 시험 발송이 가능하다.
2. IAM → Roles → `waki-ec2-role` → **Add permissions** → **Create inline policy**의 JSON 탭에 아래 정책을 넣고 저장한다. 이 정책은 검증한 주소에서 그 주소로 보내는 관리자 요약 메일만 허용한다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SendWakiApprovalDigestOnly",
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:ap-northeast-2:112361949141:identity/wakipedia1682@gmail.com",
      "Condition": {
        "ForAllValues:StringEquals": {
          "ses:Recipients": ["wakipedia1682@gmail.com"]
        }
      }
    }
  ]
}
```

완료 후 서버에서 같은 주소로 SES 시험 메일을 보내고 수신 여부를 확인한 다음에만 타이머를 활성화한다. 이 정책은 다른 회원 주소로 이메일 인증번호를 보내는 권한을 포함하지 않는다. 그 기능을 시작할 때는 SES 샌드박스 해제와 별도의 발송 권한을 검토한다.

### Gmail로 관리자 알림만 보내기

AWS SES 권한 설정 대신 Gmail 앱 비밀번호로 관리자 승인 알림을 보낼 수 있다. 운영 환경의 `/etc/waki.env`에 `ADMIN_DIGEST_GMAIL_USER=wakipedia1682@gmail.com`, `ADMIN_DIGEST_GMAIL_APP_PASSWORD=앱_비밀번호`, `ADMIN_DIGEST_EMAILS=wakipedia1682@gmail.com`을 설정한다. 발송은 `smtp.gmail.com:587`의 TLS 연결을 사용한다. 이 설정은 회원가입 이메일 인증이나 비밀번호 재설정을 켜지 않는다. Gmail 설정이 완성되면 승인 알림은 기존 SES 설정보다 우선한다.

앱 비밀번호는 Google 계정의 2단계 인증을 켠 뒤 [앱 비밀번호](https://myaccount.google.com/apppasswords)에서 만든다. 계정 비밀번호를 넣지 말고, 발급된 앱 비밀번호만 서버 환경 파일에 저장한다. 비밀값을 채팅이나 저장소에 기록하지 않는다. 계정 보안 설정에 따라 앱 비밀번호를 만들 수 없는 경우도 있다.

앱 비밀번호는 `ops/set_admin_digest_gmail.py`의 표준 입력으로만 전달해 `/etc/waki.env`에 설치한다. 이 스크립트는 기존 파일의 소유자와 권한을 유지하고 이전 SES 전용 발신 설정을 제거한다. 비밀값을 명령 인수나 로그에 넣지 않는다.

설정 후 `send_pending_approvals_digest --test-email`로 대기 건수와 관계없이 시험 메일을 한 번 보내 수신 여부를 확인한 뒤에만 `waki-pending-approvals.timer`를 켠다.
