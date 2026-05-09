/*
 * Cloudflare Pages Function — /planner/submit
 * 处理 Planner 表单提交，存储线索到 KV，飞书 Webhook 通知
 * 环境变量: PLANNER_LEADS (KV binding), FEISHU_WEBHOOK_URL (可选)
 */

export async function onRequestPost({ request, env }) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
        const body = await request.json();

        // 校验必填字段
        if (!body.contact || !body.contact.name || !body.contact.email) {
            return jsonResponse(
                { success: false, error: 'Missing required fields: name, email' },
                400,
                corsHeaders
            );
        }

        // 构造线索对象
        const lead = {
            id: generateId(),
            submittedAt: new Date().toISOString(),
            contact: {
                name: body.contact.name,
                email: body.contact.email,
                company: body.contact.company || '',
                phone: body.contact.phone || '',
                country: body.contact.country || ''
            },
            specs: body.specs || {},
            recommendations: body.recommendations || []
        };

        // 存储到 Cloudflare KV
        if (env.PLANNER_LEADS) {
            try {
                // 按 ID 存储单个线索
                await env.PLANNER_LEADS.put(
                    'lead:' + lead.id,
                    JSON.stringify(lead),
                    { expirationTtl: 2592000 } // 30 天后过期
                );

                // 更新线索列表（维护最近 100 个线索的索引）
                const indexKey = 'leads:index';
                let indexData = [];
                try {
                    const existing = await env.PLANNER_LEADS.get(indexKey);
                    if (existing) indexData = JSON.parse(existing);
                } catch (e) { /* 索引为空时从零开始 */ }

                indexData.unshift(lead.id);
                if (indexData.length > 100) indexData = indexData.slice(0, 100);
                await env.PLANNER_LEADS.put(indexKey, JSON.stringify(indexData));
            } catch (kvError) {
                // KV 写入失败不阻塞响应，记录日志
                console.error('KV write error:', kvError);
            }
        }

        // 飞书 Webhook 通知（可选）
        if (env.FEISHU_WEBHOOK_URL) {
            sendFeishuNotification(env.FEISHU_WEBHOOK_URL, lead).catch(function (err) {
                console.error('Feishu webhook error:', err);
            });
        }

        return jsonResponse({ success: true, leadId: lead.id }, 200, corsHeaders);

    } catch (error) {
        console.error('Submit error:', error);
        return jsonResponse(
            { success: false, error: 'Internal server error' },
            500,
            corsHeaders
        );
    }
}

// 飞书 Webhook 通知（非阻塞，Fire-and-forget）
async function sendFeishuNotification(webhookUrl, lead) {
    var spec = lead.specs;
    var text = [
        '🏭 *RackingHub Planner — 新线索*',
        '',
        '**客户信息**',
        '• 姓名: ' + lead.contact.name,
        '• 邮箱: ' + lead.contact.email,
        lead.contact.company ? '• 公司: ' + lead.contact.company : '',
        lead.contact.phone ? '• 电话: ' + lead.contact.phone : '',
        lead.contact.country ? '• 国家: ' + lead.contact.country : '',
        '',
        '**仓库规格**',
        spec.length ? '• 尺寸: ' + spec.length + 'm × ' + spec.width + 'm' : '',
        spec.height ? '• 高度: ' + spec.height + 'm' : '',
        spec.palletWeight ? '• 托盘承重: ' + spec.palletWeight + 'kg' : '',
        spec.skuCount ? '• SKU 数量: ' + spec.skuCount : '',
        spec.rotation ? '• 轮转方式: ' + spec.rotation.toUpperCase() : '',
    ].filter(Boolean).join('\n');

    var payload = {
        msg_type: 'text',
        content: { text: text }
    };

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 5000); // 5 秒超时

    try {
        var response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        if (!response.ok) {
            console.error('Feishu webhook responded with status:', response.status);
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('Feishu webhook timeout (5s)');
        } else {
            console.error('Feishu webhook error:', err.message);
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

// 生成唯一 ID
function generateId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '';
    for (var i = 0; i < 12; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// 返回 JSON 响应
function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {})
    });
}
