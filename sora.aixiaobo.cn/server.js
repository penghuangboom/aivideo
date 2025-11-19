const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
// 设置端口号（可通过环境变量配置）
const PORT = process.env.PORT || 3000;

// 后端API服务器配置（可通过环境变量配置）
const API_TARGET = {
    host: process.env.API_HOST || process.env.API_TARGET_HOST || 'sora.aixiaobo.cn',
    port: parseInt(process.env.API_PORT || process.env.API_TARGET_PORT || '443'),
    protocol: process.env.API_PROTOCOL || 'https:'
};

// 打印配置信息
console.log('后端API服务器配置:');
console.log(`  主机: ${API_TARGET.host}`);
console.log(`  端口: ${API_TARGET.port}`);
console.log(`  协议: ${API_TARGET.protocol}`);
console.log('');

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// 收集请求体的辅助函数
function collectRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = [];
        req.on('data', chunk => {
            body.push(chunk);
        });
        req.on('end', () => {
            resolve(Buffer.concat(body));
        });
        req.on('error', reject);
    });
}

// API代理函数（改进版，支持完整的请求体转发）
function proxyApiRequest(req, res, targetPath = null) {
    const parsedUrl = url.parse(req.url, true);
    // 使用原始路径（包含查询参数）或指定的目标路径
    const requestPath = targetPath || parsedUrl.path;
    
    // 复制请求头，移除一些不应该转发的头部
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    
    const options = {
        hostname: API_TARGET.host,
        port: API_TARGET.port,
        path: requestPath,
        method: req.method,
        headers: {
            ...headers,
            host: API_TARGET.host
        }
    };
    
    console.log(`代理API请求: ${req.method} ${requestPath}`);
    
    // 根据协议选择使用 http 或 https
    const requestModule = API_TARGET.protocol === 'https:' ? https : http;
    const proxyReq = requestModule.request(options, (proxyRes) => {
        // 设置CORS头部
        const responseHeaders = {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, new-api-user, New-Api-User',
            'Access-Control-Expose-Headers': 'new-api-user, New-Api-User'
        };
        
        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        console.error('代理请求错误:', err);
        console.error('错误详情:', {
            code: err.code,
            message: err.message,
            syscall: err.syscall,
            hostname: err.hostname
        });
        
        // 根据错误类型返回不同的错误信息
        let errorMessage = '代理请求失败';
        if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
            errorMessage = `无法解析后端服务器地址: ${API_TARGET.host}。请检查网络连接或配置正确的后端服务器地址。`;
            console.error('提示: 可以通过环境变量配置后端服务器地址:');
            console.error('  API_HOST=your-api-host.com API_PORT=8086 node server.js');
        } else if (err.code === 'ECONNREFUSED') {
            errorMessage = `无法连接到后端服务器 ${API_TARGET.host}:${API_TARGET.port}。请检查服务器是否运行。`;
        } else if (err.code === 'ETIMEDOUT') {
            errorMessage = `连接后端服务器超时: ${API_TARGET.host}:${API_TARGET.port}`;
        } else {
            errorMessage = `代理请求失败: ${err.message}`;
        }
        
        res.writeHead(500, { 
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
            success: false,
            message: errorMessage,
            error: {
                code: err.code,
                type: 'proxy_error'
            }
        }));
    });
    
    // 处理请求体
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        collectRequestBody(req).then(body => {
            if (body.length > 0) {
                proxyReq.write(body);
            }
            proxyReq.end();
        }).catch(err => {
            console.error('读取请求体错误:', err);
            proxyReq.end();
        });
    } else {
        proxyReq.end();
    }
}

// 读取JSON文件的辅助函数
function readJsonFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (parseErr) {
                    reject(parseErr);
                }
            }
        });
    });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 解码URL（处理中文路径）
    let filePath = decodeURIComponent(req.url);
    const parsedUrl = url.parse(filePath, true);
    
    console.log('请求路径:', filePath, '方法:', req.method);
    
    // 处理OPTIONS预检请求（CORS）
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, new-api-user, New-Api-User',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }
    
    // 处理 /config 配置接口
    if (parsedUrl.pathname === '/config') {
        const configPath = path.join(__dirname, 'api', 'status.html');
        readJsonFile(configPath).then(data => {
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(data));
        }).catch(err => {
            console.warn('读取配置文件失败，返回默认配置:', err.message);
            // 返回默认配置
            const defaultConfig = {
                systemName: "AI生产力 · 专业的视频处理平台",
                logoUrl: "/ims/logo.png",
                description: "让视频创作更高效",
                features: {
                    enableRedeem: true,
                    enableBatchGenerate: true,
                    enablePricing: true,
                    enableQRCode: false,
                    enableVipOnlyMode: false,
                    enableBanner: true
                },
                balanceLimit: {
                    minBalance: 0,
                    displayBalance: 0
                }
            };
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(defaultConfig));
        });
        return;
    }
    
    // 处理 /tutorial-config 教程配置接口
    if (parsedUrl.pathname === '/tutorial-config') {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            enabled: false,
            items: []
        }));
        return;
    }
    
    // 处理所有 API 请求（/api/ 开头的路径）
    if (parsedUrl.pathname.startsWith('/api/')) {
        proxyApiRequest(req, res);
        return;
    }
    
    // 处理视频相关 API（/v1/ 开头的路径）
    if (parsedUrl.pathname.startsWith('/v1/')) {
        proxyApiRequest(req, res);
        return;
    }
    
    // 处理旧的代理路径
    if (filePath.startsWith('/temuFxCategory/') || filePath.startsWith('/platform-api/')) {
        proxyApiRequest(req, res);
        return;
    }
    
    // 默认首页
    if (filePath === '/' || parsedUrl.pathname === '/') {
        filePath = '/index.html';
    }
    
    // 构建文件的完整路径
    const fullPath = path.join(__dirname, filePath);
    
    // 获取文件扩展名
    const extname = path.extname(fullPath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // 读取文件
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在
                res.writeHead(404, { 
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end('<h1>404 - 文件未找到</h1><p>请求的文件不存在</p>', 'utf-8');
            } else {
                // 服务器错误
                res.writeHead(500, { 
                    'Content-Type': 'text/html; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end('<h1>500 - 服务器错误</h1><p>' + err.code + '</p>', 'utf-8');
            }
        } else {
            // 成功返回文件内容（添加CORS头部）
            res.writeHead(200, { 
                'Content-Type': contentType + '; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log('========================================');
    console.log(`服务器已启动！`);
    console.log(`本地访问地址: http://localhost:${PORT}`);
    console.log(`网络访问地址: http://127.0.0.1:${PORT}`);
    console.log(`生产环境地址: https://sora.aixiaobo.cn`);
    console.log('========================================');
    console.log(`首页: http://localhost:${PORT}`);
    console.log('========================================');
    console.log('按 Ctrl+C 停止服务器');
});
