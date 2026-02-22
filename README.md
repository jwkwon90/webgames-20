WebGames-20

Web Game 20개 챌린지 — Phaser 3 템플릿 + 첫 게임(Brick Breaker)

Structure
- template/: Phaser starter files
- games/01-brick-breaker/: 완성된 브레이크아웃 게임 (MVP)

Instructions
1) 로컬에서 레포 초기화 및 커밋:
   cd webgames-20
   git init
   git add .
   git commit -m "chore: initial webgames-20 template + 01-brick-breaker"

2) GitHub에 새 리포 생성(브라우저 또는 gh CLI):
   gh repo create <your-user>/webgames-20 --public --source=. --remote=origin
   # 또는 브라우저에서 새 리포를 만들고 origin을 연결하세요

3) Push:
   git push -u origin main

4) 배포(권장): Vercel에 로그인 → New Project → Import GitHub repo → 배포

Notes
- 각 게임은 games/<nn-name>/index.html 로 접근 가능하도록 구성되어 있습니다.
- 첫 게임은 Phaser 3 기반의 간단한 Brick Breaker입니다.
