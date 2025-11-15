// PROXY_URL: 把这个替换为你部署到 Cloudflare Workers 的完整 URL（不要在前端放置 Airtable token）
// 例如: const PROXY_URL = 'https://your-worker-name.workers.dev';
// 如果你只写了主机名（没有协议），下面的规范化代码会尝试补上 https://
let PROXY_URL = 'https://rectpico8.yueminh2.workers.dev';
if (typeof PROXY_URL === 'string' && !PROXY_URL.startsWith('http://') && !PROXY_URL.startsWith('https://')) {
    // 在本地开发中如果需要使用 http，可以把 PROXY_URL 改为 'http://...'
    PROXY_URL = 'https://' + PROXY_URL;
}

// fetch with timeout helper
function fetchWithTimeout(resource, options = {}, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Request timeout after ' + timeout + 'ms'));
        }, timeout);

        fetch(resource, options).then(response => {
            clearTimeout(timer);
            resolve(response);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

// 获取页面上的元素
const form = document.getElementById('registration-form');
const submitButton = document.getElementById('submit-button');
const resultsContainer = document.getElementById('results-container');

if (!form || !submitButton || !resultsContainer) {
    console.warn('页面元素未找到，请确认 HTML 中有 id 为 registration-form / submit-button / results-container 的元素。');
}

/**
 * 功能1: 提交报名数据到 Airtable
 */
form && form.addEventListener('submit', async (event) => {
    event.preventDefault(); // 阻止表单默认的刷新页面行为

    // 获取用户输入的值
    var nameEl = document.getElementById('name-input');
    var wechatEl = document.getElementById('wechat-input');
    var ticketEl = document.getElementById('ticket-select');
    var answerEl = document.getElementById('answer-input');

    var name = nameEl && nameEl.value ? nameEl.value : '';
    var wechat = wechatEl && wechatEl.value ? wechatEl.value : '';
    var ticket = ticketEl && ticketEl.value ? ticketEl.value : '';
    var answer = answerEl && answerEl.value ? answerEl.value : '';

    if (!name || !wechat || !ticket) {
        alert('name? wechat? 票选了没?');
        return;
    }

    submitButton.disabled = true; // 防止重复提交
    var originalText = submitButton.textContent;
    submitButton.textContent = '骑上我的🦖。。。';

    // 前端只发送简单的 name/wechat 给 Worker，Worker 会把它映射到 Airtable 的字段
    var payload = { name: name, wechat: wechat, ticket: ticket, answer: answer };

    try {
        var response = await fetchWithTimeout(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, 15000); // 15s timeout

        if (!response.ok) {
            var text = '';
            try { text = await response.text(); } catch (e) { }
            throw new Error('no response: ' + response.status + ' ' + response.statusText + ' ' + text);
        }

        alert('Yea! Come come');
        form.reset(); // 清空表单
        // 显示感谢图片（如果存在）
        var popup = document.getElementById('image-popup');
        if (popup) popup.style.display = 'block';
        await fetchRegistrations(); // 报名成功后立即刷新列表
    } catch (error) {
        console.error('sry, fail', error);
        alert('没成功。。。等会儿试试？');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText || 'submit! Yea, see u soon';
    }
});

/**
 * 功能2: 从 Airtable 获取报名列表并显示在页面上
 */
async function fetchRegistrations() {
    resultsContainer.innerHTML = '<p>llloooaaadd...</p>'; // 显示加载状态

    try {
        // GET 请求通过 Worker 代理（Worker 会在后端和 Airtable 通信）
        var response = await fetch(PROXY_URL, {
            method: 'GET'
        });

        if (!response.ok) {
            var text = '';
            try { text = await response.text(); } catch (e) { }
            throw new Error('掉线了guys: ' + response.status + ' ' + response.statusText + ' ' + text);
        }

        var responseData = await response.json();
        var records = responseData.records || [];

        // 渲染列表
        resultsContainer.innerHTML = '';
        if (records.length === 0) {
            resultsContainer.innerHTML = '<p>nobody is here</p>';
        } else {
            records.forEach(function (person) {
                var personDiv = document.createElement('div');
                personDiv.className = 'person';
                var name = (person.fields && person.fields.Name) ? person.fields.Name : '(无名)';
                // var wechat = (person.fields && person.fields.wechat) ? person.fields.wechat : '(无)';
                // personDiv.textContent = '姓名: ' + name + ', 微信号: ' + wechat;
                var answer = (person.fields && person.fields.answer) ? person.fields.answer : '';

                var displayText = name + '入库成功 ';
                if (answer) {
                    displayText += ' | 留言: ' + answer;
                }
                personDiv.textContent = displayText;
                resultsContainer.appendChild(personDiv);
            });
        }
    } catch (error) {
        console.error('看不见隔壁有哪些人了:', error);
        resultsContainer.innerHTML = '<p>failfail 列表, refresh!</p>';
    }
}



// 页面加载完成后，立即执行一次获取列表的函数
// window.addEventListener('load', fetchRegistrations);

