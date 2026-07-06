/**
 * 发布脚本 —— 上传视频到 GitHub Releases，生成作品目录
 *
 * 用法：
 *   1. 把照片放到 media/photos/，视频放到 media/videos/
 *   2. node publish.js
 *   3. git add . && git commit -m "更新作品" && git push
 *
 * 前提：
 *   - 已安装 GitHub CLI: winget install GitHub.cli  (或 brew install gh)
 *   - 已登录: gh auth login
 *   - 当前目录是一个 GitHub 仓库
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---- 配置 ----
const MEDIA_DIR = path.join(__dirname, 'media');
const PHOTOS_DIR = path.join(MEDIA_DIR, 'photos');
const VIDEOS_DIR = path.join(MEDIA_DIR, 'videos');
const CATALOG_PATH = path.join(__dirname, 'catalog.json');

const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff']);
const videoExts = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v']);

// ---- 工具函数 ----
function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function scanDir(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (imageExts.has(ext) || videoExts.has(ext)) {
        const stat = fs.statSync(fullPath);
        files.push({
          localPath: fullPath,
          filename: entry.name,
          ext,
          size: stat.size,
          isVideo: videoExts.has(ext),
        });
      }
    }
  }
  return files;
}

function getRepoInfo() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // 支持 https://github.com/user/repo.git 和 git@github.com:user/repo.git
    const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
    if (match) return { owner: match[1], repo: match[2] };
  } catch {}
  return null;
}

function getPagesUrl() {
  try {
    // 读取 GitHub Pages URL
    const repo = getRepoInfo();
    if (!repo) return null;

    // 检查是否配置了自定义域名
    const cnamePath = path.join(__dirname, 'CNAME');
    if (fs.existsSync(cnamePath)) {
      return 'https://' + fs.readFileSync(cnamePath, 'utf-8').trim();
    }

    // 默认 GitHub Pages URL: https://{owner}.github.io/{repo}
    // 如果仓库名是 {owner}.github.io 则直接就是根域名
    if (repo.repo === repo.owner + '.github.io') {
      return 'https://' + repo.owner + '.github.io';
    }
    return 'https://' + repo.owner + '.github.io/' + repo.repo;
  } catch {}
  return null;
}

// ---- 上传视频到 GitHub Releases ----
async function uploadVideoToRelease(file, repoInfo) {
  const tag = 'videos'; // 所有视频放在同一个 release 下

  // 检查 release 是否已存在
  let releaseExists = false;
  try {
    execSync('gh release view ' + tag + ' --repo ' + repoInfo.owner + '/' + repoInfo.repo,
      { stdio: 'pipe' });
    releaseExists = true;
  } catch {}

  if (!releaseExists) {
    console.log('  创建 Release: ' + tag);
    execSync('gh release create ' + tag +
      ' --repo ' + repoInfo.owner + '/' + repoInfo.repo +
      ' --title "视频作品" --notes "作品集视频文件"',
      { stdio: 'pipe' });
  }

  // 上传视频文件
  console.log('  上传: ' + file.filename + ' (' + formatSize(file.size) + ')');
  execSync(
    'gh release upload ' + tag + ' "' + file.localPath + '"' +
    ' --repo ' + repoInfo.owner + '/' + repoInfo.repo +
    ' --clobber',
    { stdio: 'inherit' }
  );

  // 构造下载 URL
  const downloadUrl = 'https://github.com/' + repoInfo.owner + '/' + repoInfo.repo +
    '/releases/download/' + tag + '/' + file.filename;

  return downloadUrl;
}

// ---- 生成 catalog.json ----
function buildCatalog(photoFiles, videoUrls) {
  let catalog = { title: '我的作品集', description: '', items: [] };

  // 保留现有 catalog 中的手动编辑信息
  let existingMap = new Map();
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
      catalog.title = existing.title || catalog.title;
      catalog.description = existing.description || catalog.description;
      for (const item of existing.items || []) {
        existingMap.set(item.file, item);
      }
    } catch {}
  }

  const items = [];

  // 照片：直接引用相对路径，由 GitHub Pages 提供
  for (const f of photoFiles) {
    const relPath = 'media/photos/' + f.filename;
    const existing = existingMap.get(relPath) || {};
    items.push({
      title: existing.title || path.basename(f.filename, path.extname(f.filename)),
      file: relPath,
      url: relPath, // 照片是相对路径，浏览器直接加载
      date: existing.date || new Date().toISOString().slice(0, 7),
      tags: existing.tags || [],
      size: f.size,
    });
  }

  // 视频：使用 GitHub Release 下载链接
  for (const v of videoUrls) {
    const filename = v.filename;
    const existing = existingMap.get(filename) || {};
    const thumbRel = 'media/videos/' + path.basename(filename, path.extname(filename)) + '-thumb.jpg';
    const hasThumb = fs.existsSync(path.join(VIDEOS_DIR, path.basename(filename, path.extname(filename)) + '-thumb.jpg'));

    items.push({
      title: existing.title || path.basename(filename, path.extname(filename)),
      file: filename,
      url: v.url,
      type: 'video',
      thumb: hasThumb ? thumbRel : (existing.thumb || ''),
      date: existing.date || new Date().toISOString().slice(0, 7),
      tags: existing.tags || [],
      size: v.size,
    });
  }

  catalog.items = items;
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log('\ncatalog.json 已更新 (' + items.length + ' 个作品)');
}

// ---- 主流程 ----
async function main() {
  // 检查 gh CLI
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch {
    console.error('未安装 GitHub CLI。');
    console.error('  安装: winget install GitHub.cli');
    console.error('  然后: gh auth login');
    process.exit(1);
  }

  // 检查登录
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch {
    console.error('请先登录 GitHub: gh auth login');
    process.exit(1);
  }

  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    console.error('未检测到 GitHub 仓库，请先在 portfolio 目录下运行:');
    console.error('  git init');
    console.error('  git remote add origin https://github.com/你的用户名/仓库名.git');
    process.exit(1);
  }

  console.log('仓库: ' + repoInfo.owner + '/' + repoInfo.repo);

  // 扫描文件
  const photos = scanDir(PHOTOS_DIR);
  const videos = scanDir(VIDEOS_DIR);

  console.log('\n照片: ' + photos.length + ' 张');
  console.log('视频: ' + videos.length + ' 个\n');

  if (photos.length === 0 && videos.length === 0) {
    console.log('请把文件放到:');
    console.log('  media/photos/  ← 照片（JPG/PNG/等）');
    console.log('  media/videos/  ← 视频（MP4/MOV/等）');
    console.log('  media/videos/xxx-thumb.jpg ← 视频封面图（可选）');
    return;
  }

  // 上传视频
  const videoUrls = [];
  for (const video of videos) {
    try {
      const url = await uploadVideoToRelease(video, repoInfo);
      videoUrls.push({ filename: video.filename, url, size: video.size });
    } catch (err) {
      console.error('  上传失败: ' + video.filename + ' - ' + err.message);
    }
  }

  // 生成目录
  buildCatalog(photos, videoUrls);

  // 后续步骤
  const pagesUrl = getPagesUrl();
  console.log('\n---- 下一步 ----');
  console.log('1. git add .');
  console.log('2. git commit -m "更新作品集"');
  console.log('3. git push');
  if (pagesUrl) {
    console.log('\n完成后访问: ' + pagesUrl);
  }
}

main().catch(console.error);
