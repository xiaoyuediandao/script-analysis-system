// 全局变量
let currentSessionId = null;
let currentScenes = [];
let currentAnalysis = [];
let currentTimeline = [];
let currentGraphData = null;
let graphNetwork = null;

// DOM元素 - 将在DOMContentLoaded后获取
let navItems, tabContents, fileInput, uploadArea, progressSection, loadingOverlay;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    navItems = document.querySelectorAll('.nav-item');
    tabContents = document.querySelectorAll('.tab-content');
    fileInput = document.getElementById('fileInput');
    uploadArea = document.getElementById('uploadArea');
    progressSection = document.getElementById('progressSection');
    loadingOverlay = document.getElementById('loadingOverlay');

    // 检查关键元素是否存在
    if (!fileInput || !uploadArea) {
        console.error('关键DOM元素未找到:', { fileInput, uploadArea });
        return;
    }

    console.log('DOM元素已获取:', { fileInput: !!fileInput, uploadArea: !!uploadArea });

    initializeNavigation();
    initializeFileUpload();
    initializeEventListeners();
    checkForExistingSession();
    loadSettings();
    initializeMobileMenu();
});

// 检查是否有现有会话
function checkForExistingSession() {
    const savedSessionId = localStorage.getItem('currentSessionId');
    if (savedSessionId) {
        currentSessionId = savedSessionId;
        // 检查会话是否仍然有效
        checkSessionStatus();
    }
}

// 检查会话状态
async function checkSessionStatus() {
    if (!currentSessionId) return;

    try {
        const response = await fetch(`/api/status/${currentSessionId}`);
        if (response.ok) {
            const status = await response.json();
            if (status.status === 'completed') {
                // 会话完成，可以显示结果
                updateNavigationForCompletedSession();
            } else if (status.status === 'error') {
                // 会话出错，清除
                clearSession();
            } else {
                // 会话仍在进行中，继续监控
                monitorProgress();
            }
        } else {
            // 会话不存在，清除
            clearSession();
        }
    } catch (error) {
        console.error('检查会话状态失败:', error);
        clearSession();
    }
}

// 清除会话
function clearSession() {
    currentSessionId = null;
    localStorage.removeItem('currentSessionId');
    currentScenes = [];
    currentAnalysis = [];
    currentTimeline = [];
}

// 更新导航状态（当有完成的会话时）
function updateNavigationForCompletedSession() {
    navItems.forEach(item => {
        const tab = item.dataset.tab;
        if (['scenes', 'analysis', 'graph', 'timeline', 'report'].includes(tab)) {
            item.classList.remove('disabled');
        }
    });
}

// 禁用导航项
function disableNavigationItems() {
    navItems.forEach(item => {
        const tab = item.dataset.tab;
        if (['scenes', 'analysis', 'graph', 'timeline', 'report'].includes(tab)) {
            item.classList.add('disabled');
        }
    });
}

// 导航功能
function initializeNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('disabled')) {
                return;
            }
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // 更新导航状态
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });

    // 更新内容显示
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName) {
            content.classList.add('active');
        }
    });

    // 加载对应数据
    loadTabData(tabName);
}

// 文件上传功能
function initializeFileUpload() {
    console.log('初始化文件上传功能');

    // 文件选择
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('文件输入事件监听器已添加');
    }

    // 选择文件按钮
    const selectFileBtn = document.getElementById('selectFileBtn');
    if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', () => {
            console.log('选择文件按钮被点击');
            fileInput.click();
        });
    }

    // 拖拽上传（移除点击事件，避免与按钮重复）
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
        console.log('拖拽事件监听器已添加');
    }
}

function handleFileSelect(event) {
    console.log('文件选择事件触发:', event);
    const file = event.target.files[0];
    console.log('选择的文件:', file);
    if (file) {
        uploadFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// 上传文件
async function uploadFile(file) {
    console.log('开始上传文件:', file.name, file.size);

    if (!file.name.endsWith('.txt')) {
        alert('请选择 .txt 格式的文件');
        return;
    }

    const formData = new FormData();
    formData.append('script', file);

    try {
        showProgress();
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            currentSessionId = result.sessionId;
            localStorage.setItem('currentSessionId', currentSessionId);
            monitorProgress();
        } else {
            throw new Error(result.error || '上传失败');
        }
    } catch (error) {
        console.error('上传错误:', error);
        alert('上传失败: ' + error.message);
        hideProgress();
    }
}

// 显示进度
function showProgress() {
    progressSection.style.display = 'block';
    updateProgress(0, '正在上传文件...', '请稍候，系统正在处理您的剧本');
}

function hideProgress() {
    progressSection.style.display = 'none';
}

function updateProgress(percent, title, description) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = percent + '%';
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressDesc').textContent = description;
}

