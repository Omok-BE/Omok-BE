 # :black_circle::white_circle: 오목조목 Omok-BE --오목조목을 뱃지로 만들고 링크걸기?
실시간 훈수 오목 게임 <br>
오목조목은 플레이어로 게임에 참여할 수 있고 관전자로 훈수채팅을 하여 게임에 참여할 수 있는 서비스 입니다.<br><br><br>
![image](https://user-images.githubusercontent.com/84648177/162130022-7a8879ce-532c-491a-8569-8c2c76fc4d72.png)

<br><br>
## :books: 목차  &nbsp; | &nbsp; Contents
1. 웹 사이트 | 프로젝트 설명 영상
2. 프로젝트 기간 | 팀원
3. 아키텍쳐
4. 개발 환경  
5. 라이브러리
6. 주요 API기능 / API
7. 트러블 슈팅
<br><br><br>

---

## :earth_asia: [Home Page](https://omogjomog.com/) &nbsp; | &nbsp; [프로젝트 설명 영상](설명영상주소넣기)
### **실시간 훈수 오목 게임** <br>
오목조목은 플레이어로 게임에 참여할 수 있고 관전자로 훈수채팅을 하여 게임에 참여할 수 있는 서비스 입니다.
<br><br><br>

## :calendar: 프로젝트 기간 &nbsp; | &nbsp; 👨‍👩‍👧‍👧팀원  -- 이모지 추가? 
2022년 2월 25일 ~ 2022년 4월 07일 (총 6주)
<br><br>

* Front-end: [최종현](https://github.com/fatchoi3), [이가람](https://github.com/devmagrfs)
* Back-end: [김지성](https://github.com/jableee), [박수지](https://github.com/suzyp0223), [이학진](https://github.com/Haksae90)
* Designer: 이가람, 백수진
* [Front-end gitgub](https://github.com/fatchoi3/omog.git)
* [Back-end gitgub](https://github.com/Omok-BE/Omok-BE.git)
<br><br><br>

## 🖌️ 아키텍쳐 &nbsp; | &nbsp; Architecture
![image](https://user-images.githubusercontent.com/84648177/162151194-238465bb-7c57-4096-a9e2-94986272f0c4.png)

<br><br>

## ⚙️ 개발 환경 &nbsp; | &nbsp; Development Enviornment
![image](https://user-images.githubusercontent.com/84648177/162178084-1b9f830b-36c8-4a1b-8fee-d20d3fb41244.png)
![image](https://user-images.githubusercontent.com/84648177/162178154-5d51bab6-27c0-4e03-b47e-1a41ddb38d68.png)
![image](https://user-images.githubusercontent.com/84648177/162159039-b926d31a-4533-43cf-a024-4a28369fc618.png)
![image](https://user-images.githubusercontent.com/84648177/162159055-af51d57b-7757-4cc9-a47d-1c847010bd6b.png)
| 이름 | 구분 |
|--|--|
|Platform |Node.js v16.13.1 |
|Framework |Express |
|개발 언어 |JaveScript |
|Server |AWS EC2 |
|Database |MongoDB |
|CD |Github Actions |
|Load Balancer |AWS ALB |
|Error Monitoring |Sentry |
|Server Monitoring |AWS Cloud Watch |
|Tools |VSCode, Github, Notion |  



<br><br>
## :computer: 라이브러리 &nbsp; | &nbsp; Lirary
| Library | Description | Version |
|--|--|--|
|express |웹 프레임워크 |4.17.3 |
|mongoose|MongoDB ODM |6.24 |
|sentry |에러 모니터링 |6.19.4 |
|artilery |서버 부하테스트 |2.0.0-12 |
|cors |교차 리소스 공유 |2.8.5 |
|socket.io |Socket 통신 |4.4.1 |
|crypto |비밀번호 암호화 |1.0.1 |
|dotenv |환경변수 관리 |16.0.0 |
|jsonwebtoken |서명 암호화 |8.5.1 |
|swagger-jsdoc |API 문서화 |6.2.0 |
|swagger-ui-express |API 문서 UI 렌더링 |4.3.0 |
|ejs |템플릿 엔진 |3.1.6 | 
|prettier |클린 코드 |2.5.1 |
|eslint |클린 코드 |8.12.0  |
|eslint-config-prettier,<br> eslint-plugin-prettier |eslint, prettier 충돌방지 |8.5.0,<br> 4.0.0 |  
<br><br><br>

## :mega: 주요 API기능 &nbsp; | &nbsp; API
[API 노션 바로가기](https://www.notion.so/API-b2107de5871142b6a76f2cf3b3e20e42)
<details> 
 <summary><strong> API 문서 UI </strong></summary>
 <div markdown="1">
  <br>  
  
  ![api1](https://user-images.githubusercontent.com/84648177/162184073-61e41551-7e2f-4af8-a236-b051cf3a03b8.JPG)

  ![api2](https://user-images.githubusercontent.com/84648177/162184095-bc7b0e50-5b13-4b9c-846d-58d7c690e89c.JPG)

  ![api3](https://user-images.githubusercontent.com/84648177/162184118-423934a6-a49e-4009-8617-76194a57e5dc.JPG)

  ![api4](https://user-images.githubusercontent.com/84648177/162184129-2fa12faf-8da8-49a2-b87b-2bc4c33b669d.JPG)
</div>
</details>
<br>

## 🎯 백엔드 트러블 슈팅 &nbsp; | &nbsp;  Backend Trouble Shooting
<details>
<summary><strong> 서버 부하 테스트 & 스케일 업 </strong></summary>
 <br>
 <ul>
   <li><strong>상황</strong>
    <p> 유저 테스트 중 무한 채팅으로 인한 서버 과부하가 발생하여, DB가 정상 작동을 안하는 문제 발생
   <li><strong>해결 방안</strong> 
    <p> 내부 논의를 통해 무한 채팅은 FE에서 해결하기로 하였으나, 적어도 70명이 동시에 플레이 가능한 서버가 필요할 것으로 판단되어 스케일 업 하기로 결정
   <li><strong>결과</strong> 
    <p> 스케일 업하여 서버 부하 테스트를 진행하였고, 100명까지는 서비스가 충분히 가능하다고 판단되어 해당 사양으로 무리없이 운영함
 </ul>
</details>

<details> 
<summary><strong> 서버 로그 </strong></summary>

</details>


<details> 
 <summary><strong> 자동 배포 </strong></summary>
 <br>
 <ul>
  <li><strong>상황 1.</strong>
  <p> 배포하여 서비스를 운영하다보니 버그나 기능을 수정하여도, 즉시 배포하기가 어려움
  <li><strong>해결 방안</strong>
  <p> 소켓이 중심이 되고, 포인트와 승패가 민감한 게임이라 무중단 배포도 현재 서비스에 맞는 배포 방식이 아니라고 판단됨
  <li><strong>결과</strong>
  <p> 사용자가 거의 없는 시간이 새벽 4시경이었고, 해당 시간대에 자동 배포하여 업데이트하는 것으로 문제를 해결할 수 있다고 판단하였고, 여러 자동 배포 시스템 중에 전반적으로 효율적인 Github Actions를 사용하기로함
 <br><br>
 <li><strong>상황 2.</strong>  
  <p> Github Actions를 테스트하던 중, actions schedule의 실행 딜레이가 있음을 알게되었고, 실제로 이슈가 있음을 발견함
 <li><strong>해결 방안</strong>
  <p> 평균 대략 10분 정도 딜레이가 발생하지만, 시간대상 큰 무리가 없을 것으로 판단되어, 서버에 공식적으로 새벽 4:00-4:30을 서버 업데이트 시간으로 공지하고 자동배포 개시함
 
 </ul>
</details>


 



<br><br><br>


