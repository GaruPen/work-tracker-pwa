# 工资打卡日历 PWA

基于 WorkTracker PWA 改造的中文本地工资与出勤记录工具。重点解决几个日常问题：这个月已经上了多少天班、累计工作多少小时、已经赚了多少钱、还剩多少工作日，以及距离下一次发薪还有多少天。

> 当前版本：V0.1

## 功能

- 实时上班计时：开始、暂停、继续、下班。
- 月历式打卡：按日期补录或修改每天状态。
- 每日状态：上班、节假日上班、休息、请假、病假、缺勤。
- 月薪 / 时薪两种计薪方式。
- 自定义每周工作日和每天标准工时。
- 自定义工作日加班、休息日和法定节假日工资倍率。
- 首页统计本月已上班天数、累计工时、已赚工资、剩余工作日和工作进度。
- 自定义每月发薪日，并显示下一次发薪日期与倒计时。
- 支持“本月发上月工资”或“本月发本月工资”的工资周期提示。
- 数据只保存在浏览器本机 IndexedDB 中，不需要账号或服务器。
- 支持 JSON 备份和恢复。
- PWA：可安装到手机或桌面，安装后可像普通 App 一样打开，并支持离线使用。

## 界面结构

应用只保留三个主要入口：

- `打卡`：实时计时、工资进度和发薪日信息。
- `日历`：查看整月打卡状态并补录工作记录。
- `设置`：工资、工作日、工时、发薪日、加班倍率、备份恢复等设置。

## 工资计算说明

本项目定位是个人工资进度与出勤记录工具，不是专业薪酬、个税或社保核算系统。

月薪模式会根据当前月份的标准工作日和每天标准工时换算基础时薪，再根据实际记录计算；时薪模式直接使用设置的时薪。工作日超出标准工时部分按加班倍率计算，休息日和法定节假日分别使用对应倍率。

例如：月薪 `¥8000`，某月共有 `22` 个标准工作日，每天 `8` 小时，则基础日工资约为：

```text
8000 ÷ 22 ≈ ¥363.64 / 天
```

实际金额仍以你的工资制度为准。

## 技术栈

- React 19
- Vite 5
- Tailwind CSS
- Framer Motion
- Lucide React
- IndexedDB / idb
- i18next
- vite-plugin-pwa

项目为纯前端应用，没有后端服务和数据库服务器。

## 本地开发

需要先安装 Node.js。

```bash
git clone https://github.com/GaruPen/work-tracker-pwa.git
cd work-tracker-pwa
git checkout feat/chinese-salary-calendar-v0.1
npm install
npm run dev
```

开发服务器默认地址：

```text
http://localhost:5173/work-tracker-pwa/
```

## 构建本地网页版

```bash
npm install
npm run build
```

构建结果位于：

```text
dist/
```

由于本项目是 PWA，建议通过 HTTP 服务打开 `dist`，不要直接双击 `index.html`。例如：

```bash
npx serve dist
```

或：

```bash
python -m http.server 8080 -d dist
```

然后打开：

```text
http://localhost:8080/work-tracker-pwa/
```

如果使用本仓库提供的本地网页版发布包，直接运行包内的启动脚本即可。

## GitHub Pages

Vite 的基础路径已经配置为：

```text
/work-tracker-pwa/
```

对应仓库：

```text
https://github.com/GaruPen/work-tracker-pwa
```

发布到 GitHub Pages 后，站点地址通常为：

```text
https://garupen.github.io/work-tracker-pwa/
```

## PWA 安装

### iPhone / iPad

使用 Safari 打开网页版，点击“分享” → “添加到主屏幕”。

### Android

使用 Chrome 打开网页版，选择“安装应用”或“添加到主屏幕”。

### Windows / macOS

Chrome、Edge 等 Chromium 浏览器会在地址栏提供安装按钮；安装后可作为独立窗口运行。

## 项目结构

```text
work-tracker-pwa/
├── public/                 # PWA 图标及公共资源
├── src/
│   ├── components/
│   │   └── BottomNav.jsx   # 底部导航
│   ├── locales/
│   │   └── zh-CN.json      # 简体中文文本
│   ├── pages/
│   │   ├── Dashboard.jsx   # 打卡与工资进度首页
│   │   ├── Calendar.jsx    # 工资打卡月历
│   │   └── Settings.jsx    # 工资及应用设置
│   ├── services/
│   │   └── db.js           # IndexedDB 本地存储
│   ├── styles/
│   ├── utils/
│   │   ├── salary.js       # 工资、工作日与发薪日计算
│   │   └── utils.js
│   ├── App.jsx             # 根组件及全局状态
│   ├── i18n.js             # 国际化配置
│   └── main.jsx            # React 入口
├── index.html
├── vite.config.js
└── package.json
```

## 数据与隐私

默认情况下，工资设置、打卡记录和历史数据只保存在当前浏览器设备的 IndexedDB 中。本项目没有账号系统、云同步、遥测或后台上传逻辑。

更换浏览器、清理网站数据或重装系统前，建议先在“设置”中导出 JSON 备份。

## 兼容原 WorkTracker 数据

V0.1 保留了对部分旧版 WorkTracker 数据的兼容处理，包括：

- `contractType`
- `monthlyRate`
- `hourlyRate`
- `standard`
- `urlop`
- `l4`

导入旧备份后会尽量转换为新版工资和打卡模型。

## 项目来源

本项目 Fork 自 [OwenSide/work-tracker-pwa](https://github.com/OwenSide/work-tracker-pwa)，在其 React / PWA / IndexedDB 基础上改造成中文工资打卡日历。

感谢原作者提供的基础项目。

## License

本项目沿用原项目的 GNU GPLv3 License。详见仓库中的 `LICENSE` 文件。
