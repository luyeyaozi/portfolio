# 作品集网站

上传照片/视频 → 生成网页 → 发链接给别人 → 在线看 + 下载原文件

## 架构

```
你的电脑 ──git push──> GitHub
                         ├── Pages 托管网页（免费）
                         └── Releases 存视频（免费，不限流量）
```

## 第一次搭建（大约 10 分钟）

### 1. 注册 GitHub

去 [github.com](https://github.com) 注册账号。

### 2. 安装 GitHub CLI

```bash
winget install GitHub.cli
```

安装完登录：

```bash
gh auth login
```

选 GitHub.com → HTTPS → 用浏览器登录。

### 3. 创建仓库

在 GitHub 网站右上角 → **New repository**：
- 仓库名：`portfolio`（或任意名字）
- 选 **Public**（公开）
- 不要勾选任何初始化选项

创建后，页面上会显示几条命令。在 `portfolio/` 目录下执行：

```bash
cd portfolio
git init
git add .
git commit -m "初始化作品集"
git branch -M main
git remote add origin https://github.com/你的用户名/portfolio.git
git push -u origin main
```

### 4. 开启 GitHub Pages

GitHub 网站 → 进入仓库 → **Settings** → **Pages** →
- Source: **Deploy from a branch**
- Branch: `main`，目录选 `/ (root)`
- 点 **Save**

等一两分钟，页面会显示网址：`https://你的用户名.github.io/portfolio`

### 5. 放作品

把文件放到：

```
media/
├── photos/    ← 照片放这里（JPG、PNG 等）
│   ├── 风景01.jpg
│   └── 人像01.jpg
└── videos/    ← 视频放这里（MP4、MOV 等）
    ├── 短片01.mp4
    └── 短片01-thumb.jpg   ← 视频封面图（可选，同名 + -thumb）
```

### 6. 发布

```bash
node publish.js
```

这个脚本会：
- 扫描 `media/` 目录
- 视频上传到 GitHub Releases
- 生成 `catalog.json`

然后提交：

```bash
git add .
git commit -m "更新作品集"
git push
```

等一两分钟刷新网页就能看到。

---

## 日常使用

以后加新作品只需要：

```bash
# 1. 把新文件放到 media/photos/ 或 media/videos/
# 2. 运行发布脚本
node publish.js
# 3. 提交推送
git add .
git commit -m "添加新作品"
git push
```

---

## 编辑作品信息

发布后可以编辑 `catalog.json` 修改每件作品的显示信息，然后 `git push`：

```json
{
  "title": "我的作品集",
  "description": "视频、照片、设计作品",
  "items": [
    {
      "title": "日落风景",       // 显示名称
      "file": "media/photos/sunset.jpg",
      "url": "media/photos/sunset.jpg",
      "date": "2026-07",         // 日期
      "tags": ["照片", "风景"],   // 分类标签
      "size": 2457600
    }
  ]
}
```

---

## 费用

- GitHub Pages：免费
- GitHub Releases：免费（单个文件最大 2GB）
- 总费用：**0 元**

## 限制

- 单个视频文件不超过 2GB
- 照片直接放仓库，建议单张不超过 20MB（GitHub 仓库总大小建议 1GB 以内）
