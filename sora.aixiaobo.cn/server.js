const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ================= 配置区域 =================
const CONFIG = {
    apiKey: 'd8312697c954d844f4385c26a94c996a' || "YOUR_API_KEY_HERE", 
    baseUrl: "https://api.kie.ai/api/v1",
    adminUser: "admin" 
};
// ===========================================

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- 数据库工具 ---
function readDb() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const defaultDb = { 
                users: [{
                    id: 1, username: "admin", password: "123456", 
                    group: "svip", balance: 999999, created_at: Date.now()
                }], 
                tasks: [] 
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
            return defaultDb;
        }
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (!data.users) data.users = [];
        if (!data.tasks) data.tasks = [];
        return data;
    } catch (e) { return { users: [], tasks: [] }; }
}

function writeDb(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); } catch(e){}
}

// --- 鉴权核心 (支持 Header 和 Cookie) ---
function getUserFromRequest(req) {
    let token = req.headers['authorization']?.replace('Bearer ', '');
    
    // 1. 如果 Header 没带，尝试从 Cookie 获取
    if (!token && req.headers.cookie) {
        const match = req.headers.cookie.match(/auth_token=([^;]+)/);
        if (match) token = match[1];
    }

    // 2. 还是没有？尝试从 new-api-user (前端存的ID) 获取
    if (!token && req.headers.cookie) {
        const matchId = req.headers.cookie.match(/new-api-user=([^;]+)/);
        if (matchId) token = "mock-token-" + matchId[1];
    }

    console.log(`🔍 [AuthCheck] 提取 Token: ${token || '无'}`);

    if (token && token.includes('mock-token-')) {
        const db = readDb();
        const match = token.match(/mock-token-(\d+)/);
        if (match && match[1]) {
            return db.users.find(u => String(u.id) === match[1]);
        }
    }
    return null;
}

// --- 代理请求 ---
async function proxyRequest(endpoint, method, body, req) {
    const currentUser = getUserFromRequest(req);
    let userProvidedKey = req.headers['authorization']?.replace('Bearer ', '');
    
    // 如果 Authorization 是 mock-token，说明不是真实 Key，清空它
    if (userProvidedKey && userProvidedKey.includes('mock-token')) userProvidedKey = null;

    let finalKey = userProvidedKey;

    // 权限判断
    if (!finalKey) {
        if (currentUser && currentUser.username === CONFIG.adminUser) {
            console.log(`[Auth] 管理员 ${currentUser.username} 免 Key 模式`);
            finalKey = CONFIG.apiKey;
        } 
    }

    if (!finalKey || finalKey === "YOUR_API_KEY_HERE") {
        throw new Error("权限不足：普通用户需自备 API Key (仅管理员可免输)");
    }

    const res = await fetch(`${CONFIG.baseUrl}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalKey}`
        },
        body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
}

// --- 中间件 ---
app.use((req, res, next) => {
    if (req.url.includes('watermark') || req.url.includes('Watermark') || req.url.includes('remove')) {
        if(!req.url.includes('remove_watermark')) { 
             return res.status(403).json({ code: 403, msg: "该功能已下线" });
        }
    }
    next();
});

// ================= 路由定义 =================

// 1. 注册
app.post('/api/user/register', (req, res) => {
    const { username, password } = req.body;
    const db = readDb();
    if (db.users.find(u => u.username === username)) return res.json({ success: false, message: "账号已存在" });

    const newUser = {
        id: Date.now(), username, password, group: "vip", balance: 0, created_at: Date.now()
    };
    db.users.push(newUser);
    writeDb(db);
    res.json({ success: true, message: "注册成功" });
});

// 2. 登录 (写入 Cookie)
app.post('/api/user/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDb();
    
    if (username === 'admin' && !db.users.find(u => u.username === 'admin')) {
         db.users.push({ id: 1, username: "admin", password: "123456", group: "svip", balance: 99999 });
         writeDb(db);
    }

    const user = db.users.find(u => u.username === username);
    if (!user) return res.json({ success: false, message: "账号不存在" });
    if (String(user.password).trim() !== String(password).trim()) return res.json({ success: false, message: "密码错误" });

    const token = "mock-token-" + user.id;
    console.log(`✅ 登录成功: ${username} | Token: ${token}`);

    // 【核心】主动设置 Cookie，防止前端不存 Token
    res.cookie('auth_token', token, { maxAge: 90000000, httpOnly: false });
    res.cookie('new-api-user', user.id, { maxAge: 90000000, httpOnly: false });

    res.json({ success: true, data: { token, ...user } });
});

// 3. 用户信息
app.get('/api/user/self', (req, res) => {
    const user = getUserFromRequest(req);
    if (user) {
        console.log(`👤 [Self] 认证通过: ${user.username}`);
        return res.json({ success: true, data: user });
    }
    console.log(`⚠️ [Self] 认证失败`);
    res.status(401).json({ success: false, message: "未登录" });
});

// 4. 业务接口
app.post('/jobs/createTask', async (req, res) => {
    try {
        const result = await proxyRequest('/jobs/createTask', 'POST', req.body, req);
        if(result.code === 200 && result.data?.taskId) {
            const db = readDb();
            db.tasks.unshift({ id: result.data.taskId, status: 'processing', created_at: Date.now(), model: req.body.model });
            writeDb(db);
        }
        res.json(result);
    } catch (e) { res.status(500).json({ code: 500, msg: e.message }); }
});

app.get('/jobs/recordInfo', async (req, res) => {
    try {
        const result = await proxyRequest(`/jobs/recordInfo?taskId=${req.query.taskId}`, 'GET', null, req);
        res.json(result);
    } catch (e) { res.status(500).json({ code: 500, msg: e.message }); }
});

app.get('/chat/credit', async (req, res) => {
    try {
        const result = await proxyRequest('/chat/credit', 'GET', null, req);
        res.json(result);
    } catch (e) { res.status(500).json({ code: 500, msg: e.message }); }
});

app.get(['/studio', '/studio.html'], (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'studio.html'))) res.sendFile(path.join(__dirname, 'studio.html'));
    else res.status(404).send('Missing studio.html');
});

app.get(['/api/status', '/config'], (req, res) => res.json({ success: true, data: { status: "ok" } }));

app.get(/(.*)/, (req, res) => {
    if (req.path.endsWith('.html')) {
        const fp = path.join(__dirname, req.path);
        if (fs.existsSync(fp)) return res.sendFile(fp);
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => { console.log(`🚀 Server: http://localhost:${PORT}`); });