// 监控处理进度
async function monitorProgress() {
    if (!currentSessionId) return;

    try {
        const response = await fetch(`/api/status/${currentSessionId}`);
        const status = await response.json();

        if (response.ok) {
            const statusMessages = {
                'parsing': '正在解析剧本...',
                'extracting': '正在提取实体信息...',
                'sorting': '正在排序时间线...',
                'generating': '正在生成报告...',
                'completed': '分析完成！',
                'error': '处理出错'
            };

            const statusDescriptions = {
                'parsing': '系统正在识别场景、角色和对话',
                'extracting': '使用AI分析角色服装和道具状态',
                'sorting': '按时间顺序整理场景',
                'generating': '生成最终分析报告',
                'completed': '您可以查看分析结果了',
                'error': status.error || '处理过程中发生错误'
            };

            updateProgress(
                status.progress,
                statusMessages[status.status],
                statusDescriptions[status.status]
            );

            if (status.status === 'completed') {
                setTimeout(() => {
                    hideProgress();
                    switchTab('scenes');
                }, 1000);
            } else if (status.status === 'error') {
                alert('处理失败: ' + status.error);
                hideProgress();
            } else {
                // 继续监控
                setTimeout(monitorProgress, 1000);
            }
        }
    } catch (error) {
        console.error('获取状态失败:', error);
        setTimeout(monitorProgress, 2000);
    }
}

// 加载标签页数据
async function loadTabData(tabName) {
    if (!currentSessionId) return;

    switch (tabName) {
        case 'scenes':
            await loadScenes();
            break;
        case 'analysis':
            await loadAnalysis();
            break;
        case 'graph':
            await loadGraph();
            break;
        case 'timeline':
            await loadTimeline();
            break;
        case 'report':
            await loadReport();
            break;
    }
}

// 加载场景数据
async function loadScenes() {
    if (!currentSessionId) return;

    try {
        showLoading();
        const response = await fetch(`/api/scenes/${currentSessionId}`);
        const scenes = await response.json();
        
        if (response.ok) {
            currentScenes = scenes;
            displayScenes(scenes);
        }
    } catch (error) {
        console.error('加载场景失败:', error);
    } finally {
        hideLoading();
    }
}

