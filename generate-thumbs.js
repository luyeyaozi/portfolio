/**
 * 生成缩略图 —— 将 media/photos/ 中的照片压缩为缩略图放到 media/thumbs/
 * 用法: node generate-thumbs.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, 'media', 'photos');
const THUMBS_DIR = path.join(__dirname, 'media', 'thumbs');
const THUMB_WIDTH = 600;

if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

const files = fs.readdirSync(PHOTOS_DIR).filter(f => {
  const ext = path.extname(f).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && !f.startsWith('.');
});

console.log(`找到 ${files.length} 张照片，开始生成缩略图...\n`);

(async () => {
  let done = 0;
  for (const file of files) {
    const src = path.join(PHOTOS_DIR, file);
    const dest = path.join(THUMBS_DIR, file);
    try {
      await sharp(src)
        .resize(THUMB_WIDTH)
        .jpeg({ quality: 80 })
        .toFile(dest);
      const origSize = fs.statSync(src).size;
      const thumbSize = fs.statSync(dest).size;
      const ratio = Math.round((1 - thumbSize / origSize) * 100);
      done++;
      console.log(`  ${done}/${files.length} ${file}: ${formatSize(origSize)} → ${formatSize(thumbSize)} (缩小 ${ratio}%)`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }
  console.log(`\n完成！缩略图保存在 media/thumbs/`);
})();

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
