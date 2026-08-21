const express = require('express');
const cors = require('cors');
require('dotenv').config(); // .env 파일에서 환경 변수를 불러오기 위해 반드시 필요합니다.

const app = express();
app.use(cors());
const PORT = 3000;

// .env 파일에 안전하게 저장된 환경 변수를 불러옵니다.
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

app.get('/api/contributions', async (req, res) => {
    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY ? NOTION_API_KEY.trim() : ''}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("노션 API 에러:", data);
            return res.status(response.status).json({ success: false, error: data.message });
        }

        res.json({ success: true, data: data.results });
    } catch (error) {
        console.error("서버 통신 에러:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`백엔드 서버가 http://localhost:${PORT} 에서 정상적으로 실행 중입니다.`);
});