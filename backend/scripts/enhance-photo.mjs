import sharp from 'sharp';

// 输入和输出路径
const inputPath = 'C:/Users/1167023/report/刘林林.png';
const outputPath = 'C:/Users/1167023/Desktop/Jabil/nginx/html/photos/W2268408.jpg';

async function enhancePhoto() {
  try {
    let image = sharp(inputPath);
    const metadata = await image.metadata();
    console.log(`原始图片尺寸: ${metadata.width}x${metadata.height}`);

    // 调整为 360x360，与其他照片一致
    await image
      .resize(360, 360, {
        fit: 'cover',
        position: 'center top'  // 从顶部开始裁剪，显示头部
      })
      .sharpen({
        sigma: 1.2,
        m1: 0.5,
        m2: 2.0,
        x1: 2,
        y2: 10,
        y3: 0
      })
      .modulate({
        brightness: 1.05,
        saturation: 1.05
      })
      .gamma(1.05)
      .jpeg({
        quality: 95,
        chromaSubsampling: '4:4:4'
      })
      .toFile(outputPath);

    const outputMeta = await sharp(outputPath).metadata();
    console.log(`处理后图片尺寸: ${outputMeta.width}x${outputMeta.height}`);
    console.log(`图片已保存到: ${outputPath}`);

  } catch (err) {
    console.error('图片处理失败:', err);
  }
}

enhancePhoto();
