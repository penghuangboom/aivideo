const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ================= 配置区域 (Kie AI) =================
const CONFIG = {
    // 务必填入你的 Key
    apiKey: 'd8312697c954d844f4385c26a94c996a' || "YOUR_API_KEY_HERE", 
    
    // Kie AI 基础地址
    baseUrl: "https://api.kie.ai/api/v1",
    
    // 模型名称
    model: "sora-2-text-to-video"
};
// ===================================================

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/assets', express.static(path.join(__dirname, 'sora.aixiaobo.cn/assets')));
app.use('/ims', express.static(path.join(__dirname, 'sora.aixiaobo.cn/ims')));

// --- 数据库工具 ---
function readDb() {
    try {
        if (!fs.existsSync(DB_FILE)) return { users: [], tasks: [], tokens: [] };
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { console.error(e); return {}; }
}

function writeDb(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); return true; } 
    catch (e) { return false; }
}

// --- 辅助函数：通用 API 调用 ---
async function callRemoteApi(endpoint, method, body = null) {
    const url = `${CONFIG.baseUrl}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json'
    };
    
    // 简单的日志，避免打印敏感 Key
    console.log(`[Remote API] ${method} ${url}`);
    
    try {
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${JSON.stringify(data)}`);
        }
        return data;
    } catch (error) {
        console.error("[Remote API Error]", error.message);
        throw error;
    }
}

// --- 路由定义 ---

// 1. 状态检查
app.get(['/api/status', '/config'], (req, res) => {
    const db = readDb();
    res.json({ success: true, data: db.system_status || {} });
});

// 2. 登录
app.post('/api/user/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDb();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true, data: { token: "mock-token-" + user.id, ...user } });
    } else {
        res.json({ success: false, message: "账号或密码错误" });
    }
});

app.get('/api/user/self', (req, res) => {
    const db = readDb();
    res.json({ success: true, data: db.users[0] });
});

// 3. 视频生成接口 (/jobs/createTask)
app.post('/v1/videos', async (req, res) => {
    const db = readDb();
    const userPrompt = req.body.prompt;

    if (!CONFIG.apiKey || CONFIG.apiKey === "YOUR_API_KEY_HERE") {
        return res.status(500).json({ success: false, message: "请配置 API Key" });
    }

    console.log("收到生成请求:", userPrompt);

    try {
        // 构造请求体
        const requestBody = {
            model: CONFIG.model,
            input: {
                prompt: userPrompt,
                aspect_ratio: "landscape",
                n_frames: "10",
                remove_watermark: true
            }
        };

        // 调用 API
        const apiResult = await callRemoteApi('/jobs/createTask', 'POST', requestBody);
        
        // 检查返回
        if (apiResult.code !== 200 || !apiResult.data?.taskId) {
             throw new Error(apiResult.message || "任务创建失败：未返回 taskId");
        }

        const remoteTaskId = apiResult.data.taskId;

        // 存入本地数据库
        const newTask = {
            id: remoteTaskId,
            local_created_at: Date.now(),
            status: "processing",
            prompt: userPrompt,
            model: CONFIG.model,
            result_url: "",
            cover_url: ""
        };

        if (!db.tasks) db.tasks = [];
        db.tasks.unshift(newTask);
        writeDb(db);

        res.json({ success: true, data: newTask });

    } catch (error) {
        console.error("生成接口报错:", error);
        res.status(500).json({ 
            success: false, 
            message: "调用服务失败: " + error.message 
        });
    }
});

// 4. 任务列表 & 自动轮询状态 (适配 /jobs/recordInfo)
app.get('/api/task/self', async (req, res) => {
    let db = readDb();
    let tasks = db.tasks || [];
    let hasUpdates = false;

    // 筛选出“未完成”的任务进行查询
    const pendingTasks = tasks.filter(t => 
        !['succeeded', 'failed'].includes(t.status)
    );

    if (pendingTasks.length > 0 && CONFIG.apiKey !== "YOUR_API_KEY_HERE") {
        console.log(`正在同步 ${pendingTasks.length} 个任务的状态...`);
        
        for (const task of pendingTasks) {
            try {
                // === 核心修改：使用 recordInfo 接口查询 ===
                const remoteData = await callRemoteApi(`/jobs/recordInfo?taskId=${task.id}`, 'GET');
                
                // 确保请求成功
                if (remoteData.code === 200 && remoteData.data) {
                    const serverState = remoteData.data.state; // "success", "doing"?, "fail"?

                    // 映射状态
                    // Kie AI: "success" -> 本地: "succeeded"
                    if (serverState === 'success') {
                        task.status = 'succeeded';
                        hasUpdates = true;

                        // === 核心修改：解析 string 类型的 resultJson ===
                        if (remoteData.data.resultJson) {
                            try {
                                const parsedResult = JSON.parse(remoteData.data.resultJson);
                                // 提取视频地址
                                if (parsedResult.resultUrls && parsedResult.resultUrls.length > 0) {
                                    task.result_url = parsedResult.resultUrls[0];
                                    // 如果没有专门的封面，就用视频地址或默认图
                                    task.cover_url = task.result_url; 
                                }
                            } catch (parseErr) {
                                console.error(`解析 resultJson 失败 Task ${task.id}:`, parseErr);
                            }
                        }
                    } else if (serverState === 'fail' || serverState === 'failed') {
                        task.status = 'failed';
                        task.error = remoteData.data.failMsg || "生成失败";
                        hasUpdates = true;
                    }
                    // 如果是其他状态 (如 "doing", "queue")，保持 "processing" 不变
                }
            } catch (err) {
                console.error(`同步任务 ${task.id} 失败:`, err.message);
            }
        }
    }

    if (hasUpdates) writeDb(db);

    res.json({
        success: true,
        data: {
            page: 1,
            page_size: 100,
            total: tasks.length,
            items: tasks
        }
    });
});

app.get('/api/token/index', (req, res) => {
    const db = readDb();
    res.json({ success: true, data: { page: 1, total: 1, items: db.tokens } });
});

// 兜底路由
app.get(/(.*)/, (req, res) => {
    const indexPaths = [
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'sora.aixiaobo.cn', 'index.html')
    ];
    for (const p of indexPaths) {
        if (fs.existsSync(p)) return res.sendFile(p);
    }
    res.status(404).send('Index not found');
});

app.listen(PORT, () => {
    console.log(`Kie AI 适配版服务器运行中: http://localhost:${PORT}`);
});
