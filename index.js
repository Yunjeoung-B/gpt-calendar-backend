require('dotenv').config();

const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// 👉 여기에 자신의 OAuth 클라이언트 ID/시크릿 직접 입력
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://gpt-calendar-backend.onrender.com/oauth2callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// 🔑 access token을 임시로 메모리에 저장 (실제 서비스에서는 DB나 Redis 권장)
let ACCESS_TOKEN = null;

// ------------------ 🔐 OAuth 인증 라우트 ------------------

app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    ACCESS_TOKEN = tokens.access_token;

    console.log('✅ 인증 완료! Access Token:', ACCESS_TOKEN);
    res.send('🎉 구글 인증 성공! 이제 일정 가져오기 가능해요.');
  } catch (err) {
    console.error('❌ 인증 실패:', err);
    res.status(500).send('구글 인증 실패');
  }
});

// ------------------ 📅 오늘 일정 불러오기 라우트 ------------------

app.get('/today-events', async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: 'Access token이 없습니다. 먼저 /auth로 인증하세요.' });
  }

  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0)).toISOString();
  const end = new Date(today.setHours(23, 59, 59)).toISOString();

  try {
    const response = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    res.json({ events: response.data.items });
  } catch (err) {
    console.error('❌ 일정 가져오기 실패:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ------------------ 서버 시작 ------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
