const axios = require("axios");
const fs = require("fs");
const xml2js = require("xml2js");

// API URL 및 인증키
const API_URL = "http://apis.data.go.kr/B553748/CertImgListServiceV3";
const SERVICE_KEY = "29PmxOoqDcWKN2xpyeYIapnfh/XsoGni+e+0NPwJFN57yGdUDTfxrbh5rDbPWv68fG7Md+SmIoZ4TmBFLQVc7w=="; // 인증키를 입력하세요.
const OUTPUT_FILE = "all_data2.json"; // 저장될 파일 이름

// 기본 요청 파라미터
const params = {
  ServiceKey: SERVICE_KEY,
  returnType: "JSON", // JSON 형식으로 반환
  pageNo: 1, // 페이지 번호
  numOfRows: 100, // 페이지당 데이터 개수
};

// 딜레이 함수 (API 요청 간 과부하 방지)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 데이터 수집 함수
async function fetchAllData() {
  let allData = []; // 모든 데이터를 저장할 배열
  let totalPages = 1; // 총 페이지 수

  try {
    // 첫 요청: 총 데이터 개수와 페이지 수 계산
    console.log("초기 요청 중...");
    const initialResponse = await axios.get(API_URL, { params });
    console.log("초기 응답 데이터:", initialResponse.data);

    // API에서 totalCount 가져오기
    const totalCount = initialResponse.data.body.totalCount;
    totalPages = Math.ceil(totalCount / params.numOfRows);

    console.log(`총 데이터 개수: ${totalCount}`);
    console.log(`총 페이지 수: ${totalPages}`);

    // 모든 페이지 데이터를 순차적으로 요청
    for (let page = 1; page <= totalPages; page++) {
      params.pageNo = page;
      console.log(`페이지 ${page}/${totalPages} 요청 중...`);

      try {
        const response = await axios.get(API_URL, { params });
        const items = response.data.body.items;
        allData = allData.concat(items); // 데이터 누적
        console.log(`페이지 ${page} 데이터 수신 완료.`);
      } catch (pageError) {
        console.error(`페이지 ${page} 요청 실패:`, pageError.response ? pageError.response.data : pageError.message);
      }

      // 요청 간 500ms 지연
      await delay(500);
    }

    // 모든 데이터를 파일로 저장
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allData, null, 2));
    console.log(`모든 데이터를 ${OUTPUT_FILE} 파일로 저장했습니다.`);
  } catch (error) {
    console.error("데이터 수집 중 오류 발생:", error.response ? error.response.data : error.message);
  }
}

fetchAllData();
