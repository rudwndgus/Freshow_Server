const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio"); // HTML 파싱을 위한 라이브러리

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 로컬 데이터 파일 경로
const DATA_FILE = "all_data.json";

// POST 요청: 로컬 파일에서 제품명 찾기 + BeepScan에서 이미지 가져오기
app.post("/", async (req, res) => {
    console.log("POST request received.");
    const { barcode } = req.body;

    if (!barcode) {
        console.error("No barcode provided in POST request.");
        return res.status(400).json({ error: "No barcode provided" });
    }

    try {
        // 로컬 데이터 파일 읽기
        console.log("Reading local data file...");
        const fileData = fs.readFileSync(DATA_FILE, "utf8");
        const jsonData = JSON.parse(fileData);

        // 바코드와 매칭되는 데이터 찾기
        console.log(`Searching for barcode: ${barcode}`);
        const matchingData = jsonData.find((item) => item.BRCD_NO === barcode);

        let productName = "Unknown Product";
        let manufacturer = "Unknown Manufacturer";

        if (matchingData) {
            productName = matchingData.PRDT_NM || "Not Available";
            manufacturer = matchingData.CMPNY_NM || "Not Available";

            console.log("Matching product found:");
            console.log(`Product Name: ${productName}`);
            console.log(`Manufacturer: ${manufacturer}`);
            console.log(`Barcode: ${matchingData.BRCD_NO}`);
        } else {
            console.log(`No matching product found in local data for barcode: ${barcode}`);
        }

        // BeepScan 웹 페이지 크롤링
        const beepscanUrl = `https://www.beepscan.com/barcode/${barcode}`;
        console.log(`Fetching product data from BeepScan for barcode: ${barcode}`);

        const { data: html } = await axios.get(beepscanUrl); // BeepScan 페이지 요청
        const $ = cheerio.load(html);

        // 상품 이미지 URL 추출
        const imageUrl = $("img").first().attr("src");

        if (imageUrl) {
            const absoluteImageUrl = imageUrl.startsWith("http") ? imageUrl : `https://www.beepscan.com${imageUrl}`;
            console.log(`Image URL from BeepScan: ${absoluteImageUrl}`);

            return res.json({
                success: true,
                data: {
                    productName,
                    manufacturer,
                    barcode,
                    imageUrl: absoluteImageUrl,
                },
            });
        } else {
            console.log("No image found on BeepScan.");
            return res.json({
                success: true,
                data: {
                    productName,
                    manufacturer,
                    barcode,
                    imageUrl: "No image available",
                },
            });
        }
    } catch (error) {
        console.error("Error processing request:", error.message);
        return res.status(500).json({ error: "Failed to process request." });
    }
});

// 서버 실행
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