// 显示场景列表
function displayScenes(scenes) {
    // 更新统计信息
    const totalScenes = scenes.length;
    const characters = new Set();
    let intScenes = 0;
    let extScenes = 0;

    scenes.forEach(scene => {
        scene.characters.forEach(char => characters.add(char));
        if (scene.timeOfDay.includes('INT') || scene.timeOfDay.includes('内景')) {
            intScenes++;
        } else {
            extScenes++;
        }
    });

    document.getElementById('totalScenes').textContent = totalScenes;
    document.getElementById('totalCharacters').textContent = characters.size;
    document.getElementById('intScenes').textContent = intScenes;
    document.getElementById('extScenes').textContent = extScenes;

    // 显示场景列表
    const scenesList = document.getElementById('scenesList');
    scenesList.innerHTML = scenes.map(scene => `
        <div class="scene-card">
            <div class="scene-header">
                <div>
                    <div class="scene-number">场景 ${scene.sceneNumber || '未知'}</div>
                    <div class="scene-location">${scene.location}</div>
                </div>
                <div class="scene-time">${scene.timeOfDay}</div>
            </div>
            <div class="scene-characters">
                <h4>角色</h4>
                <div class="character-tags">
                    ${scene.characters.map(char => `<span class="character-tag">${char}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// 其他事件监听器
function initializeEventListeners() {
    // 导出报告
    document.getElementById('exportReport')?.addEventListener('click', exportReport);

    // 复制报告
    document.getElementById('copyReport')?.addEventListener('click', copyReport);

    // 测试连接
    document.getElementById('testConnection')?.addEventListener('click', testConnection);

    // 保存设置
    document.getElementById('saveSettings')?.addEventListener('click', saveSettings);

    // 加载保存的设置
    loadSettings();

    // 移动端菜单
    initializeMobileMenu();

    // 时间线排序按钮
    document.getElementById('sortByNumber')?.addEventListener('click', () => sortTimeline('number'));
    document.getElementById('sortByTime')?.addEventListener('click', () => sortTimeline('time'));

    // 图谱控制按钮
    document.getElementById('resetGraph')?.addEventListener('click', resetGraphView);
    document.getElementById('exportGraph')?.addEventListener('click', exportGraphData);
    document.getElementById('closeInfo')?.addEventListener('click', hideNodeInfo);
}

// 显示/隐藏加载指示器
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// 加载分析数据
async function loadAnalysis() {
    if (!currentSessionId) return;

    try {
        showLoading();
        const response = await fetch(`/api/analysis/${currentSessionId}`);
        const analysis = await response.json();

        if (response.ok) {
            currentAnalysis = analysis;
            displayAnalysis(analysis);
        }
    } catch (error) {
        console.error('加载分析失败:', error);
    } finally {
        hideLoading();
    }
}

// 显示分析结果
function displayAnalysis(analysis) {
    const analysisResults = document.getElementById('analysisResults');

    if (!analysis || analysis.length === 0) {
        analysisResults.innerHTML = '<p>暂无分析结果</p>';
        return;
    }

    // 解析分析结果并提取角色和场景信息
    const parsedAnalysis = analysis.map(item => {
        const match = item.match(/^(\d+)[\.,]\s*(.+)$/);
        if (match) {
            const sceneNumber = match[1];
            const content = match[2];

            // 尝试提取角色名称
            const characterMatch = content.match(/([^：]+)：/);
            const character = characterMatch ? characterMatch[1] : '';

            return {
                sceneNumber,
                content,
                character,
                original: item
            };
        }
        return {
            sceneNumber: '',
            content: item,
            character: '',
            original: item
        };
    });

    // 更新过滤器选项
    updateAnalysisFilters(parsedAnalysis);

    // 显示结果
    renderAnalysisResults(parsedAnalysis);
}

// 更新分析过滤器
function updateAnalysisFilters(parsedAnalysis) {
    const characterFilter = document.getElementById('characterFilter');
    const sceneFilter = document.getElementById('sceneFilter');

    // 获取所有角色
    const characters = [...new Set(parsedAnalysis.map(item => item.character).filter(c => c))];
    characterFilter.innerHTML = '<option value="">所有角色</option>' +
        characters.map(char => `<option value="${char}">${char}</option>`).join('');

    // 获取所有场景
    const scenes = [...new Set(parsedAnalysis.map(item => item.sceneNumber).filter(s => s))];
    sceneFilter.innerHTML = '<option value="">所有场景</option>' +
        scenes.map(scene => `<option value="${scene}">场景 ${scene}</option>`).join('');

    // 添加过滤器事件监听
    characterFilter.addEventListener('change', () => filterAnalysisResults(parsedAnalysis));
    sceneFilter.addEventListener('change', () => filterAnalysisResults(parsedAnalysis));
}

// 渲染分析结果
function renderAnalysisResults(results) {
    const analysisResults = document.getElementById('analysisResults');

    analysisResults.innerHTML = results.map(item => {
        if (item.sceneNumber) {
            return `
                <div class="analysis-item" data-scene="${item.sceneNumber}" data-character="${item.character}">
                    <div class="analysis-scene">场景 ${item.sceneNumber}</div>
                    <div class="analysis-content">${item.content}</div>
                </div>
            `;
        }
        return `
            <div class="analysis-item">
                <div class="analysis-content">${item.content}</div>
            </div>
        `;
    }).join('');
}

// 过滤分析结果
function filterAnalysisResults(allResults) {
    const characterFilter = document.getElementById('characterFilter').value;
    const sceneFilter = document.getElementById('sceneFilter').value;

    let filteredResults = allResults;

    if (characterFilter) {
        filteredResults = filteredResults.filter(item => item.character === characterFilter);
    }

    if (sceneFilter) {
        filteredResults = filteredResults.filter(item => item.sceneNumber === sceneFilter);
    }

    renderAnalysisResults(filteredResults);
}

// 加载知识图谱数据
async function loadGraph() {
    if (!currentSessionId) return;

    try {
        showLoading();
        const response = await fetch(`/api/graph/${currentSessionId}`);
        const graphData = await response.json();

        if (response.ok) {
            currentGraphData = graphData;
            initializeGraph(graphData);
            updateGraphStats(graphData);
            createGraphLegend(graphData);
        }
    } catch (error) {
        console.error('加载图谱失败:', error);
    } finally {
        hideLoading();
    }
}

// 初始化知识图谱
function initializeGraph(graphData) {
    const container = document.getElementById('graphView');

    // 转换数据格式为vis.js格式
    const nodes = new vis.DataSet(graphData.nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: node.color,
        size: node.size || 20,
        shape: node.shape || 'circle',
        font: { size: 12, color: '#333' },
        title: createNodeTooltip(node)
    })));

    const edges = new vis.DataSet(graphData.edges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        color: edge.color,
        width: edge.width || 1,
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        smooth: { type: 'continuous' }
    })));

    const data = { nodes, edges };

    const options = {
        layout: {
            improvedLayout: true,
            clusterThreshold: 150
        },
        physics: {
            enabled: true,
            stabilization: { iterations: 100 },
            barnesHut: {
                gravitationalConstant: -2000,
                centralGravity: 0.3,
                springLength: 95,
                springConstant: 0.04,
                damping: 0.09
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            hideEdgesOnDrag: true,
            hideNodesOnDrag: false
        },
        nodes: {
            borderWidth: 2,
            borderWidthSelected: 4,
            chosen: true
        },
        edges: {
            chosen: true,
            hoverWidth: 2
        }
    };

    // 创建网络
    graphNetwork = new vis.Network(container, data, options);

    // 添加事件监听器
    setupGraphEventListeners();

    // 初始化控制器
    initializeGraphControls();
}

