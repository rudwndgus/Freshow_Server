const axios = require("axios");
const fs = require("fs");
const xml2js = require("xml2js");

// 공공데이터 API 키와 URL 구조
const SERVICE_KEY = "47ca0c2f56d24717bafb";
const API_URL = `http://openapi.foodsafetykorea.go.kr/api/${SERVICE_KEY}/I2570/XML`;

// 데이터 요청 범위
const RECORDS_PER_REQUEST = 1000; // 한 번의 요청당 데이터 개수
const START_INDEX = 1; // 시작 인덱스

// 모든 데이터를 다운로드하고 로컬에 저장
async function downloadAllData() {
    let startIdx = START_INDEX;
    let endIdx = startIdx + RECORDS_PER_REQUEST - 1;
    let allData = []; // 전체 데이터를 저장할 배열
    let totalCount = null;

    try {
        console.log("Starting data download...");

        while (true) {
            console.log(`Fetching data from ${startIdx} to ${endIdx}...`);

            // API 호출
            const apiUrl = `${API_URL}/${startIdx}/${endIdx}`;
            const response = await axios.get(apiUrl, { responseType: "text" });
            const xmlData = response.data;

            // XML 데이터를 JSON으로 변환
            const jsonData = await xml2js.parseStringPromise(xmlData, { explicitArray: false });

            // total_count 확인
            if (!totalCount && jsonData.I2570 && jsonData.I2570.total_count) {
                totalCount = parseInt(jsonData.I2570.total_count, 10);
                console.log(`Total records available: ${totalCount}`);
            }

            // row 데이터 확인 및 추가
            if (jsonData.I2570 && jsonData.I2570.row) {
                const rows = Array.isArray(jsonData.I2570.row)
                    ? jsonData.I2570.row
                    : [jsonData.I2570.row];
                allData = allData.concat(rows);
            }

            // 다음 범위로 이동
            startIdx += RECORDS_PER_REQUEST;
            endIdx = startIdx + RECORDS_PER_REQUEST - 1;

            // 데이터 다운로드 완료 여부 확인
            if (totalCount && startIdx > totalCount) {
                console.log("All data has been downloaded.");
                break;
            }
        }

        // 데이터 저장
        const fileName = "all_data.json";
        fs.writeFileSync(fileName, JSON.stringify(allData, null, 2), "utf8");
        console.log(`Data saved to '${fileName}'.`);
    } catch (error) {
        console.error("Error during data download:", error.message);
    }
}

// 함수 실행
downloadAllData();
