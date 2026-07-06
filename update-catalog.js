/**
 * 更新 catalog.json —— 缩略图用于展示，原图用于下载
 * 用法: node update-catalog.js
 */

const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, 'media', 'photos');
const THUMBS_DIR = path.join(__dirname, 'media', 'thumbs');

const photos = fs.readdirSync(PHOTOS_DIR).filter(f => !f.startsWith('.') && !f.startsWith('.git'));

const items = photos.map(f => {
  const origSize = fs.statSync(path.join(PHOTOS_DIR, f)).size;
  const hasThumb = fs.existsSync(path.join(THUMBS_DIR, f));
  return {
    title: path.basename(f, path.extname(f)),
    file: 'media/photos/' + f,
    url: hasThumb ? 'media/thumbs/' + f : 'media/photos/' + f,       // 展示用缩略图
    originalUrl: 'media/photos/' + f,                                  // 下载/灯箱用原图
    date: '2026-07',
    tags: ['照片'],
    size: origSize,
  };
});

const catalog = { title: '我的作品集', description: '', items };

fs.writeFileSync('catalog.json', JSON.stringify(catalog, null, 2));
console.log('catalog.json 已更新，' + items.length + ' 张照片');