// 设置图谱事件监听器
function setupGraphEventListeners() {
    if (!graphNetwork) return;

    // 节点点击事件
    graphNetwork.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            showNodeInfo(nodeId);
        } else {
            hideNodeInfo();
        }
    });

    // 节点悬停事件
    graphNetwork.on('hoverNode', function(params) {
        const nodeId = params.node;
        highlightConnectedNodes(nodeId);
    });

    // 取消悬停事件
    graphNetwork.on('blurNode', function(params) {
        resetNodeHighlight();
    });
}

// 创建节点提示信息
function createNodeTooltip(node) {
    let tooltip = `<strong>${node.label}</strong><br>`;
    tooltip += `类型: ${getNodeTypeLabel(node.type)}<br>`;

    if (node.properties) {
        if (node.properties.sceneCount) {
            tooltip += `出现场景: ${node.properties.sceneCount}<br>`;
        }
        if (node.properties.location) {
            tooltip += `地点: ${node.properties.location}<br>`;
        }
        if (node.properties.state) {
            tooltip += `状态: ${node.properties.state}<br>`;
        }
    }

    return tooltip;
}

// 获取节点类型标签
function getNodeTypeLabel(type) {
    const labels = {
        'character': '角色',
        'scene': '场景',
        'clothing': '服装',
        'prop': '道具',
        'location': '地点',
        'time': '时间',
        'state': '状态'
    };
    return labels[type] || type;
}

// 显示节点详细信息
function showNodeInfo(nodeId) {
    if (!currentGraphData) return;

    const node = currentGraphData.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const infoPanel = document.getElementById('graphInfo');
    const infoTitle = document.getElementById('infoTitle');
    const infoContent = document.getElementById('infoContent');

    infoTitle.textContent = node.label;

    let content = `<div class="info-property">
        <div class="info-property-label">类型</div>
        <div class="info-property-value">${getNodeTypeLabel(node.type)}</div>
    </div>`;

    // 根据节点类型显示不同的属性
    if (node.properties) {
        Object.entries(node.properties).forEach(([key, value]) => {
            if (key === 'scenes' && Array.isArray(value)) {
                content += `<div class="info-property">
                    <div class="info-property-label">相关场景</div>
                    <div class="info-property-value">${value.join(', ')}</div>
                </div>`;
            } else if (key === 'characters' && Array.isArray(value)) {
                content += `<div class="info-property">
                    <div class="info-property-label">角色</div>
                    <div class="info-property-value">${value.join(', ')}</div>
                </div>`;
            } else if (typeof value === 'string' || typeof value === 'number') {
                content += `<div class="info-property">
                    <div class="info-property-label">${getPropertyLabel(key)}</div>
                    <div class="info-property-value">${value}</div>
                </div>`;
            }
        });
    }

    infoContent.innerHTML = content;
    infoPanel.style.display = 'block';
}

