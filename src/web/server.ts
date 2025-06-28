import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import { ScriptParser } from '../parser/scriptParser';
import { EntityExtractor } from '../extractor/entityExtractor';
import { TimelineSorter } from '../timeline/timelineSorter';
import { ReportGenerator } from '../reporting/reportGenerator';
import { GraphBuilder } from '../graph/graphBuilder';

const app = express();
const port = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../web/public')));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `script-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 存储分析状态
interface AnalysisSession {
  id: string;
  status: 'parsing' | 'extracting' | 'sorting' | 'generating' | 'completed' | 'error';
  progress: number;
  scenes?: any[];
  analysisResults?: any[];
  timelineEvents?: any[];
  report?: string;
  graphData?: any;
  error?: string;
}

const sessions: Map<string, AnalysisSession> = new Map();

// API路由

// 上传剧本文件
app.post('/api/upload', upload.single('script'), async (req, res) => {
  console.log('收到上传请求');
  console.log('文件信息:', req.file);
  console.log('请求体:', req.body);

  try {
    if (!req.file) {
      console.log('没有文件上传');
      res.status(400).json({ error: '请选择剧本文件' });
      return;
    }

    const sessionId = `session-${Date.now()}`;
    const session: AnalysisSession = {
      id: sessionId,
      status: 'parsing',
      progress: 0
    };

    sessions.set(sessionId, session);

    // 异步处理剧本分析
    processScript(req.file.path, sessionId);

    res.json({ sessionId, message: '文件上传成功，开始分析...' });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 获取分析状态
app.get('/api/status/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  res.json(session);
});

// 获取场景列表
app.get('/api/scenes/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || !session.scenes) {
    res.status(404).json({ error: '场景数据不存在' });
    return;
  }
  res.json(session.scenes);
});

// 获取分析结果
app.get('/api/analysis/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || !session.analysisResults) {
    res.status(404).json({ error: '分析结果不存在' });
    return;
  }
  res.json(session.analysisResults);
});

// 获取时间线数据
app.get('/api/timeline/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || !session.timelineEvents) {
    res.status(404).json({ error: '时间线数据不存在' });
    return;
  }
  res.json(session.timelineEvents);
});

// 获取报告
app.get('/api/report/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || !session.report) {
    res.status(404).json({ error: '报告不存在' });
    return;
  }
  res.json({ report: session.report });
});

// 获取知识图谱数据
app.get('/api/graph/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session || !session.graphData) {
    res.status(404).json({ error: '图谱数据不存在' });
    return;
  }
  res.json(session.graphData);
});

// 异步处理剧本分析
async function processScript(filePath: string, sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  try {
    // 1. 解析剧本
    session.status = 'parsing';
    session.progress = 10;
    
    const parser = new ScriptParser(filePath);
    const scenes = await parser.parse();
    
    session.scenes = scenes;
    session.progress = 25;

    if (scenes.length === 0) {
      session.status = 'error';
      session.error = '未解析出任何场景';
      return;
    }

    // 2. 提取实体
    session.status = 'extracting';
    session.progress = 30;
    
    const extractor = new EntityExtractor(scenes);
    const analysisResults = await extractor.extract();
    
    session.analysisResults = analysisResults;
    session.progress = 60;

    // 3. 时间线排序
    session.status = 'sorting';
    session.progress = 70;
    
    const sorter = new TimelineSorter(scenes);
    const timelineEvents = sorter.sort();
    
    session.timelineEvents = timelineEvents;
    session.progress = 80;

    // 4. 生成知识图谱
    session.status = 'generating';
    session.progress = 85;

    const graphBuilder = new GraphBuilder(scenes, analysisResults);
    const graphData = graphBuilder.buildGraph();
    session.graphData = graphData;

    // 5. 生成报告
    session.progress = 95;

    const report = ReportGenerator.generate(analysisResults);
    session.report = report;

    session.status = 'completed';
    session.progress = 100;

    // 清理上传的文件
    fs.unlinkSync(filePath);

  } catch (error) {
    console.error('剧本分析错误:', error);
    session.status = 'error';
    session.error = error instanceof Error ? error.message : '分析过程中发生未知错误';
  }
}

// 启动服务器
app.listen(port, () => {
  console.log(`Web服务器运行在 http://localhost:${port}`);
});

export default app;
