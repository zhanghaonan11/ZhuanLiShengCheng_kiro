// 全局变量
let generatedPatents = [];
let isGenerating = false;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadSavedConfig();
});

// 初始化事件监听器
function initializeEventListeners() {
    // Temperature滑块更新
    const temperatureSlider = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperatureValue');
    temperatureSlider.addEventListener('input', function() {
        temperatureValue.textContent = this.value;
    });

    // 生成按钮点击事件
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);
    
    // 下载按钮点击事件
    document.getElementById('downloadBtn').addEventListener('click', handleDownload);

    // 保存配置
    ['apiKey', 'endpointUrl', 'modelName', 'temperature'].forEach(id => {
        document.getElementById(id).addEventListener('change', saveConfig);
    });
}

// 保存配置到本地存储
function saveConfig() {
    const config = {
        apiKey: document.getElementById('apiKey').value,
        endpointUrl: document.getElementById('endpointUrl').value,
        modelName: document.getElementById('modelName').value,
        temperature: document.getElementById('temperature').value
    };
    localStorage.setItem('patentGeneratorConfig', JSON.stringify(config));
}

// 加载保存的配置
function loadSavedConfig() {
    const savedConfig = localStorage.getItem('patentGeneratorConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        document.getElementById('apiKey').value = config.apiKey || '';
        document.getElementById('endpointUrl').value = config.endpointUrl || 'https://api.openai.com/v1/chat/completions';
        document.getElementById('modelName').value = config.modelName || 'gpt-4.1-mini';
        document.getElementById('temperature').value = config.temperature || '0.7';
        document.getElementById('temperatureValue').textContent = config.temperature || '0.7';
    }
}

// 处理生成请求
async function handleGenerate() {
    if (isGenerating) return;

    // 验证输入
    if (!validateInputs()) return;

    isGenerating = true;
    generatedPatents = [];
    
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    // 更新UI状态
    generateBtn.disabled = true;
    downloadBtn.disabled = true;
    progressContainer.style.display = 'block';
    document.getElementById('patentResults').innerHTML = '';

    const inventionIdea = document.getElementById('inventionIdea').value;
    const generateCount = parseInt(document.getElementById('generateCount').value);

    try {
        for (let i = 0; i < generateCount; i++) {
            // 更新进度
            const progress = ((i) / generateCount) * 100;
            progressBar.style.width = progress + '%';
            progressText.textContent = `正在生成第 ${i + 1} 个专利文档...`;

            // 生成专利文档
            const patent = await generatePatent(inventionIdea, i + 1);
            generatedPatents.push(patent);
            
            // 显示生成的专利
            displayPatent(patent, i);
        }

        // 完成
        progressBar.style.width = '100%';
        progressText.textContent = `成功生成 ${generateCount} 个专利文档！`;
        downloadBtn.disabled = false;

    } catch (error) {
        console.error('生成失败:', error);
        showError('生成失败: ' + error.message);
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 2000);
    }
}

// 验证输入
function validateInputs() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const endpointUrl = document.getElementById('endpointUrl').value.trim();
    const inventionIdea = document.getElementById('inventionIdea').value.trim();

    if (!apiKey) {
        showError('请输入API Key');
        return false;
    }

    if (!endpointUrl) {
        showError('请输入Endpoint URL');
        return false;
    }

    if (!inventionIdea) {
        showError('请输入发明构思');
        return false;
    }

    return true;
}

// 生成单个专利文档
async function generatePatent(inventionIdea, index) {
    const apiKey = document.getElementById('apiKey').value;
    const endpointUrl = document.getElementById('endpointUrl').value;
    const modelName = document.getElementById('modelName').value;
    const temperature = parseFloat(document.getElementById('temperature').value);

    // 构建提示词
    const prompt = buildPatentPrompt(inventionIdea);

    const requestBody = {
        model: modelName,
        messages: [
            {
                role: "system",
                content: "你是一个专业的专利撰写专家，具备深厚的技术背景和专利法律知识。"
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: temperature,
        max_tokens: 4000
    };

    const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
        id: index,
        title: `专利文档_${index}`,
        content: content,
        timestamp: new Date().toLocaleString('zh-CN')
    };
}

// 构建专利生成提示词
function buildPatentPrompt(inventionIdea) {
    return `请根据以下发明构思生成完整的专利申请文档：

发明构思：${inventionIdea}

请严格按照以下步骤生成：

步骤1：生成说明书部分
- 技术领域：明确发明所属的技术领域
- 背景技术：描述现有技术的不足和问题
- 发明内容：详细阐述发明的技术方案和有益效果
- 附图说明：描述相关附图（如有）
- 具体实施方式：提供详细的实施例和技术细节
- 段落编号格式：0001, 0002, 0003...

步骤2：提取摘要部分
- 简明扼要地概述发明的技术方案
- 突出主要技术特征和有益效果
- 字数控制在200-300字

步骤3：生成权利要求书
- 独立权利要求：包含发明的基本技术方案
- 从属权利要求：对独立权利要求的进一步限定和优化
- 编号格式：1. 2. 3. ...

请按照以下markdown格式输出：

**摘要**
[摘要内容]

**权利要求书**
[权利要求内容]

**说明书**
[说明书内容]

请确保技术描述准确、完整，符合专利撰写规范。`;
}

// 显示生成的专利
function displayPatent(patent, index) {
    const resultsContainer = document.getElementById('patentResults');
    
    const patentCard = document.createElement('div');
    patentCard.className = 'patent-card';
    patentCard.innerHTML = `
        <div class="patent-header">
            <div>
                <h5 class="mb-0">${patent.title}</h5>
                <small class="text-muted">生成时间: ${patent.timestamp}</small>
            </div>
            <div>
                <span class="badge bg-success status-badge">已完成</span>
                <button class="btn btn-sm btn-outline-primary ms-2" onclick="togglePatentContent(${index})">
                    <i class="fas fa-eye"></i> 预览
                </button>
                <button class="btn btn-sm btn-outline-success ms-1" onclick="downloadSinglePatent(${index})">
                    <i class="fas fa-download"></i> 下载
                </button>
            </div>
        </div>
        <div class="patent-content" id="patentContent_${index}" style="display: none;">
            <div class="patent-preview">${patent.content}</div>
        </div>
    `;
    
    resultsContainer.appendChild(patentCard);
}

// 切换专利内容显示
function togglePatentContent(index) {
    const contentDiv = document.getElementById(`patentContent_${index}`);
    if (contentDiv.style.display === 'none') {
        contentDiv.style.display = 'block';
    } else {
        contentDiv.style.display = 'none';
    }
}

// 下载单个专利
function downloadSinglePatent(index) {
    const patent = generatedPatents[index];
    const blob = new Blob([patent.content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${patent.title}.md`);
}

// 批量下载所有专利
async function handleDownload() {
    if (generatedPatents.length === 0) {
        showError('没有可下载的专利文档');
        return;
    }

    const zip = new JSZip();
    
    generatedPatents.forEach(patent => {
        zip.file(`${patent.title}.md`, patent.content);
    });

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        saveAs(content, `专利文档批量下载_${timestamp}.zip`);
    } catch (error) {
        console.error('下载失败:', error);
        showError('下载失败: ' + error.message);
    }
}

// 显示错误信息
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.generation-section .container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // 5秒后自动消失
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// 显示成功信息
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.generation-section .container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}