// 隐藏节点信息
function hideNodeInfo() {
    const infoPanel = document.getElementById('graphInfo');
    infoPanel.style.display = 'none';
}

// 获取属性标签
function getPropertyLabel(key) {
    const labels = {
        'sceneNumber': '场景编号',
        'location': '地点',
        'timeOfDay': '时间',
        'sceneCount': '出现次数',
        'state': '状态',
        'category': '类别',
        'description': '描述'
    };
    return labels[key] || key;
}

// 高亮连接的节点
function highlightConnectedNodes(nodeId) {
    if (!graphNetwork) return;

    const connectedNodes = graphNetwork.getConnectedNodes(nodeId);
    const connectedEdges = graphNetwork.getConnectedEdges(nodeId);

    const updateArray = [];
    const allNodes = graphNetwork.body.data.nodes.get();

    allNodes.forEach(node => {
        if (node.id === nodeId || connectedNodes.includes(node.id)) {
            updateArray.push({ id: node.id, opacity: 1 });
        } else {
            updateArray.push({ id: node.id, opacity: 0.3 });
        }
    });

    graphNetwork.body.data.nodes.update(updateArray);
}

// 重置节点高亮
function resetNodeHighlight() {
    if (!graphNetwork) return;

    const updateArray = [];
    const allNodes = graphNetwork.body.data.nodes.get();

    allNodes.forEach(node => {
        updateArray.push({ id: node.id, opacity: 1 });
    });

    graphNetwork.body.data.nodes.update(updateArray);
}

// 更新图谱统计信息
function updateGraphStats(graphData) {
    document.getElementById('nodeCount').textContent = graphData.metadata.totalNodes;
    document.getElementById('edgeCount').textContent = graphData.metadata.totalEdges;
}

