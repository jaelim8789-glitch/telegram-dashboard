# VPS 연결 문제 해결 가이드 (Lightnode 130.94.30.112)

## 문제 개요
- **VPS IP**: 130.94.30.112 (Lightnode)
- **문제**: SSH 접속이 불가능한 상태
- **가능한 원인**: Cloudflare Zero Trust 정책 또는 방화벽 설정 문제

## Cloudflare Zero Trust 설정 방법

### 1. Cloudflare Zero Trust 대시보드 접근
1. [dash.teams.cloudflare.com](https://dash.teams.cloudflare.com) 접속
2. 조직 계정으로 로그인

### 2. 네트워크 액세스 정책 설정
1. **Networks** → **Zero Trust Networks** 메뉴 선택
2. **Create a network** 클릭
3. 다음과 같이 구성:
   - Name: `telemon-vps-network`
   - CIDR: `130.94.30.112/32` (단일 IP)
   - Description: `TeleMon VPS for frontend deployment`

### 3. SSH 액세스 정책 생성
1. **Access** → **Applications** 메뉴 선택
2. **Add an application** 클릭
3. 다음과 같이 구성:
   - Application type: `Self-hosted`
   - Policy name: `telemon-ssh-access`
   - Network: 위에서 생성한 `telemon-vps-network` 선택
   - Identity: 적절한 사용자 그룹 지정 (예: `developers@telemon.online`)

### 4. SSH 연결 규칙 설정
1. **Access** → **Policies** 메뉴 선택
2. SSH 액세스를 위한 정책 추가:
   - Action: `Allow`
   - Include: 지정된 사용자 그룹 또는 이메일
   - Exclude: 필요 시 특정 IP 또는 사용자 제외

## VPS 방화벽 설정 확인

### 1. 방화벽 상태 확인
```bash
# Ubuntu/Debian
sudo ufw status

# CentOS/RHEL
sudo firewall-cmd --state
sudo iptables -L
```

### 2. SSH 포트(22) 열려 있는지 확인
```bash
# 현재 열린 포트 확인
sudo ss -tuln | grep :22

# 방화벽 규칙 확인
sudo ufw status numbered  # Ubuntu
sudo firewall-cmd --list-all  # CentOS
```

### 3. SSH 서비스 상태 확인
```bash
sudo systemctl status ssh
sudo systemctl status sshd
```

## 연결 테스트 방법

### 1. 포트 스캐닝으로 SSH 접근 여부 확인
```bash
nmap -p 22 130.94.30.112
telnet 130.94.30.112 22
```

### 2. SSH 연결 시도
```bash
# 자세한 디버깅 정보 확인
ssh -v root@130.94.30.112

# 특정 키 사용
ssh -i ~/.ssh/telemon_vps_key -v root@130.94.30.112
```

## 문제 해결 절차

### 1. Cloudflare Zero Trust 우회 테스트
1. Cloudflare Zero Trust 정책 임시 비활성화
2. SSH 연결 테스트
3. 연결 성공 시 Zero Trust 정책에 문제 있음이 확인됨

### 2. 방화벽 우회 테스트
```bash
# 임시로 방화벽 비활성화 (테스트 용도)
sudo ufw disable  # Ubuntu
sudo systemctl stop firewalld  # CentOS

# SSH 연결 테스트
ssh root@130.94.30.112
```

### 3. SSH 서비스 재시작
```bash
sudo systemctl restart ssh
sudo systemctl restart sshd
```

## SSH Config 설정 예시

`~/.ssh/config` 파일에 다음과 같이 설정:

```
Host telemon-lightnode
    HostName 130.94.30.112
    User root
    Port 22
    IdentityFile ~/.ssh/telemon_vps_key
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

## 보안 권고

1. **SSH 키 기반 인증 사용**: 비밀번호 인증 비활성화
2. **비표준 포트 사용**: 가능하면 SSH 기본 포트(22) 변경
3. **IP 제한**: 신뢰할 수 있는 IP만 SSH 접근 허용
4. **Cloudflare Zero Trust 적용**: 외부 접근 제어를 위해 Zero Trust 사용 권장

## 참고 자료

- [Cloudflare Zero Trust 문서](https://developers.cloudflare.com/cloudflare-one/)
- [SSH 보안 설정 가이드](https://www.ssh.com/academy/ssh/security)
- [Ubuntu UFW 문서](https://help.ubuntu.com/community/UFW)