const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 로컬 데이터 파일 경로
const DATA_FILE = "all_data.json";

// ZXing JAR 경로 (절대 경로)
const ZXING_PATH = "C:/zxing/javase-3.5.4-SNAPSHOT-jar-with-dependencies.jar";

// Multer 설정 (이미지 업로드를 위해)
const upload = multer({ dest: "C:/uploads/" });

// ZXing 바코드 디코딩 함수
// ZXing 바코드 디코딩 함수 수정
function decodeBarcodeWithZXing(imagePath) {
    return new Promise((resolve, reject) => {
        const absolutePath = path.resolve(imagePath).replace(/\\/g, "/");
        const fileUrl = `file:///${absolutePath}`;
        const command = `java -cp "${ZXING_PATH}" com.google.zxing.client.j2se.CommandLineRunner "${fileUrl}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("ZXing execution error:", error.message);
                reject(stderr || error.message);
            } else {
                // ZXing 결과에서 Parsed result만 추출
                const parsedResultMatch = stdout.match(/Parsed result:\s*(\d+)/);
                if (parsedResultMatch && parsedResultMatch[1]) {
                    resolve(parsedResultMatch[1].trim()); // 바코드 숫자만 반환
                } else {
                    reject("Failed to parse barcode result.");
                }
            }
        });
    });
}

// POST 요청: 이미지 업로드 및 데이터 처리
app.post("/analyze", upload.single("file"), async (req, res) => {
    try {
        console.log("POST request received.");

        if (!req.file) {
            console.error("No file uploaded.");
            return res.status(400).json({ error: "No file uploaded." });
        }

        const imagePath = req.file.path;
        console.log(`Uploaded image path: ${imagePath}`);

        // ZXing으로 바코드 디코딩
        let barcode;
        try {
            barcode = await decodeBarcodeWithZXing(imagePath);
            console.log(`Decoded barcode: ${barcode}`);
        } catch (error) {
            console.error("ZXing processing error:", error);
            return res.status(500).json({ error: "Failed to decode barcode using ZXing." });
        }

        // 로컬 데이터에서 검색
        let productName = "상품명을 직접 입력해 주세요";
        let manufacturer = "Unknown Manufacturer";

        try {
            const fileData = fs.readFileSync(DATA_FILE, "utf8");
            const jsonData = JSON.parse(fileData);

            const matchingData = jsonData.find((item) => item.BRCD_NO === barcode);

            if (matchingData) {
                productName = matchingData.PRDT_NM || "Not Available";
                manufacturer = matchingData.CMPNY_NM || "Not Available";
                console.log(`Matching product found: ${productName}`);
            } else {
                console.log(`No matching product found in local data for barcode: ${barcode}`);
            }
        } catch (error) {
            console.error("Error reading or parsing local data file:", error.message);
        }

        // BeepScan에서 이미지 URL 검색
        const beepscanUrl = `https://www.beepscan.com/barcode/${barcode}`;
        console.log(`Fetching product data from BeepScan for barcode: ${barcode}`);

        let absoluteImageUrl = "No image available";
        try {
            const { data: html } = await axios.get(beepscanUrl);
            const $ = cheerio.load(html);
            const imageUrl = $("img").first().attr("src");

            if (imageUrl) {
                absoluteImageUrl = imageUrl.startsWith("http")
                    ? imageUrl
                    : `https://www.beepscan.com${imageUrl}`;
                console.log(`Image URL from BeepScan: ${absoluteImageUrl}`);
            } else {
                console.log("No image found on BeepScan.");
            }
        } catch (error) {
            console.error("BeepScan request error:", error.message);
        }

        // 클라이언트로 데이터 반환
        return res.json({
            success: true,
            data: {
                productName,
                manufacturer,
                barcode,
                imageUrl: absoluteImageUrl,
            },
        });
    } catch (error) {
        console.error("Server processing error:", error.message);
        return res.status(500).json({ error: "Failed to process request." });
    } finally {
        // 업로드된 파일 삭제
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded image:", err.message);
                else console.log("Uploaded image deleted successfully.");
            });
        }
    }
});


// 서버 실행
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