// 创建图例
function createGraphLegend(graphData) {
    const legendContainer = document.getElementById('legendItems');
    const nodeTypes = Object.keys(graphData.metadata.nodeTypes).filter(type =>
        graphData.metadata.nodeTypes[type] > 0
    );

    const nodeColors = {
        'character': '#FF6B6B',
        'scene': '#4ECDC4',
        'clothing': '#45B7D1',
        'prop': '#96CEB4',
        'location': '#FFEAA7',
        'time': '#DDA0DD',
        'state': '#FFB347'
    };

    legendContainer.innerHTML = nodeTypes.map(type => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${nodeColors[type]}"></div>
            <span>${getNodeTypeLabel(type)} (${graphData.metadata.nodeTypes[type]})</span>
        </div>
    `).join('');
}

// 初始化图谱控制器
function initializeGraphControls() {
    // 节点类型过滤器
    const nodeTypeFilters = document.querySelectorAll('#nodeTypeFilters input[type="checkbox"]');
    nodeTypeFilters.forEach(checkbox => {
        checkbox.addEventListener('change', applyGraphFilters);
    });

    // 布局选择器
    const layoutSelect = document.getElementById('layoutSelect');
    layoutSelect?.addEventListener('change', changeGraphLayout);

    // 节点搜索
    const nodeSearch = document.getElementById('nodeSearch');
    nodeSearch?.addEventListener('input', searchNodes);
}

// 应用图谱过滤器
function applyGraphFilters() {
    if (!graphNetwork || !currentGraphData) return;

    const checkedTypes = Array.from(document.querySelectorAll('#nodeTypeFilters input:checked'))
        .map(cb => cb.value);

    // 过滤节点
    const filteredNodes = currentGraphData.nodes.filter(node =>
        checkedTypes.includes(node.type)
    );

    // 过滤边（只显示连接可见节点的边）
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = currentGraphData.edges.filter(edge =>
        visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)
    );

    // 更新网络数据
    const nodes = new vis.DataSet(filteredNodes.map(node => ({
        id: node.id,
        label: node.label,
        color: node.color,
        size: node.size || 20,
        shape: node.shape || 'circle',
        font: { size: 12, color: '#333' },
        title: createNodeTooltip(node)
    })));

    const edges = new vis.DataSet(filteredEdges.map(edge => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.label,
        color: edge.color,
        width: edge.width || 1,
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        smooth: { type: 'continuous' }
    })));

    graphNetwork.setData({ nodes, edges });
}

// 改变图谱布局
function changeGraphLayout() {
    if (!graphNetwork) return;

    const layoutType = document.getElementById('layoutSelect').value;
    let options = {};

    switch (layoutType) {
        case 'hierarchical':
            options = {
                layout: {
                    hierarchical: {
                        enabled: true,
                        direction: 'UD',
                        sortMethod: 'directed',
                        levelSeparation: 150,
                        nodeSpacing: 100
                    }
                },
                physics: { enabled: false }
            };
            break;
        case 'circular':
            options = {
                layout: {
                    hierarchical: { enabled: false }
                },
                physics: {
                    enabled: true,
                    solver: 'repulsion',
                    repulsion: {
                        centralGravity: 0.2,
                        springLength: 200,
                        springConstant: 0.05,
                        nodeDistance: 100,
                        damping: 0.09
                    }
                }
            };
            break;
        default: // force
            options = {
                layout: {
                    hierarchical: { enabled: false }
                },
                physics: {
                    enabled: true,
                    barnesHut: {
                        gravitationalConstant: -2000,
                        centralGravity: 0.3,
                        springLength: 95,
                        springConstant: 0.04,
                        damping: 0.09
                    }
                }
            };
    }

    graphNetwork.setOptions(options);
}

// 搜索节点
function searchNodes() {
    if (!graphNetwork || !currentGraphData) return;

    const searchTerm = document.getElementById('nodeSearch').value.toLowerCase();

    if (!searchTerm) {
        resetNodeHighlight();
        return;
    }

    const matchingNodes = currentGraphData.nodes.filter(node =>
        node.label.toLowerCase().includes(searchTerm)
    );

    if (matchingNodes.length > 0) {
        const updateArray = [];
        const allNodes = graphNetwork.body.data.nodes.get();

        allNodes.forEach(node => {
            const isMatch = matchingNodes.some(mn => mn.id === node.id);
            updateArray.push({
                id: node.id,
                opacity: isMatch ? 1 : 0.3,
                borderWidth: isMatch ? 4 : 2
            });
        });

        graphNetwork.body.data.nodes.update(updateArray);

        // 聚焦到第一个匹配的节点
        if (matchingNodes.length > 0) {
            graphNetwork.focus(matchingNodes[0].id, { animation: true });
        }
    }
}

// 重置图谱视图
function resetGraphView() {
    if (!graphNetwork) return;

    graphNetwork.fit({ animation: true });
    resetNodeHighlight();
    document.getElementById('nodeSearch').value = '';
}

// 导出图谱数据
function exportGraphData() {
    if (!currentGraphData) {
        alert('没有图谱数据可导出');
        return;
    }

    const dataStr = JSON.stringify(currentGraphData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `知识图谱-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 加载时间线数据
async function loadTimeline() {
    if (!currentSessionId) return;

    try {
        showLoading();
        const response = await fetch(`/api/timeline/${currentSessionId}`);
        const timeline = await response.json();

        if (response.ok) {
            currentTimeline = timeline;
            displayTimeline(timeline);
        }
    } catch (error) {
        console.error('加载时间线失败:', error);
    } finally {
        hideLoading();
    }
}

// 显示时间线
function displayTimeline(timeline) {
    currentTimeline = timeline; // 保存原始数据
    renderTimeline(timeline);
}

// 渲染时间线
function renderTimeline(timeline) {
    const timelineView = document.getElementById('timelineView');

    if (!timeline || timeline.length === 0) {
        timelineView.innerHTML = '<p>暂无时间线数据</p>';
        return;
    }

    timelineView.innerHTML = timeline.map((event, index) => `
        <div class="timeline-item" data-scene="${event.scene.sceneNumber || index + 1}">
            <div class="timeline-marker">${event.scene.sceneNumber || index + 1}</div>
            <div class="timeline-content">
                <h3>${event.scene.location}</h3>
                <p><strong>时间:</strong> ${event.scene.timeOfDay}</p>
                <p><strong>角色:</strong> ${event.scene.characters.join(', ')}</p>
                <p><strong>动作:</strong> ${event.scene.action.slice(0, 100).join(' ')}${event.scene.action.join(' ').length > 100 ? '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

// 时间线排序
function sortTimeline(sortType) {
    if (!currentTimeline || currentTimeline.length === 0) return;

    let sortedTimeline = [...currentTimeline];

    if (sortType === 'number') {
        // 按场景编号排序
        sortedTimeline.sort((a, b) => {
            const aNum = a.scene.sceneNumber || 0;
            const bNum = b.scene.sceneNumber || 0;
            return aNum - bNum;
        });
    } else if (sortType === 'time') {
        // 按时间顺序排序（这里使用chronologicalOrder）
        sortedTimeline.sort((a, b) => a.chronologicalOrder - b.chronologicalOrder);
    }

    renderTimeline(sortedTimeline);

    // 更新按钮状态
    document.querySelectorAll('.timeline-controls .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (sortType === 'number') {
        document.getElementById('sortByNumber').classList.add('active');
    } else if (sortType === 'time') {
        document.getElementById('sortByTime').classList.add('active');
    }
}

// 加载报告数据
async function loadReport() {
    if (!currentSessionId) return;

    try {
        showLoading();
        const response = await fetch(`/api/report/${currentSessionId}`);
        const data = await response.json();

        if (response.ok) {
            displayReport(data.report);
        }
    } catch (error) {
        console.error('加载报告失败:', error);
    } finally {
        hideLoading();
    }
}

// 显示报告
function displayReport(report) {
    const reportContent = document.getElementById('reportContent');
    reportContent.textContent = report || '暂无报告内容';
}

// 导出报告
function exportReport() {
    if (!currentSessionId) {
        alert('请先上传并分析剧本');
        return;
    }

    // 创建下载链接
    const reportContent = document.getElementById('reportContent').textContent;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `剧本分析报告-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 复制报告
async function copyReport() {
    if (!currentSessionId) {
        alert('请先上传并分析剧本');
        return;
    }

    try {
        const reportContent = document.getElementById('reportContent').textContent;
        await navigator.clipboard.writeText(reportContent);

        // 显示成功提示
        const copyBtn = document.getElementById('copyReport');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
        copyBtn.disabled = true;

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动选择文本复制');
    }
}

// 测试连接
async function testConnection() {
    const apiKey = document.getElementById('apiKey').value;
    const modelId = document.getElementById('modelId').value;

    if (!apiKey || !modelId) {
        showConnectionStatus('error', '请填写API Key和模型ID');
        return;
    }

    try {
        showLoading();
        // 这里可以添加实际的API测试逻辑
        await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟测试
        showConnectionStatus('success', 'API连接测试成功！');
    } catch (error) {
        showConnectionStatus('error', '连接测试失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// 显示连接状态
function showConnectionStatus(type, message) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.className = `connection-status ${type}`;
    statusElement.querySelector('.status-text').textContent = message;
    statusElement.style.display = 'flex';

    // 3秒后自动隐藏
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// 保存设置
function saveSettings() {
    const apiKey = document.getElementById('apiKey').value;
    const modelId = document.getElementById('modelId').value;

    const settings = {
        apiKey,
        modelId,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('scriptAnalysisSettings', JSON.stringify(settings));

    // 显示保存成功提示
    const saveBtn = document.getElementById('saveSettings');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> 已保存';
    saveBtn.disabled = true;

    setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }, 2000);
}

// 加载设置
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('scriptAnalysisSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);

            if (settings.apiKey) {
                document.getElementById('apiKey').value = settings.apiKey;
            }
            if (settings.modelId) {
                document.getElementById('modelId').value = settings.modelId;
            }
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

// 初始化移动端菜单
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // 点击主内容区域时关闭菜单
        document.querySelector('.main-content').addEventListener('click', () => {
            sidebar.classList.remove('open');
        });

        // 点击导航项时关闭菜单
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        });
    }
}
