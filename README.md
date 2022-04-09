 # :black_circle::white_circle: 오목조목 Omok-BE 
실시간 훈수 오목 게임 <br>
<br>
[![image](https://user-images.githubusercontent.com/84648177/162130022-7a8879ce-532c-491a-8569-8c2c76fc4d72.png "https://omogjomog.com")](https://omogjomog.com)
<br><br>

## 📚목차   |  Contents
1. [웹 사이트 | 프로젝트 발표 영상](#웹-사이트---프로젝트-발표-영상)
2. [프로젝트 기간 | 팀원](#프로젝트-기간----팀원)
3. [아키텍쳐 | Architecture](#아키텍쳐----architecture)
4. [피그마 | figma](#피그마--figma)
5. [개발 환경 | Development Environment](#개발-환경--development-environment)
6. [라이브러리 | Library](#라이브러리----library)
7. [API http | socket](#api-http---socket)
8. [DB Modeling](#db-modeling)
9. [트러블 슈팅 | Trouble Shooting](#트러블-슈팅--trouble-shooting)
<br><br><br>

---

## 🌏웹 사이트 |  프로젝트 발표 영상
[![오목조목 웹 사이트](https://user-images.githubusercontent.com/84648177/162561226-108d54e2-93f4-4db2-bf2b-434dde01fd07.png "https://omogjomog.com")](https://omogjomog.com)
<br>
이미지를 클릭하면 오목조목 웹 사이트 https://omogjomog.com 로 이동합니다.
<br>

프로젝트 발표 영상: ![오목조목 발표영상](https://youtu.be/uGsDLXacve4)

<br>
### **실시간 훈수 오목 게임** <br>
오목조목은 플레이어로 게임에 참여할 수 있고 관전자로 훈수채팅을 하여 게임에 참여할 수 있는 서비스 입니다.
<br><br><br>

## 📆프로젝트 기간  |  👨‍👩‍👧‍👧팀원
2022년 2월 25일 ~ 2022년 4월 07일 (총 6주)
<br><br>

* Front-end: [최종현](https://github.com/fatchoi3), [이가람](https://github.com/devmagrfs)
* Back-end: [김지성](https://github.com/jableee), [박수지](https://github.com/suzyp0223), [이학진](https://github.com/Haksae90)
* Designer: 허화영, 백수진
* [Front-end gitgub](https://github.com/fatchoi3/omog.git)
* [Back-end gitgub](https://github.com/Omok-BE/Omok-BE.git)
<br><br><br>

## 💡아키텍쳐  |  Architecture
![image](https://user-images.githubusercontent.com/84648177/162151194-238465bb-7c57-4096-a9e2-94986272f0c4.png)

<br><br>

## 🚀피그마 | Figma
[오목조목 피그마 바로가기](https://www.figma.com/file/xe93TTBrEOv0uUJykYl7cN/%ED%95%AD%ED%95%B4-99-2%EC%A1%B0-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8?node-id=0%3A1)
<br><br>

## 💎개발 환경 | Development Environment
![image](https://user-images.githubusercontent.com/84648177/162178084-1b9f830b-36c8-4a1b-8fee-d20d3fb41244.png)
![image](https://user-images.githubusercontent.com/84648177/162178154-5d51bab6-27c0-4e03-b47e-1a41ddb38d68.png)
![image](https://user-images.githubusercontent.com/84648177/162159039-b926d31a-4533-43cf-a024-4a28369fc618.png)
![image](https://user-images.githubusercontent.com/84648177/162159055-af51d57b-7757-4cc9-a47d-1c847010bd6b.png)
| 구분 | 이름 |
|--|--|
|Language |JaveScript |
|Platform |Node.js v16.13.1 |
|Framework |Express |
|Server |AWS EC2 |
|Database |MongoDB |
|CD |Github Actions |
|Load Balancer |AWS ALB |
|Error Monitoring |Sentry |
|Server Monitoring |AWS Cloud Watch |
|Tools |VSCode, Git, Github, Notion | 

<br><br>

## 💻라이브러리  |  Library
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
|eslint-config-prettier,<br> eslint-plugin-prettier |eslint, prettier 충돌방지 |8.5.0, 4.0.0 |

<br><br>

## 📣API http |  socket
[API(http & socket) 노션 바로가기](https://www.notion.so/API-6d0bc66baee54f9fb606ccb0970a2323)
<details> 
 <summary><strong> API 문서 UI-swagger (http API만) </strong></summary>
 <div markdown="1">
  <br>  
  
  ![api1](https://user-images.githubusercontent.com/84648177/162184073-61e41551-7e2f-4af8-a236-b051cf3a03b8.JPG)

  ![api2](https://user-images.githubusercontent.com/84648177/162184095-bc7b0e50-5b13-4b9c-846d-58d7c690e89c.JPG)

  ![api3](https://user-images.githubusercontent.com/84648177/162184118-423934a6-a49e-4009-8617-76194a57e5dc.JPG)

  ![api4](https://user-images.githubusercontent.com/84648177/162184129-2fa12faf-8da8-49a2-b87b-2bc4c33b669d.JPG)
  
</div>
</details>
<br><br>

## 💡DB Modeling
[DB Modling 노션 바로가기](https://www.notion.so/DB-Modeling-253f60c0231842c29f044bf6b374ce1b)
<br><br>

## 🎯트러블 슈팅 | Trouble Shooting
<details>
<summary><strong> 서버 부하 테스트 & 스케일 업 </strong></summary>
 <br>
 <ul>
   <li><strong>상황</strong>
    <p> 유저 테스트 중 무한 채팅으로 인한 서버 과부하가 발생하여, DB가 정상 작동을 안하는 문제 발생
   <li><strong>해결 방안</strong> 
    <p> 내부 논의를 통해 무한 채팅은 FE에서 해결하기로 하였으나, 적어도 70명이 동시에 플레이 가능한 서버가 필요할 것으로 판단함되어 스케일 업 하기로 결정
   <li><strong>서버 부하 테스트 관련</strong> 
    <p> 서비스 특성상 서버 부하 테스트는 socket 부분만 진행하면 될 것으로 판단
    <p> 처음에는 오픈소스로 대중적인 J METER를 이용하여 서버 부하 테스트를 진행하려했으나, socket.io와 호환 이슈가 있음을 발견
    <p> Node.js 라이브러리 중 socket.io에서 공식적으로 추천하는 Artillery를 통하여 서버 부하 테스트를 진행하기로 결정
    <p> 서비스 중 채팅과 팀 변경으로 인한 부하가 가장 클 것으로 판단되어, 두 가지를 집중적으로 반복하는 시나리오를 작성함
    <p> Artillery report와 AWS Cloud Watch로 서버 부하 수준을 파악하였고, 100명까지 서비스가 충분히 가능하다고 판단된 사양으로 스케일 업을 진행함
    <li><strong>서버 부하 테스트 결과</strong>
     <p> 시나리오 1 결과
      <img src="https://user-images.githubusercontent.com/95196634/162210742-d6ccfe60-2701-448d-8dd8-2b84a2cdd64e.png", width="1000">
     <p> 시나리오 2 결과
      <img src="https://user-images.githubusercontent.com/95196634/162211934-b3e6a7e4-81cc-4a29-9bad-61c4067c6a52.png", width="1000">
     <p> 시나리오 3 결과
      <img src="https://user-images.githubusercontent.com/95196634/162212142-798233d7-5870-4f3b-9351-239f12aec47b.png", width="1000">
   <li><strong>결과</strong> 
    <p> 스케일 업을 진행한 후로 부하 없이 서비스를 안정적으로 제공하고 있음
 </ul>
</details>

<details> 
<summary><strong> 서버 로그 </strong></summary>
 <br>
 <ul>
  <li><strong>상황</strong>
  <p> 게임이 끝나면 게임방과 유저의 정보들이 변경되기 때문에, 실시간으로 운영자들이 서버 로그를 추적하지 않으면 에러와 버그의 원인을 파악하기 어려운 문제 발생
  <li><strong>해결 과정</strong>
  <p> 버그를 해결하기 위해, 버그가 일어난 당시의 서버 로그와 유저와 해당 게임방의 정보를 저장, 추적해야겠다고 판단함
  <p> 게임창에 서버 리폿 버튼을 생성하여, 유저가 간단한 설명과 함께 버그 리폿을 하면 게임방과 유저들의 정보를 저장되어 버그가 일어났을 당시의 상호아을 확인할 수 있게 만듦
  <p> PM2 logrotate 모듈을 통해 일자별로 err로그와 out로그로 나누어서 저장하여 관리
  <p> Sentry를 사용하여 에러가 언제 발생했는지 확인하여 정확한 에러 로그를 파악할 수 있도록 함
  <li><strong>결과</strong>
  <p> 버그 리폿 정보를 통해 서버 로그를 추적함으로 에러와 버그를 보완하고 있음
</details>

<details> 
 <summary><strong> 자동 배포 </strong></summary>
 <br>
 <ul>
  <li><strong>상황 1</strong>
  <p> 배포하여 서비스를 운영하다보니 버그나 기능을 수정하여도, 서비스를 운영 중인 유저로 인해 즉시 배포하기가 어려움
  <li><strong>해결 과정</strong>
  <p> 스케일 아웃을 하여 무중단 배포를 하는 것을 고려했으나, 정확하게 서버마다 같은 방에서 게임을 하는 사람들을 배분하는 것이 불가능하고, 포인트와 승패가 민감한 게임이라 무중단 배포가 현재 서비스에 맞지 않는 배포 방식이라 판단함 
  <p> 사용자의 이용 시간대를 보니 새벽 4시경에는 이용자가 거의 없다고 판단되어, 해당 시간대에 자동 배포하여 업데이트 하는 것으로 문제를 해결할 수 있다고 판단함.
  <p> 여러 자동 배포 툴 중에 전반적으로 효율적인 Github Actions를 사용하기로 결정함
 <br><br>
 <li><strong>상황 2</strong>  
  <p> Github Actions를 테스트하던 중, Actions schedule의 실행 딜레이가 있음을 알게 발견하였고, 실제로 해당 이슈가 있음을 발견함
  <p> 테스트를 거쳐 평균 대략 10분 정도 딜레이가 되는 것을 파악하였고, 시간대상 큰 무리가 없을 것으로 판단되어, 서버에 공식적으로 새벽 4:00~4:30을 서버 업데이트 시간으로 공지하고 자동배포를 시작함
   <li><strong>결과</strong>
  <p> Github Actions를 통해 버그 리폿으로 파악된 버그들을 수정하여, 매일 새벽 4시 경에 자동 배포하는 방식으로 서비스를 운영하고 있음
<img width="969" alt="스크린샷 2022-04-07 오후 10 55 09" src="https://user-images.githubusercontent.com/95196634/162215800-7839ac4b-9ba2-4df9-ab2a-9f9e90d240c9.png">

 </ul>
</details>


<br><br><br>


